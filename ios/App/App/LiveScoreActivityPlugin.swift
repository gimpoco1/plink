import ActivityKit
import Capacitor
import Foundation
import UIKit

@objc(LiveScorePlugin)
class LiveScorePlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LiveScorePlugin"
    let jsName = "LiveScore"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLocalActions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledgeLocalActions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startOrUpdate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise)
    ]

    @objc func getLocalActions(_ call: CAPPluginCall) {
        guard #available(iOS 17.0, *) else {
            call.resolve(["actions": []])
            return
        }
        Task {
            do {
                let actions = try await LiveScoreLocalJournal.shared.pendingActions()
                call.resolve(["actions": actions.map { action in [
                    "id": action.id,
                    "gameId": action.gameId,
                    "ownerKey": action.ownerKey,
                    "playerId": action.playerId,
                    "delta": action.delta,
                    "createdAt": action.createdAt
                ] }])
            } catch {
                call.reject("Pending Lock Screen scores could not be read.", nil, error)
            }
        }
    }

    @objc func acknowledgeLocalActions(_ call: CAPPluginCall) {
        guard #available(iOS 17.0, *), let ids = call.getArray("ids", String.self) else {
            call.reject("Score action IDs are required for acknowledgement.")
            return
        }
        Task {
            do {
                try await LiveScoreLocalJournal.shared.acknowledge(ids: ids)
                call.resolve()
            } catch {
                call.reject("Restored Lock Screen scores could not be acknowledged.", nil, error)
            }
        }
    }

    @objc func configure(_ call: CAPPluginCall) {
        guard #available(iOS 17.0, *) else {
            call.reject("Interactive Live Score requires iOS 17 or later.")
            return
        }
        guard
            let accessToken = call.getString("accessToken"),
            let refreshToken = call.getString("refreshToken"),
            let expiresAt = call.getInt("expiresAt"),
            let supabaseUrl = call.getString("supabaseUrl"),
            let supabasePublishableKey = call.getString("supabasePublishableKey")
        else {
            call.reject("A complete signed-in Live Score session is required.")
            return
        }

        do {
            try LiveScoreService.save(credentials: LiveScoreCredentials(
                accessToken: accessToken,
                refreshToken: refreshToken,
                expiresAt: expiresAt,
                supabaseUrl: supabaseUrl,
                supabasePublishableKey: supabasePublishableKey
            ))
            call.resolve()
        } catch {
            call.reject("The Live Score session could not be secured.", nil, error)
        }
    }

    @objc func getSession(_ call: CAPPluginCall) {
        guard #available(iOS 17.0, *) else {
            call.resolve(["session": NSNull()])
            return
        }
        do {
            let credentials = try LiveScoreService.loadStoredCredentials()
            call.resolve([
                "session": [
                    "accessToken": credentials.accessToken,
                    "refreshToken": credentials.refreshToken,
                    "expiresAt": credentials.expiresAt
                ]
            ])
        } catch LiveScoreError.missingCredentials {
            call.resolve(["session": NSNull()])
        } catch {
            call.reject("The saved Live Score session could not be read.", nil, error)
        }
    }

    @objc func startOrUpdate(_ call: CAPPluginCall) {
        guard #available(iOS 17.0, *) else {
            call.reject("Interactive Live Score requires iOS 17 or later.")
            return
        }
        guard
            let gameId = call.getString("gameId"),
            let gameName = call.getString("gameName"),
            let isShared = call.getBool("isShared"),
            let ownerKey = call.getString("ownerKey"),
            let theme = call.getString("theme"),
            let targetScore = call.getInt("targetScore"),
            let startingScore = call.getInt("startingScore"),
            let winCondition = call.getString("winCondition"),
            ["reach_target", "reach_zero", "lowest"].contains(winCondition),
            let manualEndOnly = call.getBool("manualEndOnly"),
            let winByTwo = call.getBool("winByTwo"),
            ["light", "dark"].contains(theme),
            let rawPlayers = call.getArray("players", NSDictionary.self),
            (2...3).contains(rawPlayers.count),
            let first = player(from: rawPlayers[0]),
            let second = player(from: rawPlayers[1])
        else {
            call.reject("Live Score requires two or three valid players.")
            return
        }

        let third: LiveScoreActivityPlayer?
        if rawPlayers.count == 3 {
            guard let player = player(from: rawPlayers[2]) else {
                call.reject("The third Live Score player is invalid.")
                return
            }
            third = LiveScoreActivityPlayer(id: player.id, name: player.name, score: player.score, avatarColor: player.avatarColor)
        } else {
            third = nil
        }
        let state = PlinkScoreActivityAttributes.ContentState(
            theme: theme,
            targetScore: targetScore,
            startingScore: startingScore,
            winCondition: winCondition,
            manualEndOnly: manualEndOnly,
            winByTwo: winByTwo,
            winnerName: nil,
            firstPlayerId: first.id,
            firstPlayerName: first.name,
            firstPlayerScore: first.score,
            firstPlayerColor: first.avatarColor,
            secondPlayerId: second.id,
            secondPlayerName: second.name,
            secondPlayerScore: second.score,
            secondPlayerColor: second.avatarColor,
            thirdPlayer: third
        )
        Task { @MainActor in
            let activities = Activity<PlinkScoreActivityAttributes>.activities
            if UIApplication.shared.applicationState != .active {
                call.resolve()
                return
            }
            if !isShared {
                do {
                    try await LiveScoreLocalJournal.shared.seed(gameId: gameId, ownerKey: ownerKey, state: state)
                } catch {
                    call.reject("Local Lock Screen scores could not be prepared.", nil, error)
                    return
                }
            }
            for activity in activities where activity.attributes.gameId != gameId || activity.attributes.isShared != isShared || activity.attributes.ownerKey != ownerKey {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            let existing = Activity<PlinkScoreActivityAttributes>.activities.first { $0.attributes.gameId == gameId }
            if let existing {
                await existing.update(ActivityContent(state: state, staleDate: nil))
                call.resolve()
                return
            }
            do {
                _ = try Activity.request(
                    attributes: PlinkScoreActivityAttributes(gameId: gameId, gameName: gameName, isShared: isShared, ownerKey: ownerKey),
                    content: ActivityContent(state: state, staleDate: nil),
                    pushType: nil
                )
                call.resolve()
            } catch {
                call.reject("The Live Score activity could not be started.", nil, error)
            }
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 17.0, *) else {
            call.resolve()
            return
        }
        guard let gameId = call.getString("gameId") else {
            call.reject("A game ID is required to end Live Score.")
            return
        }
        Task { @MainActor in
            for activity in Activity<PlinkScoreActivityAttributes>.activities where activity.attributes.gameId == gameId {
                if activity.content.state.winnerName != nil && UIApplication.shared.applicationState != .active {
                    continue
                }
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }

    @available(iOS 17.0, *)
    private func player(from value: NSDictionary) -> (id: String, name: String, score: Int, avatarColor: String)? {
        guard
            let id = value["id"] as? String,
            let name = value["name"] as? String,
            let score = value["score"] as? Int,
            let avatarColor = value["avatarColor"] as? String
        else {
            return nil
        }
        guard isValidHexColor(avatarColor) else {
            return nil
        }
        return (id, name, score, avatarColor)
    }

    @available(iOS 17.0, *)
    private func isValidHexColor(_ value: String) -> Bool {
        guard value.count == 7, value.first == "#" else {
            return false
        }
        return UInt64(value.dropFirst(), radix: 16) != nil
    }
}
