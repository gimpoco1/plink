import ActivityKit
import AppIntents
import Foundation
import Security

@available(iOS 17.0, *)
struct LiveScoreActivityPlayer: Codable, Hashable, Identifiable {
    let id: String
    let name: String
    let score: Int
    let avatarColor: String
}

@available(iOS 17.0, *)
struct PlinkScoreActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        let theme: String
        let targetScore: Int
        let startingScore: Int
        let winCondition: String
        let manualEndOnly: Bool
        let winByTwo: Bool
        let winnerName: String?
        let firstPlayerId: String
        let firstPlayerName: String
        let firstPlayerScore: Int
        let firstPlayerColor: String
        let secondPlayerId: String
        let secondPlayerName: String
        let secondPlayerScore: Int
        let secondPlayerColor: String
        let thirdPlayer: LiveScoreActivityPlayer?

        var players: [LiveScoreActivityPlayer] {
            let pair = [
                LiveScoreActivityPlayer(id: firstPlayerId, name: firstPlayerName, score: firstPlayerScore, avatarColor: firstPlayerColor),
                LiveScoreActivityPlayer(id: secondPlayerId, name: secondPlayerName, score: secondPlayerScore, avatarColor: secondPlayerColor)
            ]
            return thirdPlayer.map { pair + [$0] } ?? pair
        }
    }

    let gameId: String
    let gameName: String
    let isShared: Bool
    let ownerKey: String
}

@available(iOS 17.0, *)
struct AdjustLiveScoreIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Update score"

    @Parameter(title: "Live Activity ID") var activityId: String
    @Parameter(title: "Player ID") var playerId: String
    @Parameter(title: "Score change") var delta: Int

    init() {}

    init(activityId: String, playerId: String, delta: Int) {
        self.activityId = activityId
        self.playerId = playerId
        self.delta = delta
    }

    func perform() async throws -> some IntentResult {
        guard delta == -1 || delta == 1 else {
            throw LiveScoreError.invalidScoreChange
        }
        guard let activity = Activity<PlinkScoreActivityAttributes>.activities.first(where: { $0.id == activityId }) else {
            throw LiveScoreError.activityNotFound
        }
        guard activity.content.state.winnerName == nil else {
            throw LiveScoreError.gameFinished
        }

        if !activity.attributes.isShared {
            let state = try await LiveScoreLocalJournal.shared.adjust(
                attributes: activity.attributes,
                playerId: playerId,
                delta: delta
            )
            await activity.update(ActivityContent(state: state, staleDate: nil))
            return .result()
        }

        let updatedGame = try await LiveScoreService.updateScore(
            gameId: activity.attributes.gameId,
            playerId: playerId,
            delta: delta
        )
        let nextState = try LiveScoreActivityState.make(
            previous: activity.content.state,
            game: updatedGame
        )
        await activity.update(ActivityContent(state: nextState, staleDate: nil))

        return .result()
    }
}

@available(iOS 17.0, *)
struct LiveScoreLocalAction: Codable {
    let id: String
    let gameId: String
    let ownerKey: String
    let playerId: String
    let delta: Int
    let createdAt: Int
}

