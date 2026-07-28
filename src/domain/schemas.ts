import { z } from "zod";
import { createDefaultPersistedState } from "./defaults";
import { POOL_TIERS, ROLES, TEAM_SIDES, type PersistedState } from "./types";

const roleSchema = z.enum(ROLES);
const teamSideSchema = z.enum(TEAM_SIDES);
const championIdSchema = z.string().min(1);
const optionalChampionSchema = championIdSchema.nullable();

const teamPicksSchema = z.object(
  Object.fromEntries(ROLES.map((role) => [role, optionalChampionSchema])) as Record<
    (typeof ROLES)[number],
    typeof optionalChampionSchema
  >,
);

const draftSchema = z.object({
  picks: z.record(teamSideSchema, teamPicksSchema),
  bans: z.record(teamSideSchema, z.array(optionalChampionSchema).length(5)),
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

export const persistedStateSchema = z.object({
  schemaVersion: z.literal(1),
  championDataVersion: z.string().min(1),
  draft: draftSchema,
  pools: poolsSchema,
  profile: z.object({
    playedRoles: z.array(roleSchema),
    recommendationPreferences: z.string(),
    setupCompleted: z.boolean(),
  }),
  settings: z.object({
    primaryRole: roleSchema,
    additionalRoles: z.array(roleSchema),
    alwaysOnTop: z.boolean(),
    compactMode: z.boolean(),
    clearDraftOnStart: z.boolean(),
  }),
});

export interface HydratedStateResult {
  state: PersistedState;
  recovered: boolean;
}

export function hydratePersistedState(raw: unknown): HydratedStateResult {
  const parsed = persistedStateSchema.safeParse(raw);
  if (parsed.success) {
    return { state: sanitizeState(parsed.data), recovered: false };
  }

  if (typeof raw === "object" && raw !== null && "schemaVersion" in raw) {
    const legacy = raw as Omit<Partial<PersistedState>, "schemaVersion"> & {
      schemaVersion?: unknown;
    };
    if (legacy.schemaVersion === 0) {
      const defaults = createDefaultPersistedState();
      const migrated = persistedStateSchema.safeParse({
        ...defaults,
        ...legacy,
        schemaVersion: 1,
        settings: { ...defaults.settings, ...(legacy.settings ?? {}) },
        profile: { ...defaults.profile, ...(legacy.profile ?? {}) },
      });
      if (migrated.success) {
        return { state: sanitizeState(migrated.data), recovered: true };
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

  return {
    ...state,
    pools: sanitizedPools,
    profile: { ...state.profile, playedRoles },
    settings: { ...state.settings, additionalRoles },
  };
}
