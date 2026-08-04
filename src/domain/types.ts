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

export const DRAFT_ENTRY_SOURCES = ["manual", "lcu"] as const;
export type DraftEntrySource = (typeof DRAFT_ENTRY_SOURCES)[number];

export interface UnassignedPick {
  championId: string;
  source: DraftEntrySource;
}

export interface DraftState {
  picks: Record<TeamSide, TeamPicks>;
  bans: Record<TeamSide, Array<string | null>>;
  pickSources: Record<TeamSide, Record<Role, DraftEntrySource | null>>;
  banSources: Record<TeamSide, Array<DraftEntrySource | null>>;
  unassignedPicks: Record<TeamSide, UnassignedPick[]>;
  syncSessionKey: string | null;
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
  syncWithLeagueClient: boolean;
}

export interface PersistedState {
  schemaVersion: 2;
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
  pickedAt?: { side: TeamSide; role: Role | null };
  requiresPickRemoval?: boolean;
}

export interface SyncedPick {
  championId: string;
  role: Role | null;
}

export interface LcuDraftSnapshot {
  sessionKey: string;
  phase: string | null;
  sequence: number;
  allyPicks: SyncedPick[];
  enemyPicks: string[];
  bans: Record<TeamSide, string[]>;
  unknownChampionIds: number[];
}

export const LCU_CONNECTION_STATES = [
  "disabled",
  "searching",
  "client-found",
  "connecting",
  "idle",
  "champ-select",
  "reconnecting",
  "unavailable",
] as const;
export type LcuConnectionState = (typeof LCU_CONNECTION_STATES)[number];

export interface LcuStatus {
  state: LcuConnectionState;
  message: string | null;
}