@available(iOS 17.0, *)
actor LiveScoreLocalJournal {
    static let shared = LiveScoreLocalJournal()
    private let storageKey = "plink.live-score.local-journal.v1"

    private struct Journal: Codable {
        let actions: [LiveScoreLocalAction]
        let snapshots: [String: PlinkScoreActivityAttributes.ContentState]
    }

    private func load() throws -> Journal {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else {
            return Journal(actions: [], snapshots: [:])
        }
        return try JSONDecoder().decode(Journal.self, from: data)
    }

    private func save(_ journal: Journal) throws {
        UserDefaults.standard.set(try JSONEncoder().encode(journal), forKey: storageKey)
    }

    func pendingActions() throws -> [LiveScoreLocalAction] {
        try load().actions
    }

    func acknowledge(ids: [String]) throws {
        let journal = try load()
        let acknowledged = Set(ids)
        try save(Journal(actions: journal.actions.filter { !acknowledged.contains($0.id) }, snapshots: journal.snapshots))
    }

    func seed(gameId: String, ownerKey: String, state: PlinkScoreActivityAttributes.ContentState) throws {
        let journal = try load()
        guard !journal.actions.contains(where: { $0.gameId == gameId && $0.ownerKey == ownerKey }) else {
            throw LiveScoreError.pendingLocalScores
        }
        var snapshots = journal.snapshots
        snapshots[ownerKey + ":" + gameId] = state
        try save(Journal(actions: journal.actions, snapshots: snapshots))
    }

    func adjust(attributes: PlinkScoreActivityAttributes, playerId: String, delta: Int) throws -> PlinkScoreActivityAttributes.ContentState {
        let journal = try load()
        let key = attributes.ownerKey + ":" + attributes.gameId
        guard let previous = journal.snapshots[key], previous.winnerName == nil else {
            throw LiveScoreError.gameFinished
        }
        guard let player = previous.players.first(where: { $0.id == playerId }) else {
            throw LiveScoreError.invalidResponse
        }
        let scoreBefore = player.score
        let clamped = max(-999999, min(999999, scoreBefore + delta))
        let scoreAfter = previous.winCondition == "reach_zero" ? max(previous.targetScore, clamped) : clamped
        if scoreAfter == scoreBefore { return previous }
        let players = previous.players.map { player in
            LiveScoreRpcPlayer(id: player.id, name: player.name, score: player.id == playerId ? scoreAfter : player.score)
        }
        let scores = players.map(\.score).sorted()
        let orderedScores = previous.winCondition == "lowest" ? scores : Array(scores.reversed())
        let hasEnded: Bool
        if previous.manualEndOnly {
            hasEnded = false
        } else if previous.winCondition == "reach_zero" {
            hasEnded = scores[0] <= previous.targetScore
        } else {
            hasEnded = scores[scores.count - 1] >= previous.targetScore && (!previous.winByTwo || abs(orderedScores[0] - orderedScores[1]) >= 2)
        }
        let now = Int(Date().timeIntervalSince1970 * 1000)
        let game = LiveScoreRpcResponse(
            players: players,
            endedAt: hasEnded ? now : nil,
            winCondition: previous.winCondition
        )
        let next = try LiveScoreActivityState.make(previous: previous, game: game)
        let action = LiveScoreLocalAction(id: UUID().uuidString, gameId: attributes.gameId, ownerKey: attributes.ownerKey, playerId: playerId, delta: delta, createdAt: now)
        var snapshots = journal.snapshots
        snapshots[key] = next
        try save(Journal(actions: journal.actions + [action], snapshots: snapshots))
        return next
    }
}

@available(iOS 17.0, *)
enum LiveScoreError: LocalizedError {
    case activityNotFound
    case invalidScoreChange
    case invalidResponse
    case missingCredentials
    case gameFinished
    case pendingLocalScores
    case network(statusCode: Int, response: String)

    var errorDescription: String? {
        switch self {
        case .activityNotFound:
            return "The active Plink score activity could not be found."
        case .invalidScoreChange:
            return "Live Score accepts only one-point changes."
        case .invalidResponse:
            return "Plink received an invalid score response from the server."
        case .missingCredentials:
            return "Sign in to Plink again before updating this score."
        case .gameFinished:
            return "This game has finished. Open Plink to review the result."
        case .pendingLocalScores:
            return "Restore pending Lock Screen score changes before updating this activity."
        case let .network(statusCode, response):
            return "Plink could not update the score (HTTP \(statusCode)): \(response)"
        }
    }
}

@available(iOS 17.0, *)
struct LiveScoreCredentials: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: Int
    let supabaseUrl: String
    let supabasePublishableKey: String
}

@available(iOS 17.0, *)
struct LiveScoreRpcResponse: Decodable {
    let players: [LiveScoreRpcPlayer]
    let endedAt: Int?
    let winCondition: String

    enum CodingKeys: String, CodingKey {
        case players
        case endedAt = "ended_at"
        case winCondition = "win_condition"
    }
}

@available(iOS 17.0, *)
struct LiveScoreRpcPlayer: Decodable {
    let id: String
    let name: String
    let score: Int
}

@available(iOS 17.0, *)
private enum LiveScoreActivityState {
    static func make(
        previous: PlinkScoreActivityAttributes.ContentState,
        game: LiveScoreRpcResponse
    ) throws -> PlinkScoreActivityAttributes.ContentState {
        let scores = Dictionary(uniqueKeysWithValues: game.players.map { ($0.id, $0.score) })
        guard
            let firstPlayerScore = scores[previous.firstPlayerId],
            let secondPlayerScore = scores[previous.secondPlayerId]
        else {
            throw LiveScoreError.invalidResponse
        }
        return PlinkScoreActivityAttributes.ContentState(
            theme: previous.theme,
            targetScore: previous.targetScore,
            startingScore: previous.startingScore,
            winCondition: previous.winCondition,
            manualEndOnly: previous.manualEndOnly,
            winByTwo: previous.winByTwo,
            winnerName: game.endedAt == nil ? nil : game.players.sorted {
                game.winCondition == "reach_target" ? $0.score > $1.score : $0.score < $1.score
            }.first?.name,
            firstPlayerId: previous.firstPlayerId,
            firstPlayerName: previous.firstPlayerName,
            firstPlayerScore: firstPlayerScore,
            firstPlayerColor: previous.firstPlayerColor,
            secondPlayerId: previous.secondPlayerId,
            secondPlayerName: previous.secondPlayerName,
            secondPlayerScore: secondPlayerScore,
            secondPlayerColor: previous.secondPlayerColor,
            thirdPlayer: try previous.thirdPlayer.map { player in
                guard let score = scores[player.id] else { throw LiveScoreError.invalidResponse }
                return LiveScoreActivityPlayer(id: player.id, name: player.name, score: score, avatarColor: player.avatarColor)
            }
        )
    }
}

