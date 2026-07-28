import { describe, expect, it } from "vitest";
import { normalizeSearch, searchChampions } from "./search";
import { champions } from "../test/fixtures";

describe("busca de campeões", () => {
  it("normaliza acentos, espaços, hífens e apóstrofos", () => {
    expect(normalizeSearch(" Kai’Sa ")).toBe("kaisa");
    expect(normalizeSearch("Cho'Gath")).toBe("chogath");
    expect(normalizeSearch("K'Sante")).toBe("ksante");
    expect(normalizeSearch("Le-Blanc")).toBe("leblanc");
  });

  it.each([
    ["ww", "Warwick"],
    ["noc", "Nocturne"],
    ["tk", "Tahm Kench"],
    ["morde", "Mordekaiser"],
    ["kaisa", "Kai'Sa"],
  ])("resolve o alias %s para %s", (alias, expectedName) => {
    expect(searchChampions(champions, alias)[0]?.name).toBe(expectedName);
  });
});

