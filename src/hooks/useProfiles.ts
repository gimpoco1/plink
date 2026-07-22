import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { PlayerProfile, ToastState } from "../types";
import { supabase } from "../lib/supabase";
import { loadProfiles, saveProfiles } from "../storage/profilesStorage";
import { loadRemoteProfiles, saveRemoteProfiles } from "../storage/remoteStorage";
import {
  createForegroundRefreshHandlers,
  createRealtimeReconnectHandler,
} from "../utils/foregroundRefresh";
import { uid } from "../utils/id";
import { formatPlayerName } from "../utils/text";

function getProfileSyncSignature(profiles: PlayerProfile[]) {
  return profiles
    .map((profile) => `${profile.id}:${profile.updatedAt}`)
    .sort()
    .join("|");
}

function getSyncErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "Unknown sync error";
}

function compareProfiles(left: PlayerProfile, right: PlayerProfile) {
  if (Boolean(left.isAccountPlayer) !== Boolean(right.isAccountPlayer)) {
    return left.isAccountPlayer ? -1 : 1;
  }
  if (left.createdAt !== right.createdAt) return left.createdAt - right.createdAt;
  return left.name.localeCompare(right.name);
}

function mergeProfilesById(
  baseProfiles: PlayerProfile[],
  incomingProfiles: PlayerProfile[],
) {
  const merged = new Map(baseProfiles.map((profile) => [profile.id, profile]));

  for (const incoming of incomingProfiles) {
    const existing = merged.get(incoming.id);
    if (!existing || incoming.updatedAt >= existing.updatedAt) {
      merged.set(incoming.id, incoming);
    }
  }

  return Array.from(merged.values()).sort(compareProfiles);
}

function normalizeAccountPlayers(
  profiles: PlayerProfile[],
  preferredAccountPlayerId?: string | null,
) {
  const currentAccountPlayers = profiles.filter(
    (profile) => profile.isAccountPlayer,
  );
  const preferredExists = preferredAccountPlayerId
    ? profiles.some((profile) => profile.id === preferredAccountPlayerId)
    : false;
  const keepId =
    (preferredExists ? preferredAccountPlayerId : null) ??
    currentAccountPlayers[0]?.id ??
    null;

  if (!keepId) return profiles;

  let changed = false;
  const normalized = profiles.map((profile) => {
    const shouldBeAccountPlayer = profile.id === keepId;
    if (Boolean(profile.isAccountPlayer) === shouldBeAccountPlayer) {
      return profile;
    }
    changed = true;
    return {
      ...profile,
      isAccountPlayer: shouldBeAccountPlayer,
    };
  });

  return changed ? normalized : profiles;
}

function shouldKeepLocalProfiles(
  localProfiles: PlayerProfile[],
  remoteProfiles: PlayerProfile[],
) {
  const remoteById = new Map(
    remoteProfiles.map((profile) => [profile.id, profile]),
  );
  return localProfiles.some((localProfile) => {
    const remoteProfile = remoteById.get(localProfile.id);
    return !!remoteProfile && remoteProfile.updatedAt < localProfile.updatedAt;
  });
}

