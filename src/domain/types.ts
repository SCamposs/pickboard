export const ROLES = ["TOP", "JG", "MID", "ADC", "SUP"] as const;
export type Role = (typeof ROLES)[number];

export const TEAM_SIDES = ["ally", "enemy"] as const;
export type TeamSide = (typeof TEAM_SIDES)[number];

export const POOL_TIERS = ["main", "good", "situational", "avoid"] as const;
export type PoolTier = (typeof POOL_TIERS)[number];

export interface Champion {
  id: string;
  key: string;
  name: string;
  image: string;
  search: string;
  aliases: string[];
  source?: "embedded" | "downloaded";
}

export type TeamPicks = Record<Role, string | null>;

export interface DraftState {
  picks: Record<TeamSide, TeamPicks>;
  bans: Record<TeamSide, Array<string | null>>;
}

export type RolePool = Record<PoolTier, string[]>;
export type Pools = Record<Role, RolePool>;

export interface UserProfile {
  playedRoles: Role[];
  recommendationPreferences: string;
  setupCompleted: boolean;
}

export interface AppSettings {
  primaryRole: Role;
  additionalRoles: Role[];
  alwaysOnTop: boolean;
  compactMode: boolean;
  clearDraftOnStart: boolean;
}

export interface PersistedState {
  schemaVersion: 1;
  championDataVersion: string;
  draft: DraftState;
  pools: Pools;
  profile: UserProfile;
  settings: AppSettings;
}

export type PickerTarget =
  | { kind: "pick"; side: TeamSide; role: Role }
  | { kind: "ban"; side: TeamSide; index: number };

export interface ChampionCatalog {
  version: string;
  champions: Champion[];
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  pickedAt?: { side: TeamSide; role: Role };
  requiresPickRemoval?: boolean;
}

