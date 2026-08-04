import { z } from "zod";
import { createDefaultPersistedState } from "./defaults";
import {
  DRAFT_ENTRY_SOURCES,
  POOL_TIERS,
  ROLES,
  TEAM_SIDES,
  type PersistedState,
} from "./types";

const roleSchema = z.enum(ROLES);
const teamSideSchema = z.enum(TEAM_SIDES);
const draftEntrySourceSchema = z.enum(DRAFT_ENTRY_SOURCES);
const championIdSchema = z.string().min(1);
const optionalChampionSchema = championIdSchema.nullable();

const teamPicksSchema = z.object(
  Object.fromEntries(ROLES.map((role) => [role, optionalChampionSchema])) as Record<
    (typeof ROLES)[number],
    typeof optionalChampionSchema
  >,
);

const pickSourcesSchema = z.object(
  Object.fromEntries(
    ROLES.map((role) => [role, draftEntrySourceSchema.nullable()]),
  ) as Record<(typeof ROLES)[number], z.ZodNullable<typeof draftEntrySourceSchema>>,
);

const draftV1Schema = z.object({
  picks: z.record(teamSideSchema, teamPicksSchema),
  bans: z.record(teamSideSchema, z.array(optionalChampionSchema).length(5)),
});

const draftSchema = draftV1Schema.extend({
  pickSources: z.record(teamSideSchema, pickSourcesSchema),
  banSources: z.record(
    teamSideSchema,
    z.array(draftEntrySourceSchema.nullable()).length(5),
  ),
  unassignedPicks: z.record(
    teamSideSchema,
    z.array(
      z.object({
        championId: championIdSchema,
        source: draftEntrySourceSchema,
      }),
    ),
  ),
  syncSessionKey: z.string().min(1).nullable(),
});

const rolePoolSchema = z.object(
  Object.fromEntries(POOL_TIERS.map((tier) => [tier, z.array(championIdSchema)])) as Record<
    (typeof POOL_TIERS)[number],
    z.ZodArray<typeof championIdSchema>
  >,
);

const poolsSchema = z.object(
  Object.fromEntries(ROLES.map((role) => [role, rolePoolSchema])) as Record<
    (typeof ROLES)[number],
    typeof rolePoolSchema
  >,
);

const profileSchema = z.object({
  playedRoles: z.array(roleSchema),
  recommendationPreferences: z.string(),
  setupCompleted: z.boolean(),
});

const settingsV1Schema = z.object({
  primaryRole: roleSchema,
  additionalRoles: z.array(roleSchema),
  alwaysOnTop: z.boolean(),
  compactMode: z.boolean(),
  clearDraftOnStart: z.boolean(),
});

const settingsSchema = settingsV1Schema.extend({
  syncWithLeagueClient: z.boolean(),
});

const persistedStateV1Schema = z.object({
  schemaVersion: z.literal(1),
  championDataVersion: z.string().min(1),
  draft: draftV1Schema,
  pools: poolsSchema,
  profile: profileSchema,
  settings: settingsV1Schema,
});

export const persistedStateSchema = z.object({
  schemaVersion: z.literal(2),
  championDataVersion: z.string().min(1),
  draft: draftSchema,
  pools: poolsSchema,
  profile: profileSchema,
  settings: settingsSchema,
});

export interface HydratedStateResult {
  state: PersistedState;
  recovered: boolean;
}

type PersistedStateV1 = z.infer<typeof persistedStateV1Schema>;

function migrateV1(state: PersistedStateV1): PersistedState {
  const defaults = createDefaultPersistedState();
  const pickSources = structuredClone(defaults.draft.pickSources);
  const banSources = structuredClone(defaults.draft.banSources);
  for (const side of TEAM_SIDES) {
    for (const role of ROLES) {
      pickSources[side][role] = state.draft.picks[side][role] ? "manual" : null;
    }
    for (let index = 0; index < 5; index += 1) {
      banSources[side][index] = state.draft.bans[side][index] ? "manual" : null;
    }
  }
  return sanitizeState({
    ...state,
    schemaVersion: 2,
    draft: {
      ...state.draft,
      pickSources,
      banSources,
      unassignedPicks: { ally: [], enemy: [] },
      syncSessionKey: null,
    },
    settings: { ...state.settings, syncWithLeagueClient: true },
  });
}

