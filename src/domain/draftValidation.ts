import {
  ROLES,
  TEAM_SIDES,
  type DraftEntrySource,
  type DraftState,
  type PickerTarget,
  type Role,
  type TeamSide,
  type ValidationResult,
} from "./types";

export function findPick(
  draft: DraftState,
  championId: string,
): { side: TeamSide; role: Role | null } | undefined {
  for (const side of TEAM_SIDES) {
    for (const role of ROLES) {
      if (draft.picks[side][role] === championId) return { side, role };
    }
  }
  for (const side of TEAM_SIDES) {
    if (draft.unassignedPicks[side].some((pick) => pick.championId === championId)) {
      return { side, role: null };
    }
  }
  return undefined;
}

export function isBanned(draft: DraftState, championId: string): boolean {
  return TEAM_SIDES.some((side) => draft.bans[side].includes(championId));
}

function pickLocationLabel(side: TeamSide, role: Role | null): string {
  const team = side === "ally" ? "Meu time" : "Time inimigo";
  return role ? `${team} · ${role}` : `${team} · Sem posição`;
}

export function validateChampionForTarget(
  draft: DraftState,
  championId: string,
  target: PickerTarget,
): ValidationResult {
  const pickedAt = findPick(draft, championId);
  if (target.kind === "pick") {
    if (pickedAt) {
      return {
        allowed: false,
        reason: `Já selecionado em ${pickLocationLabel(pickedAt.side, pickedAt.role)}`,
        pickedAt,
      };
    }
    if (isBanned(draft, championId)) {
      return { allowed: false, reason: "Banido neste draft" };
    }
    return { allowed: true };
  }

  if (draft.bans[target.side].includes(championId)) {
    return {
      allowed: false,
      reason: `Já banido por ${target.side === "ally" ? "Meu time" : "Time inimigo"}`,
    };
  }
  if (pickedAt) {
    return {
      allowed: false,
      reason: `Selecionado em ${pickLocationLabel(pickedAt.side, pickedAt.role)}`,
      pickedAt,
      requiresPickRemoval: true,
    };
  }
  return { allowed: true };
}

export function assignPick(
  draft: DraftState,
  side: TeamSide,
  role: Role,
  championId: string,
): DraftState {
  const validation = validateChampionForTarget(draft, championId, { kind: "pick", side, role });
  if (!validation.allowed) throw new Error(validation.reason);
  return {
    ...draft,
    picks: {
      ...draft.picks,
      [side]: { ...draft.picks[side], [role]: championId },
    },
    pickSources: {
      ...draft.pickSources,
      [side]: { ...draft.pickSources[side], [role]: "manual" },
    },
  };
}

export function assignBan(
  draft: DraftState,
  side: TeamSide,
  index: number,
  championId: string,
  removeExistingPick = false,
): DraftState {
  const validation = validateChampionForTarget(draft, championId, { kind: "ban", side, index });
  if (!validation.allowed && !(validation.requiresPickRemoval && removeExistingPick)) {
    throw new Error(validation.reason);
  }
  const next = structuredClone(draft);
  if (validation.pickedAt && removeExistingPick) {
    if (validation.pickedAt.role) {
      next.picks[validation.pickedAt.side][validation.pickedAt.role] = null;
      next.pickSources[validation.pickedAt.side][validation.pickedAt.role] = null;
    } else {
      next.unassignedPicks[validation.pickedAt.side] = next.unassignedPicks[
        validation.pickedAt.side
      ].filter((pick) => pick.championId !== championId);
    }
  }
  next.bans[side][index] = championId;
  next.banSources[side][index] = "manual";
  return next;
}

export function hasDraftContent(draft: DraftState): boolean {
  return (
    TEAM_SIDES.some((side) => ROLES.some((role) => draft.picks[side][role] !== null)) ||
    TEAM_SIDES.some((side) => draft.unassignedPicks[side].length > 0) ||
    TEAM_SIDES.some((side) => draft.bans[side].some(Boolean))
  );
}

function asManualPickSources(
  picks: Record<Role, string | null>,
): Record<Role, DraftEntrySource | null> {
  return Object.fromEntries(
    ROLES.map((role) => [role, picks[role] ? "manual" : null]),
  ) as Record<Role, DraftEntrySource | null>;
}

export function swapTeams(draft: DraftState): DraftState {
  return {
    picks: { ally: structuredClone(draft.picks.enemy), enemy: structuredClone(draft.picks.ally) },
    bans: { ally: [...draft.bans.enemy], enemy: [...draft.bans.ally] },
    pickSources: {
      ally: asManualPickSources(draft.picks.enemy),
      enemy: asManualPickSources(draft.picks.ally),
    },
    banSources: {
      ally: draft.bans.enemy.map((championId) => (championId ? "manual" : null)),
      enemy: draft.bans.ally.map((championId) => (championId ? "manual" : null)),
    },
    unassignedPicks: {
      ally: draft.unassignedPicks.enemy.map((pick) => ({ ...pick, source: "manual" })),
      enemy: draft.unassignedPicks.ally.map((pick) => ({ ...pick, source: "manual" })),
    },
    syncSessionKey: draft.syncSessionKey,
  };
}