export function useProfiles(session: Session | null) {
  const userId = session?.user.id ?? null;
  const [profiles, setProfiles] = useState<PlayerProfile[]>(() =>
    loadProfiles(),
  );
  const [remoteReady, setRemoteReady] = useState(!session);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<ToastState | null>(null);
  const remoteSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;

    if (!userId) {
      setRemoteUserId(null);
      setSyncNotice(null);
      remoteSignatureRef.current = null;
      setProfiles(normalizeAccountPlayers(loadProfiles()));
      setRemoteReady(true);
      return () => {
        alive = false;
      };
    }

    setRemoteReady(false);
    setRemoteUserId(null);
    remoteSignatureRef.current = null;
    setProfiles([]);
    loadRemoteProfiles(userId)
      .then((remoteProfiles) => {
        if (!alive) return;
        const normalizedProfiles = normalizeAccountPlayers(remoteProfiles);
        setProfiles(normalizedProfiles);
        remoteSignatureRef.current = getProfileSyncSignature(normalizedProfiles);
        setRemoteUserId(userId);
        setRemoteReady(true);
      })
      .catch((error) => {
        if (!alive) return;
        console.error("Failed to load profiles from Supabase", error);
        setProfiles([]);
        setRemoteUserId(null);
        setSyncNotice({
          message: `Could not load saved players: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
        setRemoteReady(true);
      });

    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || remoteUserId !== userId) return;
    let alive = true;
    const activeUserId = userId;

    async function refreshRemoteProfiles() {
      try {
        const remoteProfiles = await loadRemoteProfiles(activeUserId);
        if (!alive) return;
        setProfiles((previousProfiles) => {
          const remoteSignature = getProfileSyncSignature(remoteProfiles);
          const previousSignature = getProfileSyncSignature(previousProfiles);
          const lastSyncedSignature = remoteSignatureRef.current;

          if (
            lastSyncedSignature &&
            previousSignature !== lastSyncedSignature &&
            remoteSignature === lastSyncedSignature
          ) {
            return previousProfiles;
          }

          if (shouldKeepLocalProfiles(previousProfiles, remoteProfiles)) {
            return previousProfiles;
          }

          if (remoteSignature === previousSignature) {
            remoteSignatureRef.current = remoteSignature;
            return previousProfiles;
          }
          const normalizedRemoteProfiles = normalizeAccountPlayers(
            remoteProfiles,
            previousProfiles.find((profile) => profile.isAccountPlayer)?.id,
          );
          const remoteById = new Map(
            normalizedRemoteProfiles.map((profile) => [profile.id, profile]),
          );
          const removed = previousProfiles.filter(
            (profile) => !remoteById.has(profile.id),
          );
          const changed = previousProfiles.filter((profile) => {
            const remote = remoteById.get(profile.id);
            return remote && remote.updatedAt !== profile.updatedAt;
          });
          if (removed.length > 0) {
            setSyncNotice(
              {
                message:
                  removed.length === 1
                    ? `"${removed[0].name}" was removed from your saved players.`
                    : `${removed.length} saved players were removed from your account.`,
                tone: "default",
              },
            );
          } else if (changed.length > 0) {
            setSyncNotice({
              message: "Your saved players were updated.",
              tone: "default",
            });
          }
          remoteSignatureRef.current =
            getProfileSyncSignature(normalizedRemoteProfiles);
          return normalizedRemoteProfiles;
        });
      } catch {
        // Keep local in-memory state if a background refresh fails.
      }
    }

    const {
      refreshOnFocus,
      refreshWhenVisible,
    } = createForegroundRefreshHandlers(() => void refreshRemoteProfiles());

    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
    if (supabase) {
      channel = supabase.channel(`profiles:${activeUserId}`);
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_profiles",
          filter: `user_id=eq.${activeUserId}`,
        },
        () => {
          void refreshRemoteProfiles();
        },
      );
      void channel.subscribe(
        createRealtimeReconnectHandler(() => void refreshRemoteProfiles()),
      );
    }

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      alive = false;
      if (channel) {
        void channel.unsubscribe();
        if (supabase) {
          supabase.removeChannel(channel);
        }
      }
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [remoteUserId, userId]);

  useEffect(() => {
    if (!userId) {
      if (!remoteReady || remoteUserId !== null) return;
      saveProfiles(profiles);
      return;
    }
    if (!remoteReady || remoteUserId !== userId) return;
    const nextSignature = getProfileSyncSignature(profiles);
    if (nextSignature === remoteSignatureRef.current) return;
    void saveRemoteProfiles(userId, profiles)
      .then(() => {
        remoteSignatureRef.current = nextSignature;
      })
      .catch((error) => {
        console.error("Failed to save profiles to Supabase", error);
        setSyncNotice({
          message: `Could not save players: ${getSyncErrorMessage(error)}`,
          tone: "error",
        });
      });
  }, [profiles, remoteReady, remoteUserId, userId]);

  useEffect(() => {
    const accountPlayerIds = profiles.filter(
      (profile) => profile.isAccountPlayer,
    );
    if (accountPlayerIds.length <= 1) return;
    setProfiles((prev) => normalizeAccountPlayers(prev));
  }, [profiles]);

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort(compareProfiles);
  }, [profiles]);

  function upsertProfile(
    rawName: string,
    avatarColor: string,
  ): PlayerProfile | null {
    const name = formatPlayerName(rawName);
    if (!name) return null;

    const existing = profiles.find(
      (p) => p.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      const updated: PlayerProfile = {
        ...existing,
        name,
        avatarColor,
        updatedAt: Date.now(),
      };
      setProfiles((prev) =>
        prev.map((p) => (p.id === existing.id ? updated : p)),
      );
      return updated;
    }

    const createdAt = Date.now();
    const created: PlayerProfile = {
      id: uid(),
      name,
      avatarColor,
      createdAt,
      updatedAt: createdAt,
    };
    setProfiles((prev) => [...prev, created]);
    return created;
  }

  function deleteProfile(profileId: string) {
    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
  }

  function updateProfile(
    id: string,
    updates: Partial<Pick<PlayerProfile, "name" | "avatarColor">>,
  ) {
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        let name = p.name;
        if (updates.name !== undefined) {
          const formatted = formatPlayerName(updates.name);
          if (formatted) name = formatted;
        }
        return { ...p, ...updates, name, updatedAt: Date.now() };
      }),
    );
  }

  function upsertAccountPlayer(rawName: string, avatarColor: string) {
    const name = formatPlayerName(rawName);
    if (!name) return null;

    const existing =
      profiles.find((p) => p.isAccountPlayer) ??
      profiles.find((p) => p.name.toLowerCase() === name.toLowerCase());
    const now = Date.now();
    if (existing) {
      const updated: PlayerProfile = {
        ...existing,
        name,
        avatarColor: existing.avatarColor || avatarColor,
        isAccountPlayer: true,
        updatedAt: now,
      };
      setProfiles((prev) =>
        prev.map((p) => (p.id === existing.id ? updated : p)),
      );
      return updated;
    }

    const created: PlayerProfile = {
      id: uid(),
      name,
      avatarColor,
      isAccountPlayer: true,
      createdAt: now,
      updatedAt: now,
    };
    setProfiles((prev) => [created, ...prev]);
    return created;
  }

  async function importProfiles(incomingProfiles: PlayerProfile[]) {
    if (incomingProfiles.length === 0) return 0;

    const existingAccountPlayerId =
      profiles.find((profile) => profile.isAccountPlayer)?.id ?? null;
    const existingProfilesById = new Map(
      profiles.map((profile) => [profile.id, profile]),
    );
    const sanitizedIncomingProfiles = incomingProfiles.map((incomingProfile) => ({
      ...incomingProfile,
      isAccountPlayer:
        existingProfilesById.get(incomingProfile.id)?.isAccountPlayer === true,
    }));
    const changedCount = sanitizedIncomingProfiles.reduce((count, incomingProfile) => {
      const existingProfile = existingProfilesById.get(incomingProfile.id);
      if (!existingProfile) return count + 1;
      return incomingProfile.updatedAt > existingProfile.updatedAt
        ? count + 1
        : count;
    }, 0);
    if (changedCount === 0) return 0;

    const mergedProfiles = normalizeAccountPlayers(
      mergeProfilesById(profiles, sanitizedIncomingProfiles),
      existingAccountPlayerId,
    );
    if (userId) {
      if (!remoteReady || remoteUserId !== userId) {
        throw new Error(
          "Loading your saved players. Try importing again in a moment.",
        );
      }
      await saveRemoteProfiles(userId, mergedProfiles);
      remoteSignatureRef.current = getProfileSyncSignature(mergedProfiles);
    }
    setProfiles(mergedProfiles);
    return changedCount;
  }


  return {
    profiles: sortedProfiles,
    upsertProfile,
    upsertAccountPlayer,
    deleteProfile,
    updateProfile,
    importProfiles,
    remoteReady,
    syncNotice,
  };
}
