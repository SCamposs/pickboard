import { describe, expect, it } from "vitest";
import { championId } from "../test/fixtures";
import { createEmptyDraft } from "./defaults";
import { assignBan, assignPick } from "./draftValidation";
import {
  applyLcuSnapshot,
  assignUnassignedPickToRole,
  returnRolePickToUnassigned,
} from "./lcuReconciliation";
import type { LcuDraftSnapshot } from "./types";

function snapshot(overrides: Partial<LcuDraftSnapshot> = {}): LcuDraftSnapshot {
  return {
    sessionKey: "session-1",
    phase: "BAN_PICK",
    sequence: 1,
    allyPicks: [],
    enemyPicks: [],
    bans: { ally: [], enemy: [] },
    unknownChampionIds: [],
    ...overrides,
  };
}

describe("reconciliação de snapshots da LCU", () => {
  it("inicia uma sessão limpando o draft anterior uma única vez", () => {
    const oldDraft = assignPick(createEmptyDraft(), "ally", "TOP", championId("Jax"));
    const first = applyLcuSnapshot(
      oldDraft,
      snapshot({ allyPicks: [{ championId: championId("Vi"), role: "JG" }] }),
    );
    expect(first.picks.ally.TOP).toBeNull();
    expect(first.picks.ally.JG).toBe(championId("Vi"));

    const manuallyExtended = assignPick(first, "ally", "MID", championId("Ahri"));
    const repeated = applyLcuSnapshot(
      manuallyExtended,
      snapshot({ sequence: 2, allyPicks: [{ championId: championId("Vi"), role: "JG" }] }),
    );
    expect(repeated.picks.ally.MID).toBe(championId("Ahri"));
  });

  it("mantém inimigos detectados sem posição", () => {
    const result = applyLcuSnapshot(
      createEmptyDraft(),
      snapshot({ enemyPicks: [championId("Aurora"), championId("Smolder")] }),
    );
    expect(result.unassignedPicks.enemy.map((pick) => pick.championId)).toEqual([
      championId("Aurora"),
      championId("Smolder"),
    ]);
    expect(Object.values(result.picks.enemy).every((pick) => pick === null)).toBe(true);
  });

  it("atribui e devolve uma posição inimiga manualmente", () => {
    const detected = applyLcuSnapshot(
      createEmptyDraft(),
      snapshot({ enemyPicks: [championId("Aurora")] }),
    );
    const assigned = assignUnassignedPickToRole(detected, "enemy", championId("Aurora"), "MID");
    expect(assigned.picks.enemy.MID).toBe(championId("Aurora"));
    expect(assigned.pickSources.enemy.MID).toBe("lcu");
    expect(assigned.unassignedPicks.enemy).toEqual([]);

    const returned = returnRolePickToUnassigned(assigned, "enemy", "MID");
    expect(returned.picks.enemy.MID).toBeNull();
    expect(returned.unassignedPicks.enemy[0]).toEqual({
      championId: championId("Aurora"),
      source: "lcu",
    });
  });

  it("move o ocupante da posição para sem posição sem perder dados", () => {
    const detected = applyLcuSnapshot(
      createEmptyDraft(),
      snapshot({ enemyPicks: [championId("Aurora"), championId("Smolder")] }),
    );
    const first = assignUnassignedPickToRole(detected, "enemy", championId("Aurora"), "MID");
    const second = assignUnassignedPickToRole(first, "enemy", championId("Smolder"), "MID");
    expect(second.picks.enemy.MID).toBe(championId("Smolder"));
    expect(second.unassignedPicks.enemy.map((pick) => pick.championId)).toContain(
      championId("Aurora"),
    );
  });

  it("preserva a posição estimada durante snapshots da mesma sessão", () => {
    const detected = applyLcuSnapshot(
      createEmptyDraft(),
      snapshot({ enemyPicks: [championId("Aurora")] }),
    );
    const assigned = assignUnassignedPickToRole(detected, "enemy", championId("Aurora"), "SUP");
    const refreshed = applyLcuSnapshot(
      assigned,
      snapshot({ sequence: 2, enemyPicks: [championId("Aurora")] }),
    );
    expect(refreshed.picks.enemy.SUP).toBe(championId("Aurora"));
  });

  it("remove campeão detectado que desapareceu do snapshot", () => {
    const detected = applyLcuSnapshot(
      createEmptyDraft(),
      snapshot({ enemyPicks: [championId("Aurora")] }),
    );
    const assigned = assignUnassignedPickToRole(detected, "enemy", championId("Aurora"), "TOP");
    const refreshed = applyLcuSnapshot(assigned, snapshot({ sequence: 2 }));
    expect(refreshed.picks.enemy.TOP).toBeNull();
    expect(refreshed.unassignedPicks.enemy).toEqual([]);
  });

  it("funde um pick manual quando o mesmo campeão é detectado", () => {
    const manual = assignPick(createEmptyDraft(), "enemy", "ADC", championId("Smolder"));
    manual.syncSessionKey = "session-1";
    const result = applyLcuSnapshot(
      manual,
      snapshot({ enemyPicks: [championId("Smolder")] }),
    );
    expect(result.picks.enemy.ADC).toBe(championId("Smolder"));
    expect(result.pickSources.enemy.ADC).toBe("lcu");
    expect(result.unassignedPicks.enemy).toEqual([]);
  });

  it("deduplica snapshots e bans repetidos", () => {
    const data = snapshot({
      enemyPicks: [championId("Aurora"), championId("Aurora")],
      bans: { ally: [championId("Ashe"), championId("Ashe")], enemy: [] },
    });
    const first = applyLcuSnapshot(createEmptyDraft(), data);
    const second = applyLcuSnapshot(first, { ...data, sequence: 2 });
    expect(second.unassignedPicks.enemy).toHaveLength(1);
    expect(second.bans.ally.filter(Boolean)).toEqual([championId("Ashe")]);
  });

  it("prioriza pick confirmado sobre ban manual conflitante", () => {
    const banned = assignBan(createEmptyDraft(), "ally", 0, championId("Vi"));
    banned.syncSessionKey = "session-1";
    const result = applyLcuSnapshot(
      banned,
      snapshot({ allyPicks: [{ championId: championId("Vi"), role: "JG" }] }),
    );
    expect(result.picks.ally.JG).toBe(championId("Vi"));
    expect(result.bans.ally).not.toContain(championId("Vi"));
  });

  it("preserva edição manual quando a conexão apenas muda de estado", () => {
    const manual = assignPick(createEmptyDraft(), "ally", "MID", championId("Ahri"));
    const disconnected = structuredClone(manual);
    expect(disconnected).toEqual(manual);
  });
});
