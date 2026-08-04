import { createEmptyDraft } from "./defaults";
import { findPick } from "./draftValidation";
import {
  ROLES,
  TEAM_SIDES,
  type DraftEntrySource,
  type DraftState,
  type LcuDraftSnapshot,
  type Role,
  type TeamSide,
  type UnassignedPick,
} from "./types";

function removeChampionFromPicks(draft: DraftState, championId: string): void {
  for (const side of TEAM_SIDES) {
    for (const role of ROLES) {
      if (draft.picks[side][role] === championId) {
        draft.picks[side][role] = null;
        draft.pickSources[side][role] = null;
      }
    }
    draft.unassignedPicks[side] = draft.unassignedPicks[side].filter(
      (pick) => pick.championId !== championId,
    );
  }
}

function removeChampionFromBans(draft: DraftState, championId: string): void {
  for (const side of TEAM_SIDES) {
    for (let index = 0; index < draft.bans[side].length; index += 1) {
      if (draft.bans[side][index] === championId) {
        draft.bans[side][index] = null;
        draft.banSources[side][index] = null;
      }
    }
  }
}

function addUnassigned(
  draft: DraftState,
  side: TeamSide,
  championId: string,
  source: DraftEntrySource,
): void {
  if (findPick(draft, championId)) return;
  draft.unassignedPicks[side].push({ championId, source });
}

function moveRoleOccupantToUnassigned(draft: DraftState, side: TeamSide, role: Role): void {
  const occupant = draft.picks[side][role];
  if (!occupant) return;
  const source = draft.pickSources[side][role] ?? "manual";
  draft.picks[side][role] = null;
  draft.pickSources[side][role] = null;
  addUnassigned(draft, side, occupant, source);
}

export function assignUnassignedPickToRole(
  draft: DraftState,
  side: TeamSide,
  championId: string,
  role: Role,
): DraftState {
  const next = structuredClone(draft);
  const location = findPick(next, championId);
  if (!location || location.side !== side) return next;
  const source = location.role
    ? (next.pickSources[side][location.role] ?? "manual")
    : (next.unassignedPicks[side].find((pick) => pick.championId === championId)?.source ??
      "manual");

  if (location.role) {
    next.picks[side][location.role] = null;
    next.pickSources[side][location.role] = null;
  } else {
    next.unassignedPicks[side] = next.unassignedPicks[side].filter(
      (pick) => pick.championId !== championId,
    );
  }
  moveRoleOccupantToUnassigned(next, side, role);
  next.picks[side][role] = championId;
  next.pickSources[side][role] = source;
  return next;
}

export function returnRolePickToUnassigned(
  draft: DraftState,
  side: TeamSide,
  role: Role,
): DraftState {
  const next = structuredClone(draft);
  moveRoleOccupantToUnassigned(next, side, role);
  return next;
}

function removeStaleLcuEntries(draft: DraftState, snapshot: LcuDraftSnapshot): void {
  const enemyIds = new Set(snapshot.enemyPicks);
  for (const role of ROLES) {
    if (draft.pickSources.ally[role] === "lcu") {
      draft.picks.ally[role] = null;
      draft.pickSources.ally[role] = null;
    }
    const enemyChampion = draft.picks.enemy[role];
    if (
      draft.pickSources.enemy[role] === "lcu" &&
      enemyChampion &&
      !enemyIds.has(enemyChampion)
    ) {
      draft.picks.enemy[role] = null;
      draft.pickSources.enemy[role] = null;
    }
  }
  draft.unassignedPicks.ally = draft.unassignedPicks.ally.filter(
    (pick) => pick.source !== "lcu",
  );
  draft.unassignedPicks.enemy = draft.unassignedPicks.enemy.filter(
    (pick) => pick.source !== "lcu" || enemyIds.has(pick.championId),
  );
  for (const side of TEAM_SIDES) {
    for (let index = 0; index < 5; index += 1) {
      if (draft.banSources[side][index] === "lcu") {
        draft.bans[side][index] = null;
        draft.banSources[side][index] = null;
      }
    }
  }
}

function placeSyncedAlly(draft: DraftState, championId: string, role: Role | null): void {
  removeChampionFromBans(draft, championId);
  removeChampionFromPicks(draft, championId);
  if (!role) {
    addUnassigned(draft, "ally", championId, "lcu");
    return;
  }
  moveRoleOccupantToUnassigned(draft, "ally", role);
  draft.picks.ally[role] = championId;
  draft.pickSources.ally[role] = "lcu";
}

function placeSyncedEnemy(draft: DraftState, championId: string): void {
  removeChampionFromBans(draft, championId);
  const existing = findPick(draft, championId);
  if (existing?.side === "enemy" && existing.role) {
    draft.pickSources.enemy[existing.role] = "lcu";
    return;
  }
  if (existing?.side === "enemy" && existing.role === null) {
    const pick = draft.unassignedPicks.enemy.find((item) => item.championId === championId);
    if (pick) pick.source = "lcu";
    return;
  }
  removeChampionFromPicks(draft, championId);
  addUnassigned(draft, "enemy", championId, "lcu");
}

function mergeSyncedBans(draft: DraftState, side: TeamSide, incoming: string[]): void {
  const uniqueIncoming = [...new Set(incoming)].filter((championId) => !findPick(draft, championId));
  const manual: UnassignedPick[] = [];
  for (let index = 0; index < 5; index += 1) {
    const championId = draft.bans[side][index];
    if (
      championId &&
      draft.banSources[side][index] !== "lcu" &&
      !uniqueIncoming.includes(championId) &&
      !findPick(draft, championId)
    ) {
      manual.push({ championId, source: "manual" });
    }
  }
  const merged = [
    ...uniqueIncoming.map((championId) => ({ championId, source: "lcu" as const })),
    ...manual,
  ].slice(0, 5);
  draft.bans[side] = Array.from({ length: 5 }, (_, index) => merged[index]?.championId ?? null);
  draft.banSources[side] = Array.from({ length: 5 }, (_, index) => merged[index]?.source ?? null);
}

export function applyLcuSnapshot(draft: DraftState, snapshot: LcuDraftSnapshot): DraftState {
  const next =
    draft.syncSessionKey === snapshot.sessionKey ? structuredClone(draft) : createEmptyDraft();
  next.syncSessionKey = snapshot.sessionKey;
  removeStaleLcuEntries(next, snapshot);

  for (const pick of snapshot.allyPicks) {
    placeSyncedAlly(next, pick.championId, pick.role);
  }
  for (const championId of [...new Set(snapshot.enemyPicks)]) {
    placeSyncedEnemy(next, championId);
  }
  mergeSyncedBans(next, "ally", snapshot.bans.ally);
  mergeSyncedBans(next, "enemy", snapshot.bans.enemy);
  return next;
}