function createV1Defaults(): PersistedStateV1 {
  const defaults = createDefaultPersistedState();
  const settings = {
    primaryRole: defaults.settings.primaryRole,
    additionalRoles: defaults.settings.additionalRoles,
    alwaysOnTop: defaults.settings.alwaysOnTop,
    compactMode: defaults.settings.compactMode,
    clearDraftOnStart: defaults.settings.clearDraftOnStart,
  };
  return {
    schemaVersion: 1,
    championDataVersion: defaults.championDataVersion,
    draft: { picks: defaults.draft.picks, bans: defaults.draft.bans },
    pools: defaults.pools,
    profile: defaults.profile,
    settings,
  };
}

export function hydratePersistedState(raw: unknown): HydratedStateResult {
  const current = persistedStateSchema.safeParse(raw);
  if (current.success) {
    return { state: sanitizeState(current.data), recovered: false };
  }

  const v1 = persistedStateV1Schema.safeParse(raw);
  if (v1.success) {
    return { state: migrateV1(v1.data), recovered: true };
  }

  if (typeof raw === "object" && raw !== null && "schemaVersion" in raw) {
    const legacy = raw as Record<string, unknown> & { schemaVersion?: unknown };
    if (legacy.schemaVersion === 0) {
      const defaults = createV1Defaults();
      const migrated = persistedStateV1Schema.safeParse({
        ...defaults,
        ...legacy,
        schemaVersion: 1,
        settings: {
          ...defaults.settings,
          ...(typeof legacy.settings === "object" && legacy.settings !== null
            ? legacy.settings
            : {}),
        },
        profile: {
          ...defaults.profile,
          ...(typeof legacy.profile === "object" && legacy.profile !== null
            ? legacy.profile
            : {}),
        },
      });
      if (migrated.success) {
        return { state: migrateV1(migrated.data), recovered: true };
      }
    }
  }

  return { state: createDefaultPersistedState(), recovered: true };
}

function sanitizeState(state: PersistedState): PersistedState {
  const additionalRoles = [...new Set(state.settings.additionalRoles)].filter(
    (role) => role !== state.settings.primaryRole,
  );
  const playedRoles = [...new Set(state.profile.playedRoles)];
  const sanitizedPools = structuredClone(state.pools);
  const draft = structuredClone(state.draft);

  for (const role of ROLES) {
    const seen = new Set<string>();
    for (const tier of POOL_TIERS) {
      sanitizedPools[role][tier] = sanitizedPools[role][tier].filter((championId) => {
        if (seen.has(championId)) return false;
        seen.add(championId);
        return true;
      });
    }
  }

  const picked = new Set<string>();
  for (const side of TEAM_SIDES) {
    for (const role of ROLES) {
      const championId = draft.picks[side][role];
      draft.pickSources[side][role] = championId
        ? (draft.pickSources[side][role] ?? "manual")
        : null;
      if (championId) picked.add(championId);
    }
  }
  for (const side of TEAM_SIDES) {
    const seen = new Set<string>();
    draft.unassignedPicks[side] = draft.unassignedPicks[side].filter((pick) => {
      if (picked.has(pick.championId) || seen.has(pick.championId)) return false;
      seen.add(pick.championId);
      picked.add(pick.championId);
      return true;
    });
    for (let index = 0; index < 5; index += 1) {
      draft.banSources[side][index] = draft.bans[side][index]
        ? (draft.banSources[side][index] ?? "manual")
        : null;
    }
  }

  return {
    ...state,
    draft,
    pools: sanitizedPools,
    profile: { ...state.profile, playedRoles },
    settings: { ...state.settings, additionalRoles },
  };
}
