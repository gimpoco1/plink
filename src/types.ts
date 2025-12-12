export type Player = {
  id: string;
  name: string;
  score: number;
  createdAt: number;
  reachedAt: number;
  avatarColor: string;
  profileId?: string;
};

export type PlayerProfile = {
  id: string;
  name: string;
  avatarColor: string;
  createdAt: number;
};
