import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  createForegroundRefreshHandlers,
  createRealtimeReconnectHandler,
} from "../utils/foregroundRefresh";
import type { GameTeam, TeamMember, ToastState } from "../types";
import { DEFAULT_TEAM_ICON } from "../constants";
import { supabase } from "../lib/supabase";
import {
  loadRemoteTeamMembers,
  loadRemoteTeams,
  saveRemoteTeamMembers,
  saveRemoteTeams,
} from "../storage/remoteStorage";
import { uid } from "../utils/id";
import { formatTeamName } from "../utils/text";

function getTeamSyncSignature(teams: GameTeam[], members: TeamMember[]) {
  const teamKey = teams
    .map((team) => `${team.id}:${team.updatedAt ?? team.createdAt}`)
    .sort()
    .join("|");
  const memberKey = members
    .map((member) => `${member.teamId}:${member.profileId}:${member.createdAt}`)
    .sort()
    .join("|");
  return `${teamKey}__${memberKey}`;
}

function getSyncErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "Unknown sync error";
}

function dedupeTeamMembers(members: TeamMember[]) {
  const unique = new Map<string, TeamMember>();
  for (const member of members) {
    const key = `${member.teamId}:${member.profileId}`;
    const existing = unique.get(key);
    if (!existing || member.createdAt < existing.createdAt) {
      unique.set(key, member);
    }
  }
  return [...unique.values()];
}

function mergeTeamsById(baseTeams: GameTeam[], incomingTeams: GameTeam[]) {
  const merged = new Map(baseTeams.map((team) => [team.id, team]));

  for (const incoming of incomingTeams) {
    const existing = merged.get(incoming.id);
    const existingUpdatedAt = existing?.updatedAt ?? existing?.createdAt ?? 0;
    const incomingUpdatedAt = incoming.updatedAt ?? incoming.createdAt;
    if (!existing || incomingUpdatedAt >= existingUpdatedAt) {
      merged.set(incoming.id, incoming);
    }
  }

  return Array.from(merged.values()).sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.name.localeCompare(b.name);
  });
}

