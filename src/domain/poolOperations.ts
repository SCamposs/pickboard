import { POOL_TIERS, type PoolTier, type Pools, type Role } from "./types";

export function placeChampionInPool(
  pools: Pools,
  role: Role,
  tier: PoolTier,
  championId: string,
  index?: number,
): Pools {
  const next = structuredClone(pools);
  for (const currentTier of POOL_TIERS) {
    next[role][currentTier] = next[role][currentTier].filter((id) => id !== championId);
  }
  const target = next[role][tier];
  const insertAt = index === undefined ? target.length : Math.max(0, Math.min(index, target.length));
  target.splice(insertAt, 0, championId);
  return next;
}

export function removeChampionFromPool(
  pools: Pools,
  role: Role,
  championId: string,
): Pools {
  const next = structuredClone(pools);
  for (const tier of POOL_TIERS) {
    next[role][tier] = next[role][tier].filter((id) => id !== championId);
  }
  return next;
}

export function reorderPoolTier(
  pools: Pools,
  role: Role,
  tier: PoolTier,
  championId: string,
  overChampionId: string,
): Pools {
  const next = structuredClone(pools);
  const items = next[role][tier];
  const from = items.indexOf(championId);
  const to = items.indexOf(overChampionId);
  if (from < 0 || to < 0 || from === to) return pools;
  items.splice(to, 0, items.splice(from, 1)[0]);
  return next;
}

