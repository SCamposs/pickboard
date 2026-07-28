import type { PoolTier, Role, TeamSide } from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  TOP: "TOP",
  JG: "JG",
  MID: "MID",
  ADC: "ADC",
  SUP: "SUP",
};

export const ROLE_LONG_LABELS: Record<Role, string> = {
  TOP: "Topo",
  JG: "Selva",
  MID: "Meio",
  ADC: "Atirador",
  SUP: "Suporte",
};

export const TEAM_LABELS: Record<TeamSide, string> = {
  ally: "Meu time",
  enemy: "Time inimigo",
};

export const POOL_TIER_LABELS: Record<PoolTier, string> = {
  main: "Principais",
  good: "Bons",
  situational: "Situacionais",
  avoid: "Evitar",
};

export const DEFAULT_RECOMMENDATION_PREFERENCES = `- Responder rapidamente durante a seleção de campeões.
- Colocar a recomendação principal na primeira linha.
- Priorizar primeiro o matchup da lane.
- Depois considerar meta atual, conforto com o campeão e composição completa.
- Não recomendar uma lane muito ruim somente porque o campeão escala.
- Considerar Vayne com mais frequência do que tier lists genéricas quando ela realmente for apropriada.
- Quando suporte também for solicitado, preferir inicialmente Braum, Lulu, Milio, Nautilus, Alistar e Tahm Kench quando fizerem sentido na composição.`;

export const RIOT_LEGAL_NOTICE =
  "PickBoard isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.";

