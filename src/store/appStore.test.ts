import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultPersistedState } from "../domain/defaults";
import { assignPick } from "../domain/draftValidation";
import type { LcuDraftSnapshot } from "../domain/types";
import { championId, champions } from "../test/fixtures";
import { useAppStore } from "./appStore";

function snapshot(): LcuDraftSnapshot {
  return {
    sessionKey: "store-session",
    phase: "BAN_PICK",
    sequence: 1,
    allyPicks: [{ championId: championId("Vi"), role: "JG" }],
    enemyPicks: [championId("Aurora")],
    bans: { ally: [championId("Ashe")], enemy: [] },
    unknownChampionIds: [],
  };
}

describe("sincronização na store", () => {
  beforeEach(() => {
    useAppStore.setState({
      ...createDefaultPersistedState(),
      champions,
      hydrated: true,
      recoveredState: false,
      lcuStatus: { state: "disabled", message: null },
      lcuUnknownChampionIds: [],
    });
  });

  it("ignora snapshots quando a sincronização está desativada", () => {
    useAppStore.getState().setSetting("syncWithLeagueClient", false);
    useAppStore.getState().applyLcuSnapshot(snapshot());
    expect(useAppStore.getState().draft.syncSessionKey).toBeNull();
    expect(useAppStore.getState().draft.unassignedPicks.enemy).toEqual([]);
  });

  it("preserva o modo manual e aplica snapshots quando ativada", () => {
    const manual = assignPick(
      createDefaultPersistedState().draft,
      "ally",
      "MID",
      championId("Ahri"),
    );
    manual.syncSessionKey = "store-session";
    useAppStore.setState({ draft: manual });
    useAppStore.getState().applyLcuSnapshot(snapshot());

    const draft = useAppStore.getState().draft;
    expect(draft.picks.ally.MID).toBe(championId("Ahri"));
    expect(draft.picks.ally.JG).toBe(championId("Vi"));
    expect(draft.unassignedPicks.enemy[0]?.championId).toBe(championId("Aurora"));
    expect(draft.bans.ally).toContain(championId("Ashe"));
  });
});
