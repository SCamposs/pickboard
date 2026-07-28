import { POOL_TIER_LABELS } from "./constants";
import { POOL_TIERS, ROLES, type Champion, type DraftState, type Pools, type Role } from "./types";

const DRAFT_INSTRUCTION =
  "Responda imediatamente. Na primeira linha, informe apenas o melhor pick para cada função pedida. Depois, use no máximo 2 linhas de justificativa. Priorize matchup de lane, meta atual, minha pool e as duas composições. Não recomende uma lane inviável apenas por scaling.";

function createChampionNameResolver(champions: Champion[]): (id: string | null) => string {
  const names = new Map(champions.map((champion) => [champion.id, champion.name]));
  return (id) => (id ? (names.get(id) ?? id) : "OPEN");
}

export function formatDraftPrompt(input: {
  draft: DraftState;
  primaryRole: Role;
  additionalRoles: Role[];
  champions: Champion[];
}): string {
  const nameOf = createChampionNameResolver(input.champions);
  const formatTeam = (side: "ally" | "enemy", label: string): string => {
    const picks = ROLES.map((role) => `${role}: ${nameOf(input.draft.picks[side][role])}`);
    const bans = input.draft.bans[side].filter((id): id is string => Boolean(id)).map(nameOf);
    return `${label}:\n${picks.join("\n")}\nBANS: ${bans.length ? bans.join(", ") : "NENHUM"}`;
  };

  return [
    `ESTOU JOGANDO DE: ${input.primaryRole}`,
    `RECOMENDAR TAMBÉM: ${input.additionalRoles.length ? input.additionalRoles.join(", ") : "NENHUMA"}`,
    "",
    formatTeam("ally", "MEU TIME"),
    "",
    formatTeam("enemy", "TIME INIMIGO"),
    "",
    "INSTRUÇÃO:",
    DRAFT_INSTRUCTION,
  ].join("\n");
}

export function formatRolePool(
  role: Role,
  pools: Pools,
  champions: Champion[],
  includeClosingInstruction = true,
): string {
  const nameOf = createChampionNameResolver(champions);
  const sections = POOL_TIERS.map((tier) => {
    const names = pools[role][tier].map(nameOf);
    return `${POOL_TIER_LABELS[tier].toLocaleUpperCase("pt-BR")}:\n${names.length ? names.join(", ") : "NENHUM"}`;
  });
  return [
    `ATUALIZAÇÃO DA MINHA POOL DE ${role}:`,
    "",
    ...sections.flatMap((section) => [section, ""]),
    includeClosingInstruction
      ? `Atualize minha pool de ${role} e use esta configuração como referência nas próximas recomendações de draft.`
      : "",
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n")
    .trim();
}

export function formatAllPools(
  playedRoles: Role[],
  pools: Pools,
  champions: Champion[],
): string {
  const roles = playedRoles.length ? playedRoles : [];
  const body = roles.map((role) => formatRolePool(role, pools, champions, false)).join("\n\n");
  return [
    "ATUALIZAÇÃO COMPLETA DAS MINHAS POOLS:",
    "",
    body || "NENHUMA FUNÇÃO CONFIGURADA",
    "",
    "Substitua minhas pools anteriores por esta configuração completa e use-a como referência nas próximas recomendações de draft.",
  ].join("\n");
}

export function formatInitialPrompt(input: {
  playedRoles: Role[];
  pools: Pools;
  preferences: string;
  champions: Champion[];
}): string {
  const poolText = input.playedRoles
    .map((role) => formatRolePool(role, input.pools, input.champions, false))
    .join("\n\n");
  return `Você será meu assistente rápido de draft de League of Legends.

Durante a seleção de campeões, eu enviarei drafts formatados com os campeões do meu time, do time inimigo, bans, minha função e outras funções para as quais desejo recomendações.

REGRAS DE RESPOSTA:

1. Responda imediatamente e de forma extremamente curta.
2. Na primeira linha, diga somente a recomendação principal.
3. Se houver mais de uma função solicitada, use o formato:
   ADC: Campeão | SUP: Campeão
4. Depois da primeira linha, use no máximo 1 ou 2 linhas para justificar.
5. Priorize, nesta ordem:
   - Matchup da lane.
   - Meta atual.
   - Minha familiaridade e pool.
   - Composições completas.
6. Não recomende uma lane inviável apenas por scaling.
7. Quando o draft completo for enviado, informe de maneira curta:
   - Plano da lane.
   - Plano para o mid/late game.
   - Condição de vitória.
   - Principais ameaças.
8. Recomende principalmente campeões presentes na minha pool.
9. Um campeão na categoria “Evitar” só deve ser sugerido em circunstância excepcional e com justificativa clara.
10. Não faça introduções longas durante o champ select.

FUNÇÕES QUE EU JOGO:
${input.playedRoles.length ? input.playedRoles.join(", ") : "NENHUMA"}

MINHAS POOLS:

${poolText || "NENHUMA POOL CONFIGURADA"}

PREFERÊNCIAS ADICIONAIS:

${input.preferences.trim() || "NENHUMA"}

Quando eu enviar um prompt de draft gerado pelo PickBoard, responda seguindo estas regras.`;
}
