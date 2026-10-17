import ActivityKit
import SwiftUI
import WidgetKit

@available(iOS 17.0, *)
struct LiveScoreWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PlinkScoreActivityAttributes.self) { context in
            LiveScoreActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 4) {
                        Text(context.attributes.gameName).font(.headline).lineLimit(1)
                        if let winnerName = context.state.winnerName {
                            Label("\(winnerName) wins", systemImage: "trophy.fill")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(PlinkLivePalette.positive(isDark: true))
                                .lineLimit(1)
                        }
                        Text(context.state.players.map { "\($0.name) \($0.score)" }.joined(separator: " · "))
                            .font(.subheadline)
                            .lineLimit(1)
                    }
                }
            } compactLeading: {
                Text(context.state.firstPlayerScore.description).monospacedDigit()
            } compactTrailing: {
                Text(context.state.players.dropFirst().map { $0.score.description }.joined(separator: "·")).monospacedDigit()
            } minimal: {
                Text(context.state.firstPlayerScore.description)
            }
        }
    }
}

@available(iOS 17.0, *)
private struct LiveScoreActivityView: View {
    let context: ActivityViewContext<PlinkScoreActivityAttributes>
    private var state: PlinkScoreActivityAttributes.ContentState { context.state }
    private var isDark: Bool { state.theme == "dark" }

    private var targetLabel: String {
        state.manualEndOnly ? "Reference \(state.targetScore)" : "Target \(state.targetScore)"
    }

    private var footerRules: [String] {
        var rules: [String] = []
        if state.manualEndOnly { rules.append("Manual finish") }
        if state.winCondition == "lowest" { rules.append("Lowest wins") }
        if state.winByTwo && !state.manualEndOnly && state.winCondition != "reach_zero" {
            rules.append("Win by 2")
        }
        return rules
    }

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 6) {
                Image(isDark ? "PlinkLogoDark" : "PlinkLogoLight")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 16, height: 16)
                    .accessibilityHidden(true)
                Text(context.attributes.gameName)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                Spacer(minLength: 4)
                Label(targetLabel, systemImage: "target")
                    .foregroundStyle(PlinkLivePalette.mutedText(isDark: isDark))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .font(.system(size: 11, weight: .bold))
            .frame(height: 16)

            HStack(spacing: state.players.count == 3 ? 8 : 14) {
                ForEach(state.players) { player in
                    if player.id != state.firstPlayerId {
                        Rectangle()
                            .fill(PlinkLivePalette.primaryText(isDark: isDark).opacity(0.1))
                            .frame(width: 1, height: 82)
                    }
                    LiveScorePlayerPanel(
                        activityId: context.activityID,
                        playerId: player.id,
                        name: player.name,
                        score: player.score,
                        playerColor: player.avatarColor,
                        state: state
                    )
                }
            }

            if state.isFinished || !footerRules.isEmpty {
              HStack(spacing: 5) {
                if let winnerName = state.winnerName {
                    Image(systemName: "trophy.fill")
                    Text("\(winnerName) wins")
                } else if state.isFinished {
                    Text("Game finished")
                } else {
                    Text(footerRules.joined(separator: " · "))
                }
            }
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(PlinkLivePalette.positive(isDark: isDark))
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .frame(height: 14)
            }
        }
        .foregroundStyle(PlinkLivePalette.primaryText(isDark: isDark))
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(PlinkLivePalette.background(isDark: isDark))
        .environment(\.colorScheme, isDark ? .dark : .light)
        .activityBackgroundTint(PlinkLivePalette.background(isDark: isDark))
        .activitySystemActionForegroundColor(PlinkLivePalette.primaryText(isDark: isDark))
    }
}

@available(iOS 17.0, *)
private struct LiveScorePlayerPanel: View {
    let activityId: String
    let playerId: String
    let name: String
    let score: Int
    let playerColor: String
    let state: PlinkScoreActivityAttributes.ContentState

    private var isDark: Bool { state.theme == "dark" }

    private var progress: Double {
        if state.winCondition == "reach_zero" {
            let distance = state.startingScore - state.targetScore
            return distance > 0 ? min(1, max(0, Double(state.startingScore - score) / Double(distance))) : 0
        }
        return state.targetScore > 0 ? min(1, max(0, Double(score) / Double(state.targetScore))) : 0
    }

