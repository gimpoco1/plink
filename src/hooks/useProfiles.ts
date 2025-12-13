import { useEffect, useMemo, useState } from "react";
import type { PlayerProfile } from "../types";
import { loadProfiles, saveProfiles } from "../storage/profilesStorage";
import { uid } from "../utils/id";
import { formatPlayerName } from "../utils/text";

export function useProfiles() {
  const [profiles, setProfiles] = useState<PlayerProfile[]>(() => loadProfiles());

  useEffect(() => {
    saveProfiles(profiles);
  }, [profiles]);

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
      return a.name.localeCompare(b.name);
    });
  }, [profiles]);

  function upsertProfile(rawName: string, avatarColor: string): PlayerProfile | null {
    const name = formatPlayerName(rawName);
    if (!name) return null;

    const existing = profiles.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      const updated: PlayerProfile = { ...existing, name, avatarColor };
      setProfiles((prev) => prev.map((p) => (p.id === existing.id ? updated : p)));
      return updated;
    }

    const createdAt = Date.now();
    const created: PlayerProfile = { id: uid(), name, avatarColor, createdAt };
    setProfiles((prev) => [...prev, created]);
    return created;
  }

  function deleteProfile(profileId: string) {
    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
  }

  return { profiles: sortedProfiles, upsertProfile, deleteProfile };
}
