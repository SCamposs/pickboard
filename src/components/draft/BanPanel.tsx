import { ShieldBan, X } from "lucide-react";
import type { Champion, TeamSide } from "../../domain/types";
import { championImageSource } from "../../services/championCatalog";

interface BanPanelProps {
  side: TeamSide;
  bans: Array<string | null>;
  championsById: Map<string, Champion>;
  onEdit: (index: number) => void;
  onClear: (index: number) => void;
}

export function BanPanel({ side, bans, championsById, onEdit, onClear }: BanPanelProps) {
  return (
    <section className="ban-panel" aria-label={side === "ally" ? "Bans do meu time" : "Bans do time inimigo"}>
      <div className="ban-title">
        <ShieldBan size={14} aria-hidden="true" />
        Bans
      </div>
      <div className="ban-list">
        {bans.map((championId, index) => {
          const champion = championId ? championsById.get(championId) : undefined;
          return (
            <div className="ban-slot" data-filled={Boolean(champion)} key={`${side}-${index}`}>
              <button
                type="button"
                className="ban-slot-main"
                aria-label={`${champion ? "Substituir" : "Selecionar"} ban ${index + 1} ${
                  side === "ally" ? "do meu time" : "do time inimigo"
                }`}
                title={champion?.name ?? `Ban ${index + 1}: OPEN`}
                onClick={() => onEdit(index)}
              >
                {champion ? (
                  <img src={championImageSource(champion)} alt="" loading="lazy" />
                ) : (
                  <span aria-hidden="true">{index + 1}</span>
                )}
              </button>
              {champion && (
                <button
                  type="button"
                  className="ban-slot-clear"
                  aria-label={`Limpar ban de ${champion.name}`}
                  onClick={() => onClear(index)}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