    var body: some View {
        VStack(spacing: 4) {
            HStack(spacing: 5) {
                Circle()
                    .fill(Color(validHex: playerColor))
                    .frame(width: 7, height: 7)
                Text(name)
                    .font(.system(size: 12, weight: .semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                if state.winnerName == name {
                    Image(systemName: "trophy.fill")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(PlinkLivePalette.positive(isDark: isDark))
                }
            }
            .frame(height: 15)

            HStack(spacing: 3) {
                if !state.isFinished {
                    LiveScoreButton(activityId: activityId, playerId: playerId, delta: -1, isDark: isDark, isCompact: state.players.count == 3)
                }
                Text(score.description)
                    .font(.system(size: state.players.count == 3 ? 30 : 36, weight: .heavy, design: .rounded).monospacedDigit())
                    .lineLimit(1)
                    .minimumScaleFactor(0.4)
                    .frame(maxWidth: .infinity)
                    .contentTransition(.numericText())
                if !state.isFinished {
                    LiveScoreButton(activityId: activityId, playerId: playerId, delta: 1, isDark: isDark, isCompact: state.players.count == 3)
                }
            }
            .frame(height: 44)

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule().fill(PlinkLivePalette.primaryText(isDark: isDark).opacity(0.08))
                    Capsule()
                        .fill(Color(validHex: playerColor))
                        .frame(width: geometry.size.width * progress)
                }
            }
            .frame(height: 5)
            .opacity(state.manualEndOnly || state.winCondition == "lowest" ? 0 : 1)
            .accessibilityLabel("Progress for \(name)")
            .accessibilityValue("\(Int(progress * 100)) percent")
        }
        .frame(maxWidth: .infinity)
    }
}

@available(iOS 17.0, *)
private struct LiveScoreButton: View {
    let activityId: String
    let playerId: String
    let delta: Int
    let isDark: Bool
    let isCompact: Bool

    private var tint: Color {
        delta > 0 ? PlinkLivePalette.positive(isDark: isDark) : PlinkLivePalette.negative(isDark: isDark)
    }

    var body: some View {
        Button(intent: AdjustLiveScoreIntent(activityId: activityId, playerId: playerId, delta: delta)) {
            Image(systemName: delta > 0 ? "plus" : "minus")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(tint)
                .frame(width: isCompact ? 22 : 28, height: 36)
                .background(tint.opacity(0.1), in: RoundedRectangle(cornerRadius: 9))
                .overlay(RoundedRectangle(cornerRadius: 9).stroke(tint.opacity(0.2)))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(delta > 0 ? "Add one point" : "Subtract one point")
    }
}

private enum PlinkLivePalette {
    static func positive(isDark: Bool) -> Color {
        isDark ? Color(red: 180 / 255, green: 210 / 255, blue: 86 / 255) : Color(red: 79 / 255, green: 118 / 255, blue: 0)
    }

    static func negative(isDark: Bool) -> Color {
        isDark ? Color(red: 1, green: 140 / 255, blue: 130 / 255) : Color(red: 186 / 255, green: 26 / 255, blue: 26 / 255)
    }

    static func background(isDark: Bool) -> Color {
        isDark ? Color(red: 11 / 255, green: 21 / 255, blue: 25 / 255) : Color(red: 248 / 255, green: 251 / 255, blue: 252 / 255)
    }

    static func rowBackground(isDark: Bool) -> Color {
        isDark ? Color(red: 23 / 255, green: 33 / 255, blue: 38 / 255) : Color(red: 234 / 255, green: 240 / 255, blue: 242 / 255)
    }

    static func controlBackground(isDark: Bool) -> Color {
        isDark ? Color(red: 44 / 255, green: 54 / 255, blue: 59 / 255) : Color(red: 215 / 255, green: 225 / 255, blue: 228 / 255)
    }

    static func primaryText(isDark: Bool) -> Color {
        isDark ? Color(red: 217 / 255, green: 228 / 255, blue: 235 / 255) : Color(red: 20 / 255, green: 36 / 255, blue: 40 / 255)
    }

    static func mutedText(isDark: Bool) -> Color {
        isDark ? Color(red: 155 / 255, green: 166 / 255, blue: 172 / 255) : Color(red: 75 / 255, green: 93 / 255, blue: 98 / 255)
    }

    static func liveInk(isDark: Bool) -> Color {
        isDark ? Color(red: 40 / 255, green: 53 / 255, blue: 0 / 255) : .white
    }
}

private extension Color {
    init(validHex: String) {
        guard validHex.count == 7, validHex.first == "#", let rgb = UInt64(validHex.dropFirst(), radix: 16) else {
            preconditionFailure("Live Score requires a validated six-digit player color.")
        }
        self.init(
            red: Double((rgb >> 16) & 0xFF) / 255,
            green: Double((rgb >> 8) & 0xFF) / 255,
            blue: Double(rgb & 0xFF) / 255
        )
    }
}

@available(iOS 17.0, *)
@main
struct LiveScoreWidgetBundle: WidgetBundle {
    var body: some Widget {
        LiveScoreWidget()
    }
}
