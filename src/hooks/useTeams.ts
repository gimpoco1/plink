import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
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

export function useTeams(session: Session | null) {
  const userId = session?.user.id ?? null;
  const [teams, setTeams] = useState<GameTeam[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [remoteReady, setRemoteReady] = useState(!session);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<ToastState | null>(null);
  const remoteSignatureRef = useRef<string | null>(null);
  const canPersistTeams = Boolean(userId && remoteReady && remoteUserId === userId);

  useEffect(() => {
    let alive = true;

    if (!userId) {
      setTeams([]);
      setTeamMembers([]);
      setRemoteReady(true);
      setRemoteUserId(null);
      remoteSignatureRef.current = null;
      setSyncNotice(null);
      return () => {
        alive = false;
      };
    }

    setRemoteReady(false);
    setRemoteUserId(null);
    remoteSignatureRef.current = null;
    setTeams([]);
    setTeamMembers([]);

    Promise.all([loadRemoteTeams(userId), loadRemoteTeamMembers(userId)])
      .then(([remoteTeams, remoteMembers]) => {
        if (!alive) return;
        setTeams(remoteTeams);
        setTeamMembers(remoteMembers);
        remoteSignatureRef.current = getTeamSyncSignature(
          remoteTeams,
          remoteMembers,
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

        const incomingSignature = getTeamSyncSignature(remoteTeams, remoteMembers);
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
        setTeamMembers(remoteMembers);
      } catch {
        // Keep in-memory state if refresh fails.
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void refreshRemoteTeams();
    }

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
      void teamsChannel.subscribe();

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

    const intervalId = window.setInterval(refreshRemoteTeams, 5000);
    window.addEventListener("focus", refreshRemoteTeams);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
      if (teamsChannel) {
        void teamsChannel.unsubscribe();
        supabase?.removeChannel(teamsChannel);
      }
      if (membersChannel) {
        void membersChannel.unsubscribe();
        supabase?.removeChannel(membersChannel);
      }
      window.removeEventListener("focus", refreshRemoteTeams);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [remoteUserId, teamMembers, teams, userId]);

  useEffect(() => {
    if (!userId) return;
    if (!remoteReady || remoteUserId !== userId) return;

    saveRemoteTeams(userId, teams)
      .then(() => saveRemoteTeamMembers(userId, teamMembers))
      .then(() => {
        remoteSignatureRef.current = getTeamSyncSignature(teams, teamMembers);
      })
      .catch((error) => {
        console.error("Failed to save teams to Supabase", error);
        setSyncNotice({
          message: `Could not save teams: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
      });
  }, [remoteReady, remoteUserId, teamMembers, teams, userId]);

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
      return [...current, { teamId, profileId, createdAt: Date.now() }];
    });
    setTeams((current) =>
      current.map((team) =>
        team.id === teamId ? { ...team, updatedAt: Date.now() } : team,
      ),
    );
  }

  function removeProfileMemberships(profileId: string) {
    setTeamMembers((current) =>
      current.filter((member) => member.profileId !== profileId),
    );
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
    remoteReady,
    syncNotice,
  };
}
