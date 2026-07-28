import championSnapshot from "../data/champions.json";
import { DEFAULT_RECOMMENDATION_PREFERENCES } from "./constants";
import { ROLES, TEAM_SIDES, type DraftState, type PersistedState, type Pools, type RolePool } from "./types";

export function createEmptyDraft(): DraftState {
  return {
    picks: Object.fromEntries(
      TEAM_SIDES.map((side) => [
        side,
        Object.fromEntries(ROLES.map((role) => [role, null])),
      ]),
    ) as DraftState["picks"],
    bans: {
      ally: Array.from({ length: 5 }, () => null),
      enemy: Array.from({ length: 5 }, () => null),
    },
  };
}

function createEmptyRolePool(): RolePool {
  return {
    main: [],
    good: [],
    situational: [],
    avoid: [],
  };
}

export function createDefaultPools(): Pools {
  const pools = Object.fromEntries(
    ROLES.map((role) => [role, createEmptyRolePool()]),
  ) as Pools;

  pools.ADC = {
    main: ["Jinx", "Caitlyn", "Vayne", "Ashe", "Varus", "Lucian", "Yunara"],
    good: ["Ezreal", "Sivir"],
    situational: ["Xayah", "Senna", "Jhin"],
    avoid: ["Tristana", "Draven", "Kalista", "MissFortune"],
  };
  pools.JG = {
    main: ["Diana", "Ekko", "Kayn", "LeeSin", "Shyvana", "Vi"],
    good: [],
    situational: [],
    avoid: [],
  };
  return pools;
}

export function createDefaultPersistedState(): PersistedState {
  return {
    schemaVersion: 1,
    championDataVersion: championSnapshot.version,
    draft: createEmptyDraft(),
    pools: createDefaultPools(),
    profile: {
      playedRoles: ["ADC", "JG"],
      recommendationPreferences: DEFAULT_RECOMMENDATION_PREFERENCES,
      setupCompleted: false,
    },
    settings: {
      primaryRole: "ADC",
      additionalRoles: ["SUP"],
      alwaysOnTop: false,
      compactMode: false,
      clearDraftOnStart: false,
    },
  };
}
