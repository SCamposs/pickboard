import { describe, expect, it } from "vitest";
import { createEmptyDraft } from "./defaults";
import { assignBan, assignPick, validateChampionForTarget } from "./draftValidation";
import { championId } from "../test/fixtures";

describe("validação de picks e bans", () => {
  it("impede pick duplicado entre todos os slots", () => {
    const mordekaiser = championId("Mordekaiser");
    const draft = assignPick(createEmptyDraft(), "ally", "TOP", mordekaiser);
    const validation = validateChampionForTarget(draft, mordekaiser, {
      kind: "pick",
      side: "enemy",
      role: "MID",
    });
    expect(validation.allowed).toBe(false);
    expect(validation.pickedAt).toEqual({ side: "ally", role: "TOP" });
  });

  it("bloqueia um campeão banido em qualquer pick", () => {
    const caitlyn = championId("Caitlyn");
    const draft = assignBan(createEmptyDraft(), "ally", 0, caitlyn);
    expect(
      validateChampionForTarget(draft, caitlyn, {
        kind: "pick",
        side: "enemy",
        role: "ADC",
      }),
    ).toMatchObject({ allowed: false, reason: "Banido neste draft" });
  });

  it("permite o mesmo ban uma vez em cada lado", () => {
    const ashe = championId("Ashe");
    const firstBan = assignBan(createEmptyDraft(), "ally", 0, ashe);
    const validation = validateChampionForTarget(firstBan, ashe, {
      kind: "ban",
      side: "enemy",
      index: 0,
    });
    expect(validation.allowed).toBe(true);
    expect(() => assignBan(firstBan, "enemy", 0, ashe)).not.toThrow();
  });

  it("bloqueia ban repetido no mesmo lado", () => {
    const ashe = championId("Ashe");
    const firstBan = assignBan(createEmptyDraft(), "ally", 0, ashe);
    const validation = validateChampionForTarget(firstBan, ashe, {
      kind: "ban",
      side: "ally",
      index: 1,
    });
    expect(validation.allowed).toBe(false);
    expect(validation.reason).toContain("Já banido");
  });

  it("exige remoção explícita antes de banir um pick", () => {
    const jax = championId("Jax");
    const draft = assignPick(createEmptyDraft(), "enemy", "TOP", jax);
    const validation = validateChampionForTarget(draft, jax, {
      kind: "ban",
      side: "ally",
      index: 0,
    });
    expect(validation).toMatchObject({
      allowed: false,
      requiresPickRemoval: true,
      pickedAt: { side: "enemy", role: "TOP" },
    });
  });
});

