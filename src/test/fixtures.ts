import snapshot from "../data/champions.json";
import { createDefaultPools, createEmptyDraft } from "../domain/defaults";
import type { Champion, DraftState, Pools } from "../domain/types";

export const champions = snapshot.champions.map((champion) => ({
  ...champion,
  source: "embedded" as const,
})) satisfies Champion[];

export function championId(name: string): string {
  const champion = champions.find((item) => item.name === name);
  if (!champion) throw new Error(`Campeão ausente no fixture: ${name}`);
  return champion.id;
}

export function populatedDraft(): DraftState {
  const draft = createEmptyDraft();
  draft.picks.ally.TOP = championId("Mordekaiser");
  draft.picks.ally.JG = championId("Nocturne");
  draft.picks.ally.SUP = championId("Pantheon");
  draft.picks.enemy.TOP = championId("Jax");
  draft.picks.enemy.JG = championId("Briar");
  draft.picks.enemy.MID = championId("Katarina");
  draft.picks.enemy.ADC = championId("Yunara");
  draft.picks.enemy.SUP = championId("Morgana");
  draft.bans.ally[0] = championId("Caitlyn");
  draft.bans.ally[1] = championId("Draven");
  draft.bans.enemy[0] = championId("Vayne");
  draft.bans.enemy[1] = championId("Ashe");
  return draft;
}

export function defaultPools(): Pools {
  return createDefaultPools();
}

