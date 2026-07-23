import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  AVATAR_COLORS,
  REFRESH_PAST_INVITED_PLAYERS_EVENT,
} from "../../constants";
import type {
  PlayerProfile,
  QuickScoreValues,
  ScoreDirection,
  WinCondition,
} from "../../types";
import { GAME_PRESETS, type GamePreset } from "./gamePresets";
import { useScrollableListFade } from "../../hooks/useScrollableListFade";

import type { NewGameCardProps, NewGameInput } from "./NewGameCard";
import {
  areLocalPlayersEqual,
  loadLocalPlayers,
  saveLocalPlayers,
  LOCAL_PLAYERS_CHANGED_EVENT,
  type LocalPlayer,
} from "../../storage/localPlayers";

type StagedPlayer = LocalPlayer;

function normalizePlayerName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function useNewGameCardModel(props: NewGameCardProps) {
  const {
    profiles,
    pastInvitedPlayers,
    teams,
    teamMembers,
    canUseTeams,
    isAuthenticated,
    draft,
    draftToken,
    onOpenProFeatureAuth,
    onOpenProPlan,
    onOpenTeamsTab,
    onCreate,
    onUpsertProfile,
  } = props;

  const [hasMounted, setHasMounted] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("8");
  const [participantMode, setParticipantMode] = useState<"players" | "teams">(
    "players",
  );
  const [scoreDirection, setScoreDirection] = useState<ScoreDirection>("up");
  const [winCondition, setWinCondition] =
    useState<WinCondition>("reach_target");
  const [winByTwo, setWinByTwo] = useState(false);
  const [manualEndOnly, setManualEndOnly] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [diceEnabled, setDiceEnabled] = useState(false);
  const [quickScoreValues, setQuickScoreValues] =
    useState<QuickScoreValues>([1, 2]);
  const [timerMode, setTimerMode] = useState<"countdown" | "stopwatch">(
    "countdown",
  );
  const [timerMinutes, setTimerMinutes] = useState("5");
  const [timerSeconds, setTimerSeconds] = useState("0");
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedPastInvitedUserIds, setSelectedPastInvitedUserIds] =
    useState<Set<string>>(new Set());
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(
    new Set(),
  );
  const [stagedPlayers, setStagedPlayers] =
    useState<StagedPlayer[]>(loadLocalPlayers);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [isPresetBrowserOpen, setIsPresetBrowserOpen] = useState(false);
  const [presetSearch, setPresetSearch] = useState("");
  const [selectedPresetInfoId, setSelectedPresetInfoId] = useState<
    string | null
  >(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [saveAsProfile, setSaveAsProfile] = useState(true);
  const [newPlayerColor, setNewPlayerColor] = useState<
    (typeof AVATAR_COLORS)[number]["value"]
  >(AVATAR_COLORS[0].value);
  const presetBrowserRef = useRef<HTMLDivElement | null>(null);
  const bodyInnerRef = useRef<HTMLDivElement | null>(null);
  const appliedDraftKeyRef = useRef<string | null>(null);
  const hasLoadedLocalPlayersRef = useRef(false);

  useEffect(() => {
    if (!props.open) return;
    window.dispatchEvent(new Event(REFRESH_PAST_INVITED_PLAYERS_EVENT));
  }, [props.open]);
  const reduceMotion = useReducedMotion();
  const [bodyContentHeight, setBodyContentHeight] = useState(0);
  const [selectedStagedPlayerIds, setSelectedStagedPlayerIds] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useLayoutEffect(() => {
    const node = bodyInnerRef.current;
    if (!node) return;

    const measure = () => {
      setBodyContentHeight(node.scrollHeight);
    };

    measure();
    window.addEventListener("resize", measure);

    if (typeof ResizeObserver === "undefined") {
      return () => {
        window.removeEventListener("resize", measure);
      };
    }

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(node);

    return () => {
      window.removeEventListener("resize", measure);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedLocalPlayersRef.current) {
      hasLoadedLocalPlayersRef.current = true;
      return;
    }

    saveLocalPlayers(stagedPlayers);
  }, [stagedPlayers]);

  useEffect(() => {
    function refreshLocalPlayers() {
      const nextPlayers = loadLocalPlayers();
      const nextPlayerIds = new Set(nextPlayers.map((player) => player.id));

      setStagedPlayers((current) =>
        areLocalPlayersEqual(current, nextPlayers) ? current : nextPlayers,
      );

      setSelectedStagedPlayerIds((current) => {
        const next = new Set<string>();

        current.forEach((playerId) => {
          if (nextPlayerIds.has(playerId)) {
            next.add(playerId);
          }
        });

        return next;
      });
    }

    window.addEventListener(LOCAL_PLAYERS_CHANGED_EVENT, refreshLocalPlayers);
    window.addEventListener("storage", refreshLocalPlayers);
    window.addEventListener("focus", refreshLocalPlayers);

    return () => {
      window.removeEventListener(
        LOCAL_PLAYERS_CHANGED_EVENT,
        refreshLocalPlayers,
      );
      window.removeEventListener("storage", refreshLocalPlayers);
      window.removeEventListener("focus", refreshLocalPlayers);
    };
  }, []);

  function resetForm() {
    setName("");
    setTarget("8");
    setParticipantMode("players");
    setScoreDirection("up");
    setWinCondition("reach_target");
    setWinByTwo(false);
    setManualEndOnly(false);
    setTimerEnabled(false);
    setDiceEnabled(false);
    setQuickScoreValues([1, 2]);
    setTimerMode("countdown");
    setTimerMinutes("5");
    setTimerSeconds("0");
    setSelectedProfileIds(new Set());
    setSelectedPastInvitedUserIds(new Set());
    setSelectedTeamIds(new Set());
    setIsAddingPlayer(false);
    setParticipantSearch("");
    setIsPresetBrowserOpen(false);
    setPresetSearch("");
    setSelectedPresetInfoId(null);
    setNewPlayerName("");
    setSaveAsProfile(true);
    setNewPlayerColor(AVATAR_COLORS[0].value);
    setSelectedStagedPlayerIds(new Set());
  }

  const parsedTarget = Number.parseInt(target, 10);
  const parsedTimerMinutes = Number.parseInt(timerMinutes, 10);
  const parsedTimerSeconds = Number.parseInt(timerSeconds, 10);
  const timerTotalSeconds =
    (Number.isFinite(parsedTimerMinutes)
      ? Math.max(0, parsedTimerMinutes)
      : 0) *
      60 +
    (Number.isFinite(parsedTimerSeconds)
      ? Math.max(0, Math.min(59, parsedTimerSeconds))
      : 0);

  const selectedPlayers = useMemo(() => {
    const saved = profiles
      .filter((profile) => selectedProfileIds.has(profile.id))
      .map((profile) => ({
        id: profile.id,
        name: profile.name,
        avatarColor: profile.avatarColor,
        stagedIndex: null,
      }));

    const staged = stagedPlayers
      .filter((player) => selectedStagedPlayerIds.has(player.id))
      .map((player, stagedIndex) => ({
        id: player.id,
        name: player.name,
        avatarColor: player.avatarColor,
        stagedIndex,
      }));

    const invited = pastInvitedPlayers
      .filter(
        (player) =>
          player.canInvite &&
          selectedPastInvitedUserIds.has(player.userId),
      )
      .map((player) => ({
        id: player.userId,
        name: player.name,
        avatarColor: player.avatarColor,
        stagedIndex: null,
      }));

    return [...saved, ...staged, ...invited];
  }, [
    pastInvitedPlayers,
    profiles,
    selectedPastInvitedUserIds,
    selectedProfileIds,
    stagedPlayers,
    selectedStagedPlayerIds,
  ]);

  const selectedStagedPlayers = useMemo(
    () =>
      stagedPlayers.filter((player) => selectedStagedPlayerIds.has(player.id)),
    [stagedPlayers, selectedStagedPlayerIds],
  );
  const filteredStagedPlayers = useMemo(() => {
    const query = participantSearch.trim().toLocaleLowerCase();
    if (!query) return stagedPlayers;
    return stagedPlayers.filter((player) =>
      player.name.toLocaleLowerCase().includes(query),
    );
  }, [participantSearch, stagedPlayers]);
  const selectedStagedPlayersForGame = useMemo(
    () =>
      selectedStagedPlayers.map((player) => ({
        name: player.name,
        avatarColor: player.avatarColor,
        profileId: player.id,
      })),
    [selectedStagedPlayers],
  );
  const selectedInvitedPlayersForGame = useMemo(
    () =>
      pastInvitedPlayers
        .filter(
          (player) =>
            player.canInvite &&
            selectedPastInvitedUserIds.has(player.userId),
        )
        .map((player) => ({
          name: player.name,
          avatarColor: player.avatarColor,
          profileId: player.profileId,
          invitedUserId: player.userId,
        })),
    [pastInvitedPlayers, selectedPastInvitedUserIds],
  );

  function toggleStagedPlayer(playerId: string) {
    setSelectedStagedPlayerIds((current) => {
      const next = new Set(current);

      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }

      return next;
    });
  }

  function deleteStagedPlayer(playerId: string) {
    setStagedPlayers((current) =>
      current.filter((player) => player.id !== playerId),
    );
    setSelectedStagedPlayerIds((current) => {
      if (!current.has(playerId)) return current;
      const next = new Set(current);
      next.delete(playerId);
      return next;
    });
  }

  const draftTeamPriorityIds = useMemo(
    () =>
      draft?.participantMode === "teams"
        ? (draft.initialTeams ?? []).map((team) => team.id)
        : [],
    [draft],
  );
  const membersByTeamId = useMemo(() => {
    const map = new Map<string, PlayerProfile[]>();
    const profilesById = new Map(
      profiles.map((profile) => [profile.id, profile]),
    );
    teamMembers.forEach((member) => {
      const profile = profilesById.get(member.profileId);
      if (!profile) return;
      const next = map.get(member.teamId) ?? [];
      next.push(profile);
      map.set(member.teamId, next);
    });
    return map;
  }, [profiles, teamMembers]);
  const availableTeams = useMemo(() => {
    const priority = new Map(
      draftTeamPriorityIds.map((teamId, index) => [teamId, index]),
    );

    return teams
      .map((team, index) => ({
        ...team,
        listIndex: index,
        members: (membersByTeamId.get(team.id) ?? []).sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      }))
      .filter((team) => team.members.length > 0)
      .sort((left, right) => {
        const leftPriority = priority.get(left.id) ?? Number.POSITIVE_INFINITY;
        const rightPriority =
          priority.get(right.id) ?? Number.POSITIVE_INFINITY;
        if (leftPriority !== rightPriority) return leftPriority - rightPriority;
        return left.listIndex - right.listIndex;
      });
  }, [draftTeamPriorityIds, membersByTeamId, teams]);
  const selectedTeams = useMemo(
    () => availableTeams.filter((team) => selectedTeamIds.has(team.id)),
    [availableTeams, selectedTeamIds],
  );
  const participantCount =
    participantMode === "teams" ? selectedTeams.length : selectedPlayers.length;
  const canAccessTeamsMode = isAuthenticated && canUseTeams;

  const lowScoreNeedsMorePlayers =
    winCondition === "lowest" && participantCount < 2;
  const winByTwoNeedsMorePlayers = winByTwo && participantCount < 2;
  const ruleNeedsMorePlayers =
    lowScoreNeedsMorePlayers || winByTwoNeedsMorePlayers;

  const canCreate =
    name.trim().length > 0 &&
    Number.isFinite(parsedTarget) &&
    (manualEndOnly || parsedTarget > 0) &&
    (!timerEnabled || timerMode === "stopwatch" || timerTotalSeconds > 0) &&
    participantCount > 0 &&
    (participantMode !== "teams" || (isAuthenticated && canUseTeams)) &&
    !ruleNeedsMorePlayers;

  useEffect(() => {
    if (participantMode === "teams" && !canAccessTeamsMode) {
      setParticipantMode("players");
    }
  }, [canAccessTeamsMode, participantMode]);

  const newPlayerValidationMessage = useMemo(() => {
    const normalizedName = normalizePlayerName(newPlayerName);
    if (!normalizedName) return undefined;
    const alreadyExists =
      profiles.some(
        (profile) => normalizePlayerName(profile.name) === normalizedName,
      ) ||
      stagedPlayers.some(
        (player) => normalizePlayerName(player.name) === normalizedName,
      );

    return alreadyExists
      ? "A player with that name already exists."
      : undefined;
  }, [newPlayerName, profiles, stagedPlayers]);

  const filteredProfiles = useMemo(() => {
    const query = participantSearch.trim().toLocaleLowerCase();
    if (!query) return profiles;
    return profiles.filter((profile) =>
      profile.name.toLocaleLowerCase().includes(query),
    );
  }, [participantSearch, profiles]);

  const filteredPastInvitedPlayers = useMemo(() => {
    const savedProfileIds = new Set(profiles.map((profile) => profile.id));
    const query = participantSearch.trim().toLocaleLowerCase();
    return pastInvitedPlayers.filter(
      (player) =>
        !savedProfileIds.has(player.profileId) &&
        (!query || player.name.toLocaleLowerCase().includes(query)),
    );
  }, [participantSearch, pastInvitedPlayers, profiles]);

  const filteredTeams = useMemo(() => {
    const query = participantSearch.trim().toLocaleLowerCase();
    if (!query) return availableTeams;
    return availableTeams.filter((team) => {
      if (team.name.toLocaleLowerCase().includes(query)) return true;
      return team.members.some((member) =>
        member.name.toLocaleLowerCase().includes(query),
      );
    });
  }, [availableTeams, participantSearch]);

  const teamListFade = useScrollableListFade([
    participantMode,
    participantSearch,
    filteredTeams.length,
    availableTeams.length,
    selectedTeamIds.size,
  ]);

  useEffect(() => {
    if (!draft) {
      appliedDraftKeyRef.current = null;
      return;
    }

    const draftKey = JSON.stringify({
      token: draftToken ?? 0,
      name: draft.name,
      participantMode: draft.participantMode,
      scoreDirection: draft.scoreDirection,
      startingScore: draft.startingScore,
      targetScore: draft.targetScore,
      winCondition: draft.winCondition,
      winByTwo: draft.winByTwo,
      manualEndOnly: draft.manualEndOnly,
      timerEnabled: draft.timerEnabled,
      diceEnabled: draft.diceEnabled ?? false,
      quickScoreValues: draft.quickScoreValues ?? [1, 2],
      timerMode: draft.timerMode,
      timerSeconds: draft.timerSeconds,
      initialPlayers: draft.initialPlayers.map(
        (player) =>
          player.invitedUserId ?? player.profileId ?? player.name,
      ),
      initialTeams: (draft.initialTeams ?? []).map((team) => team.id),
    });

    if (appliedDraftKeyRef.current === draftKey) return;
    appliedDraftKeyRef.current = draftKey;

    setName(draft.name);
    setParticipantMode(draft.participantMode ?? "players");
    setTarget(
      String(
        draft.winCondition === "reach_zero"
          ? draft.startingScore
          : draft.targetScore,
      ),
    );
    setScoreDirection(draft.scoreDirection);
    setWinCondition(draft.winCondition);
    setWinByTwo(draft.winByTwo);
    setManualEndOnly(draft.manualEndOnly);
    setTimerEnabled(draft.timerEnabled);
    setDiceEnabled(draft.diceEnabled ?? false);
    setQuickScoreValues(draft.quickScoreValues ?? [1, 2]);
    setTimerMode(draft.timerMode);
    setTimerMinutes(String(Math.floor(draft.timerSeconds / 60)));
    setTimerSeconds(String(draft.timerSeconds % 60));
    setSelectedProfileIds(
      new Set(
        draft.initialPlayers
          .map((player) => player.profileId)
          .filter(
            (profileId): profileId is string =>
              !!profileId &&
              profiles.some((profile) => profile.id === profileId),
          ),
      ),
    );
    setSelectedPastInvitedUserIds(
      new Set(
        draft.initialPlayers
          .map((player) => player.invitedUserId)
          .filter(
            (userId): userId is string =>
              !!userId &&
              pastInvitedPlayers.some(
                (player) => player.userId === userId && player.canInvite,
              ),
          ),
      ),
    );
    const teamIdsByName = new Map(
      teams.map((team) => [team.name.toLowerCase(), team.id] as const),
    );
    setSelectedTeamIds(
      new Set(
        (draft.initialTeams ?? [])
          .map((team) => teamIdsByName.get(team.name.toLowerCase()) ?? team.id)
          .filter((teamId) =>
            availableTeams.some((availableTeam) => availableTeam.id === teamId),
          ),
      ),
    );
    const draftLocalPlayers = draft.initialPlayers
      .filter(
        (player) =>
          !player.invitedUserId &&
          (!player.profileId ||
            !profiles.some((profile) => profile.id === player.profileId)),
      )
      .map((player) => {
        const now = Date.now();
        return {
          id: crypto.randomUUID(),
          name: player.name,
          avatarColor: player.avatarColor,
          createdAt: now,
          updatedAt: now,
        };
      });

    setStagedPlayers((current) => {
      const playersByName = new Map(
        current.map((player) => [normalizePlayerName(player.name), player]),
      );

      const merged = [...current];

      draftLocalPlayers.forEach((player) => {
        const key = normalizePlayerName(player.name);

        if (!playersByName.has(key)) {
          playersByName.set(key, player);
          merged.push(player);
        }
      });

      setSelectedStagedPlayerIds(
        new Set(
          draftLocalPlayers
            .map(
              (player) =>
                playersByName.get(normalizePlayerName(player.name))?.id,
            )
            .filter((id): id is string => !!id),
        ),
      );

      return merged;
    });
    setIsAddingPlayer(false);
    setParticipantSearch("");
    setIsPresetBrowserOpen(false);
    setPresetSearch("");
    setSelectedPresetInfoId(null);
  }, [
    availableTeams,
    draft,
    draftToken,
    pastInvitedPlayers,
    profiles,
    teams,
  ]);

  useEffect(() => {
    if (!isPresetBrowserOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target || presetBrowserRef.current?.contains(target)) return;
      setIsPresetBrowserOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isPresetBrowserOpen]);

  const filteredGamePresets = useMemo(() => {
    const query = presetSearch.trim().toLocaleLowerCase();
    if (!query) return GAME_PRESETS;

    return GAME_PRESETS.filter((preset) => {
      const haystack = [
        preset.name,
        preset.category,
        preset.description,
        preset.winCondition === "reach_zero"
          ? preset.startingScore
          : preset.targetScore,
        preset.winCondition === "lowest"
          ? "lowest wins"
          : preset.winCondition === "reach_zero"
            ? "reach zero"
            : preset.winByTwo
              ? "win by 2"
              : "highest wins",
        preset.timerEnabled ? "timer" : "no timer",
      ]
        .join(" ")
        .toLocaleLowerCase();
      return haystack.includes(query);
    });
  }, [presetSearch]);
  function toggleProfile(profileId: string) {
    setSelectedProfileIds((current) => {
      const next = new Set(current);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  }

  function togglePastInvitedPlayer(userId: string) {
    if (
      !pastInvitedPlayers.some(
        (player) => player.userId === userId && player.canInvite,
      )
    ) {
      return;
    }
    setSelectedPastInvitedUserIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function updateTarget(value: string) {
    const digits = value.replace(/[^\d]/g, "");
    setTarget(
      digits ? String(Math.min(5000, Number.parseInt(digits, 10))) : "",
    );
  }

  function adjustTarget(delta: number) {
    const base =
      Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : 8;
    setTarget(String(Math.min(5000, Math.max(1, base + delta))));
  }

  function applyCountdownPreset(totalSeconds: number) {
    setTimerMode("countdown");
    setTimerMinutes(String(Math.floor(totalSeconds / 60)));
    setTimerSeconds(String(totalSeconds % 60));
  }

  function applyGamePreset(preset: GamePreset) {
    setName(preset.name);
    setTarget(
      String(
        preset.winCondition === "reach_zero"
          ? preset.startingScore
          : preset.targetScore,
      ),
    );
    setScoreDirection(preset.scoreDirection);
    setWinCondition(preset.winCondition);
    setWinByTwo(preset.winByTwo);
    setManualEndOnly(preset.manualEndOnly);
    setTimerEnabled(preset.timerEnabled);
    setDiceEnabled(false);
    setQuickScoreValues(preset.quickScoreValues);
    setTimerMode(preset.timerMode);
    setTimerMinutes(String(Math.floor(preset.timerSeconds / 60)));
    setTimerSeconds(String(preset.timerSeconds % 60));
    setIsPresetBrowserOpen(false);
    setSelectedPresetInfoId(null);
  }

  function addPlayer() {
    const trimmedName = newPlayerName.trim();
    if (!trimmedName || newPlayerValidationMessage) return;

    if (isAuthenticated && saveAsProfile) {
      const profile = onUpsertProfile(trimmedName, newPlayerColor);

      if (profile) {
        setSelectedProfileIds((current) => new Set([...current, profile.id]));
      } else {
        const now = Date.now();
        const localPlayer = {
          id: crypto.randomUUID(),
          name: trimmedName,
          avatarColor: newPlayerColor,
          createdAt: now,
          updatedAt: now,
        };

        setStagedPlayers((current) => [...current, localPlayer]);
        setSelectedStagedPlayerIds(
          (current) => new Set([...current, localPlayer.id]),
        );
      }
    } else {
      const now = Date.now();
      const localPlayer = {
        id: crypto.randomUUID(),
        name: trimmedName,
        avatarColor: newPlayerColor,
        createdAt: now,
        updatedAt: now,
      };

      setStagedPlayers((current) => [...current, localPlayer]);
      setSelectedStagedPlayerIds(
        (current) => new Set([...current, localPlayer.id]),
      );
    }

    setNewPlayerName("");
    setNewPlayerColor(
      AVATAR_COLORS[
        (profiles.length + stagedPlayers.length + 1) % AVATAR_COLORS.length
      ].value,
    );
    setIsAddingPlayer(false);
  }

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((current) => {
      const next = new Set(current);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }

  function switchParticipantMode(nextMode: "players" | "teams") {
    setParticipantMode(nextMode);
    setIsAddingPlayer(false);
  }

  function handleTeamsModePress() {
    if (canAccessTeamsMode) {
      switchParticipantMode("teams");
      return;
    }

    setIsAddingPlayer(false);
    if (!isAuthenticated) {
      onOpenProFeatureAuth();
      return;
    }

    onOpenProPlan();
  }

  function buildDraftState(): NewGameInput {
    const savedPlayers = profiles
      .filter((profile) => selectedProfileIds.has(profile.id))
      .map((profile) => ({
        name: profile.name,
        avatarColor: profile.avatarColor,
        profileId: profile.id,
      }));

    return {
      name,
      participantMode,
      scoreDirection,
      startingScore: scoreDirection === "down" ? parsedTarget || 0 : 0,
      targetScore: winCondition === "reach_zero" ? 0 : parsedTarget || 0,
      winCondition,
      winByTwo,
      manualEndOnly,
      timerEnabled,
      diceEnabled,
      quickScoreValues,
      timerMode,
      timerSeconds:
        timerMode === "countdown" ? Math.max(1, timerTotalSeconds || 0) : 300,
      initialPlayers: [
        ...savedPlayers,
        ...selectedStagedPlayersForGame,
        ...selectedInvitedPlayersForGame,
      ],
      initialTeams: selectedTeams.map((team) => ({
        id: team.id,
        name: team.name,
        icon: team.icon,
        members: team.members.map((member) => ({
          name: member.name,
          avatarColor: member.avatarColor,
          profileId: member.id,
        })),
      })),
    };
  }

  function openTeamsWorkspace() {
    onOpenTeamsTab(buildDraftState());
  }

  async function startGame() {
    if (!canCreate) return;
    const savedPlayers = profiles
      .filter((profile) => selectedProfileIds.has(profile.id))
      .map((profile) => ({
        name: profile.name,
        avatarColor: profile.avatarColor,
        profileId: profile.id,
      }));

    const created = await onCreate({
      name,
      participantMode,
      scoreDirection,
      startingScore: scoreDirection === "down" ? parsedTarget : 0,
      targetScore: winCondition === "reach_zero" ? 0 : parsedTarget,
      winCondition,
      winByTwo,
      manualEndOnly,
      timerEnabled,
      diceEnabled,
      quickScoreValues,
      timerMode,
      timerSeconds:
        timerMode === "countdown" ? Math.max(1, timerTotalSeconds) : 300,
      initialPlayers:
        participantMode === "teams"
          ? []
          : [
              ...savedPlayers,
              ...selectedStagedPlayersForGame,
              ...selectedInvitedPlayersForGame,
            ],
      initialTeams:
        participantMode === "teams"
          ? selectedTeams.map((team) => ({
              id: team.id,
              name: team.name,
              icon: team.icon,
              members: team.members.map((member) => ({
                name: member.name,
                avatarColor: member.avatarColor,
                profileId: member.id,
              })),
            }))
          : [],
    });
    if (created) resetForm();
  }

  const sectionVariants = {
    closed: {
      opacity: 0,
      y: reduceMotion ? 0 : 14,
      scale: reduceMotion ? 1 : 0.985,
      filter: reduceMotion ? "none" : "blur(3px)",
    },
    open: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
    },
  };

  const sectionTransition = reduceMotion
    ? { duration: 0 }
    : {
        type: "spring" as const,
        stiffness: 270,
        damping: 24,
        mass: 0.72,
      };

  const staggerVariants = {
    closed: {},
    open: {
      transition: reduceMotion
        ? { staggerChildren: 0, delayChildren: 0 }
        : {
            staggerChildren: 0.055,
            delayChildren: 0.08,
          },
    },
  };

  return {
    open: props.open,
    profiles,
    canUseTeams,
    isAuthenticated,
    onOpenChange: props.onOpenChange,
    onOpenAuth: props.onOpenAuth,
    hasMounted,
    name,
    setName,
    target,
    participantMode,
    setScoreDirection,
    winCondition,
    setWinCondition,
    winByTwo,
    setWinByTwo,
    manualEndOnly,
    setManualEndOnly,
    timerEnabled,
    setTimerEnabled,
    diceEnabled,
    setDiceEnabled,
    timerMode,
    setTimerMode,
    timerMinutes,
    setTimerMinutes,
    timerSeconds,
    setTimerSeconds,
    selectedProfileIds,
    selectedPastInvitedUserIds,
    selectedTeamIds,
    isAddingPlayer,
    setIsAddingPlayer,
    participantSearch,
    setParticipantSearch,
    isPresetBrowserOpen,
    setIsPresetBrowserOpen,
    presetSearch,
    setPresetSearch,
    selectedPresetInfoId,
    setSelectedPresetInfoId,
    newPlayerName,
    setNewPlayerName,
    saveAsProfile,
    setSaveAsProfile,
    newPlayerColor,
    setNewPlayerColor,
    presetBrowserRef,
    bodyInnerRef,
    reduceMotion,
    bodyContentHeight,
    selectedStagedPlayerIds,
    timerTotalSeconds,
    filteredStagedPlayers,
    toggleStagedPlayer,
    deleteStagedPlayer,
    availableTeams,
    participantCount,
    canAccessTeamsMode,
    lowScoreNeedsMorePlayers,
    ruleNeedsMorePlayers,
    canCreate,
    newPlayerValidationMessage,
    filteredProfiles,
    filteredPastInvitedPlayers,
    filteredTeams,
    teamListFade,
    filteredGamePresets,
    toggleProfile,
    togglePastInvitedPlayer,
    updateTarget,
    adjustTarget,
    applyCountdownPreset,
    applyGamePreset,
    addPlayer,
    toggleTeam,
    switchParticipantMode,
    handleTeamsModePress,
    openTeamsWorkspace,
    startGame,
    sectionVariants,
    sectionTransition,
    staggerVariants,
  };
}
