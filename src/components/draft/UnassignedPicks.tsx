import { ROLE_LONG_LABELS } from "../../domain/constants";
import {
  ROLES,
  type Champion,
  type DraftState,
  type Role,
  type TeamSide,
} from "../../domain/types";
import { championImageSource } from "../../services/championCatalog";

interface UnassignedPicksProps {
  side: TeamSide;
  picks: DraftState["unassignedPicks"][TeamSide];
  occupiedRoles: DraftState["picks"][TeamSide];
  championsById: Map<string, Champion>;
  onAssign: (championId: string, role: Role) => void;
}

export function UnassignedPicks({
  side,
  picks,
  occupiedRoles,
  championsById,
  onAssign,
}: UnassignedPicksProps) {
  if (picks.length === 0) return null;
  const enemy = side === "enemy";

  return (
    <section className="unassigned-picks" aria-labelledby={`${side}-unassigned-title`}>
      <header>
        <strong id={`${side}-unassigned-title`}>
          {enemy ? "Picks inimigos detectados" : "Aliados sem posição"}
        </strong>
        <span>
          {enemy
            ? "A posição não é presumida. Defina apenas se quiser."
            : "O cliente ainda não informou uma posição reconhecida."}
        </span>
      </header>
      <div className="unassigned-pick-list">
        {picks.map((pick) => {
          const champion = championsById.get(pick.championId);
          if (!champion) return null;
          return (
            <div className="unassigned-pick" key={pick.championId}>
              <img src={championImageSource(champion)} alt="" loading="lazy" />
              <span title={champion.name}>{champion.name}</span>
              <label>
                <span className="sr-only">Definir posição de {champion.name}</span>
                <select
                  value=""
                  aria-label={`Definir posição de ${champion.name}`}
                  onChange={(event) => {
                    const role = event.target.value as Role;
                    if (ROLES.includes(role)) onAssign(champion.id, role);
                  }}
                >
                  <option value="">Sem posição</option>
                  {ROLES.map((role) => (
                    <option value={role} key={role}>
                      {ROLE_LONG_LABELS[role]}
                      {occupiedRoles[role] ? " (ocupada)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}
