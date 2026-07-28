import { ROLES, TEAM_SIDES, type DraftState, type PickerTarget, type Role, type TeamSide, type ValidationResult } from "./types";

export function findPick(
  draft: DraftState,
  championId: string,
): { side: TeamSide; role: Role } | undefined {
  for (const side of TEAM_SIDES) {
    for (const role of ROLES) {
      if (draft.picks[side][role] === championId) return { side, role };
    }
  }
  return undefined;
}

export function isBanned(draft: DraftState, championId: string): boolean {
  return TEAM_SIDES.some((side) => draft.bans[side].includes(championId));
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
        reason: `Já selecionado em ${pickedAt.side === "ally" ? "Meu time" : "Time inimigo"} · ${pickedAt.role}`,
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
      reason: `Selecionado em ${pickedAt.side === "ally" ? "Meu time" : "Time inimigo"} · ${pickedAt.role}`,
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
    next.picks[validation.pickedAt.side][validation.pickedAt.role] = null;
  }
  next.bans[side][index] = championId;
  return next;
}

export function hasDraftContent(draft: DraftState): boolean {
  return (
    TEAM_SIDES.some((side) => ROLES.some((role) => draft.picks[side][role] !== null)) ||
    TEAM_SIDES.some((side) => draft.bans[side].some(Boolean))
  );
}

export function swapTeams(draft: DraftState): DraftState {
  return {
    picks: { ally: structuredClone(draft.picks.enemy), enemy: structuredClone(draft.picks.ally) },
    bans: { ally: [...draft.bans.enemy], enemy: [...draft.bans.ally] },
  };
}