@available(iOS 17.0, *)
enum LiveScoreService {
    private static let credentialsService = "com.plinkscore.app.live-score"
    private static let credentialsAccount = "supabase-session"

    static func save(credentials: LiveScoreCredentials) throws {
        let encoded = try JSONEncoder().encode(credentials)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: credentialsService,
            kSecAttrAccount as String: credentialsAccount,
            kSecValueData as String: encoded
        ]
        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw NSError(domain: NSOSStatusErrorDomain, code: Int(status), userInfo: [NSLocalizedDescriptionKey: "Plink could not securely save the Live Score session."])
        }
    }

    static func updateScore(gameId: String, playerId: String, delta: Int) async throws -> LiveScoreRpcResponse {
        let credentials = try loadStoredCredentials()
        let response = try await performScoreRequest(
            credentials: credentials,
            gameId: gameId,
            playerId: playerId,
            delta: delta
        )
        if response.statusCode != 401 {
            return try decodeResponse(response.data, statusCode: response.statusCode)
        }

        let refreshedCredentials = try await refresh(credentials: credentials)
        try save(credentials: refreshedCredentials)
        let refreshedResponse = try await performScoreRequest(
            credentials: refreshedCredentials,
            gameId: gameId,
            playerId: playerId,
            delta: delta
        )
        return try decodeResponse(refreshedResponse.data, statusCode: refreshedResponse.statusCode)
    }

    static func loadStoredCredentials() throws -> LiveScoreCredentials {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: credentialsService,
            kSecAttrAccount as String: credentialsAccount,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else {
            throw LiveScoreError.missingCredentials
        }
        return try JSONDecoder().decode(LiveScoreCredentials.self, from: data)
    }

    private static func performScoreRequest(
        credentials: LiveScoreCredentials,
        gameId: String,
        playerId: String,
        delta: Int
    ) async throws -> (data: Data, statusCode: Int) {
        let endpoint = try endpoint(credentials.supabaseUrl, path: "/rest/v1/rpc/apply_shared_game_score_delta")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue(credentials.supabasePublishableKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(credentials.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "p_game_id": gameId,
            "p_player_id": playerId,
            "p_delta": delta
        ])
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw LiveScoreError.invalidResponse
        }
        return (data, httpResponse.statusCode)
    }

    private static func refresh(credentials: LiveScoreCredentials) async throws -> LiveScoreCredentials {
        let endpoint = try endpoint(credentials.supabaseUrl, path: "/auth/v1/token?grant_type=refresh_token")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue(credentials.supabasePublishableKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["refresh_token": credentials.refreshToken])
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw LiveScoreError.invalidResponse
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            throw LiveScoreError.network(statusCode: httpResponse.statusCode, response: responseText(data))
        }
        struct RefreshResponse: Decodable {
            let accessToken: String
            let refreshToken: String
            let expiresIn: Int

            enum CodingKeys: String, CodingKey {
                case accessToken = "access_token"
                case refreshToken = "refresh_token"
                case expiresIn = "expires_in"
            }
        }
        let refreshed = try JSONDecoder().decode(RefreshResponse.self, from: data)
        return LiveScoreCredentials(
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            expiresAt: Int(Date().timeIntervalSince1970) + refreshed.expiresIn,
            supabaseUrl: credentials.supabaseUrl,
            supabasePublishableKey: credentials.supabasePublishableKey
        )
    }

    private static func decodeResponse(_ data: Data, statusCode: Int) throws -> LiveScoreRpcResponse {
        guard (200...299).contains(statusCode) else {
            throw LiveScoreError.network(statusCode: statusCode, response: responseText(data))
        }
        return try JSONDecoder().decode(LiveScoreRpcResponse.self, from: data)
    }

    private static func endpoint(_ baseUrl: String, path: String) throws -> URL {
        guard let base = URL(string: baseUrl), let url = URL(string: path, relativeTo: base) else {
            throw LiveScoreError.invalidResponse
        }
        return url
    }

    private static func responseText(_ data: Data) -> String {
        String(data: data, encoding: .utf8) ?? "No response body."
    }
}