export function useTeams(session: Session | null) {
  const userId = session?.user.id ?? null;
  const [teams, setTeams] = useState<GameTeam[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [remoteReady, setRemoteReady] = useState(!session);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<ToastState | null>(null);
  const remoteSignatureRef = useRef<string | null>(null);
  const localChangeVersionRef = useRef(0);
  const savedChangeVersionRef = useRef(0);
  const isSavingRemoteRef = useRef(false);
  const [saveRetryTick, setSaveRetryTick] = useState(0);
  const canPersistTeams = Boolean(userId && remoteReady && remoteUserId === userId);

  function markLocalChange() {
    localChangeVersionRef.current += 1;
  }

  useEffect(() => {
    let alive = true;

    if (!userId) {
      setTeams([]);
      setTeamMembers([]);
      setRemoteReady(true);
      setRemoteUserId(null);
      remoteSignatureRef.current = null;
      localChangeVersionRef.current = 0;
      savedChangeVersionRef.current = 0;
      isSavingRemoteRef.current = false;
      setSyncNotice(null);
      return () => {
        alive = false;
      };
    }

    setRemoteReady(false);
    setRemoteUserId(null);
    remoteSignatureRef.current = null;
    localChangeVersionRef.current = 0;
    savedChangeVersionRef.current = 0;
    isSavingRemoteRef.current = false;
    setTeams([]);
    setTeamMembers([]);

    Promise.all([loadRemoteTeams(userId), loadRemoteTeamMembers(userId)])
      .then(([remoteTeams, remoteMembers]) => {
        if (!alive) return;
        const nextMembers = dedupeTeamMembers(remoteMembers);
        setTeams(remoteTeams);
        setTeamMembers(nextMembers);
        remoteSignatureRef.current = getTeamSyncSignature(
          remoteTeams,
          nextMembers,
        );
        setRemoteUserId(userId);
        setRemoteReady(true);
      })
      .catch((error) => {
        if (!alive) return;
        console.error("Failed to load teams from Supabase", error);
        setTeams([]);
        setTeamMembers([]);
        setRemoteReady(true);
        setRemoteUserId(null);
        setSyncNotice({
          message: `Could not load teams: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
      });

    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || remoteUserId !== userId) return;
    let alive = true;
    const activeUserId = userId;

    async function refreshRemoteTeams() {
      try {
        const [remoteTeams, remoteMembers] = await Promise.all([
          loadRemoteTeams(activeUserId),
          loadRemoteTeamMembers(activeUserId),
        ]);
        if (!alive) return;
        const nextMembers = dedupeTeamMembers(remoteMembers);

        const incomingSignature = getTeamSyncSignature(remoteTeams, nextMembers);
        const currentSignature = getTeamSyncSignature(teams, teamMembers);
        if (
          remoteSignatureRef.current &&
          currentSignature !== remoteSignatureRef.current &&
          incomingSignature === remoteSignatureRef.current
        ) {
          return;
        }
        if (incomingSignature === currentSignature) {
          remoteSignatureRef.current = incomingSignature;
          return;
        }
        remoteSignatureRef.current = incomingSignature;
        setTeams(remoteTeams);
        setTeamMembers(nextMembers);
      } catch {
        // Keep in-memory state if refresh fails.
      }
    }

    const {
      refreshOnFocus,
      refreshWhenVisible,
    } = createForegroundRefreshHandlers(() => void refreshRemoteTeams());

    let teamsChannel: ReturnType<NonNullable<typeof supabase>["channel"]> | null =
      null;
    let membersChannel:
      | ReturnType<NonNullable<typeof supabase>["channel"]>
      | null = null;
    if (supabase) {
      teamsChannel = supabase.channel(`teams:${userId}`);
      teamsChannel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teams",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refreshRemoteTeams();
        },
      );
      void teamsChannel.subscribe(
        createRealtimeReconnectHandler(() => void refreshRemoteTeams()),
      );

      membersChannel = supabase.channel(`team-members:${userId}`);
      membersChannel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
        },
        () => {
          void refreshRemoteTeams();
        },
      );
      void membersChannel.subscribe();
    }

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      alive = false;
      if (teamsChannel) {
        void teamsChannel.unsubscribe();
        supabase?.removeChannel(teamsChannel);
      }
      if (membersChannel) {
        void membersChannel.unsubscribe();
        supabase?.removeChannel(membersChannel);
      }
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [remoteUserId, teamMembers, teams, userId]);

  useEffect(() => {
    if (!userId) return;
    if (!remoteReady || remoteUserId !== userId) return;
    const saveVersion = localChangeVersionRef.current;
    if (saveVersion === savedChangeVersionRef.current) return;
    if (isSavingRemoteRef.current) return;

    isSavingRemoteRef.current = true;
    saveRemoteTeams(userId, teams)
      .then(() => saveRemoteTeamMembers(userId, teamMembers))
      .then(() => {
        remoteSignatureRef.current = getTeamSyncSignature(teams, teamMembers);
        if (localChangeVersionRef.current === saveVersion) {
          savedChangeVersionRef.current = saveVersion;
        }
      })
      .catch((error) => {
        console.error("Failed to save teams to Supabase", error);
        setSyncNotice({
          message: `Could not save teams: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
      })
      .finally(() => {
        isSavingRemoteRef.current = false;
        if (localChangeVersionRef.current !== savedChangeVersionRef.current) {
          setSaveRetryTick((value) => value + 1);
        }
      });
  }, [remoteReady, remoteUserId, saveRetryTick, teamMembers, teams, userId]);

  const teamMembersByTeamId = useMemo(() => {
    const map = new Map<string, TeamMember[]>();
    teamMembers.forEach((member) => {
      const next = map.get(member.teamId) ?? [];
      next.push(member);
      map.set(member.teamId, next);
    });
    return map;
  }, [teamMembers]);

  function createTeam(rawName: string, icon = DEFAULT_TEAM_ICON) {
    if (!canPersistTeams) {
      setSyncNotice({
        message: "Teams are still loading. Try again in a moment.",
        tone: "error",
      });
      return null;
    }
    const name = formatTeamName(rawName);
    if (!name) return null;
    if (teams.some((team) => team.name.toLowerCase() === name.toLowerCase())) {
      return null;
    }

    const now = Date.now();
    const createdTeam: GameTeam = {
      id: uid(),
      name,
      icon,
      createdAt: now,
      updatedAt: now,
    };
    markLocalChange();
    setTeams((current) => [...current, createdTeam]);
    return createdTeam;
  }

  function deleteTeam(teamId: string) {
    if (!canPersistTeams) {
      setSyncNotice({
        message: "Teams are still loading. Try again in a moment.",
        tone: "error",
      });
      return;
    }
    markLocalChange();
    setTeams((current) => current.filter((team) => team.id !== teamId));
    setTeamMembers((current) =>
      current.filter((member) => member.teamId !== teamId),
    );
  }

  function updateTeam(
    teamId: string,
    updates: Partial<Pick<GameTeam, "name" | "icon">>,
  ) {
    if (!canPersistTeams) {
      setSyncNotice({
        message: "Teams are still loading. Try again in a moment.",
        tone: "error",
      });
      return;
    }
    const name =
      typeof updates.name === "string" ? formatTeamName(updates.name) : undefined;
    if (updates.name !== undefined && !name) return;
    markLocalChange();
    setTeams((current) =>
      current.map((team) => {
        if (team.id !== teamId) return team;
        if (
          name &&
          current.some(
            (item) =>
              item.id !== teamId && item.name.toLowerCase() === name.toLowerCase(),
          )
        ) {
          return team;
        }
        return {
          ...team,
          ...updates,
          ...(name ? { name } : {}),
          updatedAt: Date.now(),
        };
      }),
    );
  }

  function toggleTeamMember(teamId: string, profileId: string) {
    if (!canPersistTeams) {
      setSyncNotice({
        message: "Teams are still loading. Try again in a moment.",
        tone: "error",
      });
      return;
    }
    markLocalChange();
    setTeamMembers((current) => {
      const existing = current.find(
        (member) => member.teamId === teamId && member.profileId === profileId,
      );
      if (existing) {
        return current.filter(
          (member) =>
            !(member.teamId === teamId && member.profileId === profileId),
        );
      }
      return dedupeTeamMembers([
        ...current,
        { teamId, profileId, createdAt: Date.now() },
      ]);
    });
    setTeams((current) =>
      current.map((team) =>
        team.id === teamId ? { ...team, updatedAt: Date.now() } : team,
      ),
    );
  }

  function removeProfileMemberships(profileId: string) {
    if (!canPersistTeams) {
      setSyncNotice({
        message: "Teams are still loading. Try again in a moment.",
        tone: "error",
      });
      return;
    }
    markLocalChange();
    setTeamMembers((current) =>
      current.filter((member) => member.profileId !== profileId),
    );
  }

  function importTeams(
    incomingTeams: GameTeam[],
    incomingTeamMembers: TeamMember[],
  ) {
    if (!canPersistTeams) {
      setSyncNotice({
        message: "Teams are still loading. Try again in a moment.",
        tone: "error",
      });
      return 0;
    }

    const existingTeamsById = new Map(teams.map((team) => [team.id, team]));
    const existingTeamMemberByKey = new Map(
      teamMembers.map((member) => [
        `${member.teamId}:${member.profileId}`,
        member,
      ]),
    );
    const changedTeamIds = new Set<string>();

    for (const incomingTeam of incomingTeams) {
      const existingTeam = existingTeamsById.get(incomingTeam.id);
      if (!existingTeam) {
        changedTeamIds.add(incomingTeam.id);
        continue;
      }
      const existingUpdatedAt =
        existingTeam.updatedAt ?? existingTeam.createdAt;
      const incomingUpdatedAt = incomingTeam.updatedAt ?? incomingTeam.createdAt;
      if (
        incomingUpdatedAt > existingUpdatedAt ||
        incomingTeam.name !== existingTeam.name ||
        incomingTeam.icon !== existingTeam.icon
      ) {
        changedTeamIds.add(incomingTeam.id);
      }
    }

    const dedupedIncomingMembers = dedupeTeamMembers(incomingTeamMembers);
    for (const incomingMember of dedupedIncomingMembers) {
      const key = `${incomingMember.teamId}:${incomingMember.profileId}`;
      const existingMember = existingTeamMemberByKey.get(key);
      if (
        !existingMember ||
        incomingMember.createdAt < existingMember.createdAt
      ) {
        changedTeamIds.add(incomingMember.teamId);
      }
    }

    markLocalChange();
    const mergedTeams = mergeTeamsById(teams, incomingTeams);
    const validTeamIds = new Set(mergedTeams.map((team) => team.id));
    const mergedTeamMembers = dedupeTeamMembers([
      ...teamMembers,
      ...dedupedIncomingMembers,
    ]).filter((member) => validTeamIds.has(member.teamId));

    setTeams(mergedTeams);
    setTeamMembers(mergedTeamMembers);

    return changedTeamIds.size;
  }

  return {
    teams,
    teamMembers,
    teamMembersByTeamId,
    createTeam,
    updateTeam,
    deleteTeam,
    toggleTeamMember,
    removeProfileMemberships,
    importTeams,
    remoteReady,
    syncNotice,
  };
}
