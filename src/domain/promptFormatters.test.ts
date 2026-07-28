import { describe, expect, it } from "vitest";
import { createEmptyDraft } from "./defaults";
import {
  formatAllPools,
  formatDraftPrompt,
  formatInitialPrompt,
  formatRolePool,
} from "./promptFormatters";
import { champions, defaultPools, populatedDraft } from "../test/fixtures";

describe("formatDraftPrompt", () => {
  it("formata o draft completo no contrato definido", () => {
    const prompt = formatDraftPrompt({
      draft: populatedDraft(),
      primaryRole: "ADC",
      additionalRoles: ["SUP"],
      champions,
    });
    expect(prompt).toContain("ESTOU JOGANDO DE: ADC\nRECOMENDAR TAMBÉM: SUP");
    expect(prompt).toContain("MEU TIME:\nTOP: Mordekaiser\nJG: Nocturne");
    expect(prompt).toContain("BANS: Caitlyn, Draven");
    expect(prompt).toContain("TIME INIMIGO:\nTOP: Jax\nJG: Briar");
    expect(prompt).toContain("BANS: Vayne, Ashe");
    expect(prompt).toContain("\nINSTRUÇÃO:\nResponda imediatamente.");
  });

  it("lista todas as posições vazias como OPEN", () => {
    const prompt = formatDraftPrompt({
      draft: createEmptyDraft(),
      primaryRole: "ADC",
      additionalRoles: ["SUP"],
      champions,
    });
    expect(prompt.match(/: OPEN/g)).toHaveLength(10);
  });

  it("usa NENHUM quando não existem bans", () => {
    const prompt = formatDraftPrompt({
      draft: createEmptyDraft(),
      primaryRole: "ADC",
      additionalRoles: ["SUP"],
      champions,
    });
    expect(prompt.match(/BANS: NENHUM/g)).toHaveLength(2);
  });

  it("usa NENHUMA quando não há função adicional", () => {
    const prompt = formatDraftPrompt({
      draft: createEmptyDraft(),
      primaryRole: "JG",
      additionalRoles: [],
      champions,
    });
    expect(prompt).toContain("RECOMENDAR TAMBÉM: NENHUMA");
  });

  it("formata várias funções adicionais", () => {
    const prompt = formatDraftPrompt({
      draft: createEmptyDraft(),
      primaryRole: "ADC",
      additionalRoles: ["SUP", "JG"],
      champions,
    });
    expect(prompt).toContain("RECOMENDAR TAMBÉM: SUP, JG");
  });
});

describe("formatadores de pool", () => {
  it("formata uma pool com as quatro categorias", () => {
    const prompt = formatRolePool("ADC", defaultPools(), champions);
    expect(prompt).toContain("ATUALIZAÇÃO DA MINHA POOL DE ADC:");
    expect(prompt).toContain("PRINCIPAIS:\nJinx, Caitlyn, Vayne");
    expect(prompt).toContain("BONS:\nEzreal, Sivir");
    expect(prompt).toContain("SITUACIONAIS:\nXayah, Senna, Jhin");
    expect(prompt).toContain("EVITAR:\nTristana, Draven, Kalista, Miss Fortune");
  });

  it("formata todas as pools somente para funções jogadas", () => {
    const prompt = formatAllPools(["ADC"], defaultPools(), champions);
    expect(prompt).toContain("ATUALIZAÇÃO COMPLETA DAS MINHAS POOLS:");
    expect(prompt).toContain("POOL DE ADC");
    expect(prompt).not.toContain("POOL DE JG");
  });

  it("gera o prompt inicial a partir das configurações reais", () => {
    const prompt = formatInitialPrompt({
      playedRoles: ["ADC", "JG"],
      pools: defaultPools(),
      preferences: "- Minha preferência personalizada.",
      champions,
    });
    expect(prompt).toContain("FUNÇÕES QUE EU JOGO:\nADC, JG");
    expect(prompt).toContain("ATUALIZAÇÃO DA MINHA POOL DE ADC");
    expect(prompt).toContain("ATUALIZAÇÃO DA MINHA POOL DE JG");
    expect(prompt).toContain("- Minha preferência personalizada.");
    expect(prompt).not.toContain("MEU TIME:");
  });
});

