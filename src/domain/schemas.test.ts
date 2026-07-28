import { describe, expect, it } from "vitest";
import { createDefaultPersistedState } from "./defaults";
import { hydratePersistedState } from "./schemas";

describe("persistência versionada", () => {
  it("recupera estado inválido com defaults íntegros", () => {
    const result = hydratePersistedState({ schemaVersion: 1, draft: "corrompido" });
    expect(result.recovered).toBe(true);
    expect(result.state.schemaVersion).toBe(1);
    expect(result.state.settings.primaryRole).toBe("ADC");
    expect(result.state.draft.picks.ally.TOP).toBeNull();
  });

  it("migra schema 0 preservando preferências compatíveis", () => {
    const legacy = {
      ...createDefaultPersistedState(),
      schemaVersion: 0,
      settings: {
        ...createDefaultPersistedState().settings,
        compactMode: true,
      },
    };
    const result = hydratePersistedState(legacy);
    expect(result.recovered).toBe(true);
    expect(result.state.schemaVersion).toBe(1);
    expect(result.state.settings.compactMode).toBe(true);
  });
});

