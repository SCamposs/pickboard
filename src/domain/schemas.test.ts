import { describe, expect, it } from "vitest";
import { createDefaultPersistedState } from "./defaults";
import { hydratePersistedState } from "./schemas";

describe("persistência versionada", () => {
  it("recupera estado inválido com defaults íntegros", () => {
    const result = hydratePersistedState({ schemaVersion: 2, draft: "corrompido" });
    expect(result.recovered).toBe(true);
    expect(result.state.schemaVersion).toBe(2);
    expect(result.state.settings.primaryRole).toBe("ADC");
    expect(result.state.draft.picks.ally.TOP).toBeNull();
  });

  it("migra schema 0 preservando preferências compatíveis", () => {
    const current = createDefaultPersistedState();
    const legacy = {
      championDataVersion: current.championDataVersion,
      draft: { picks: current.draft.picks, bans: current.draft.bans },
      pools: current.pools,
      profile: current.profile,
      schemaVersion: 0,
      settings: {
        primaryRole: current.settings.primaryRole,
        additionalRoles: current.settings.additionalRoles,
        alwaysOnTop: current.settings.alwaysOnTop,
        clearDraftOnStart: current.settings.clearDraftOnStart,
        compactMode: true,
      },
    };
    const result = hydratePersistedState(legacy);
    expect(result.recovered).toBe(true);
    expect(result.state.schemaVersion).toBe(2);
    expect(result.state.settings.compactMode).toBe(true);
    expect(result.state.settings.syncWithLeagueClient).toBe(true);
  });

  it("migra schema 1 preservando picks antigos como manuais", () => {
    const current = createDefaultPersistedState();
    current.draft.picks.enemy.MID = "Ahri";
    const settings = {
      primaryRole: current.settings.primaryRole,
      additionalRoles: current.settings.additionalRoles,
      alwaysOnTop: current.settings.alwaysOnTop,
      compactMode: current.settings.compactMode,
      clearDraftOnStart: current.settings.clearDraftOnStart,
    };
    const legacy = {
      schemaVersion: 1,
      championDataVersion: current.championDataVersion,
      draft: { picks: current.draft.picks, bans: current.draft.bans },
      pools: current.pools,
      profile: current.profile,
      settings,
    };
    const result = hydratePersistedState(legacy);
    expect(result.recovered).toBe(true);
    expect(result.state.draft.picks.enemy.MID).toBe("Ahri");
    expect(result.state.draft.pickSources.enemy.MID).toBe("manual");
    expect(result.state.draft.unassignedPicks.enemy).toEqual([]);
  });
});
