import { Pencil, Undo2, X } from "lucide-react";
import { ROLE_LONG_LABELS } from "../../domain/constants";
import type { Champion, Role, TeamSide } from "../../domain/types";
import { championImageSource } from "../../services/championCatalog";

interface RoleSlotProps {
  role: Role;
  side: TeamSide;
  champion?: Champion;
  onEdit: () => void;
  onClear: () => void;
  synced?: boolean;
  onReturnToUnassigned?: () => void;
}

export function RoleSlot({
  role,
  side,
  champion,
  onEdit,
  onClear,
  synced,
  onReturnToUnassigned,
}: RoleSlotProps) {
  return (
    <div className="role-slot" data-side={side} data-filled={Boolean(champion)}>
      <button
        type="button"
        className="role-slot-main"
        onClick={onEdit}
        aria-label={`${champion ? "Substituir" : "Selecionar"} campeão em ${ROLE_LONG_LABELS[role]} do ${
          side === "ally" ? "meu time" : "time inimigo"
        }`}
      >
        <span className="role-slot-art">
          {champion ? (
            <img src={championImageSource(champion)} alt="" loading="lazy" />
          ) : (
            <span className="role-placeholder" aria-hidden="true">
              {role.slice(0, 2)}
            </span>
          )}
        </span>
        <span className="role-slot-copy">
          <span className="role-slot-role">{role}</span>
          <span className={champion ? "role-slot-name" : "role-slot-open"}>
            {champion?.name ?? "OPEN"}
          </span>
          {champion && synced && <span className="role-slot-source">Sincronizado</span>}
        </span>
        <Pencil className="role-slot-edit" size={15} aria-hidden="true" />
      </button>
      {champion && (
        onReturnToUnassigned ? (
          <button
            type="button"
            className="role-slot-clear icon-button"
            aria-label={`Retornar ${champion.name} para sem posição`}
            title="Retornar para sem posição"
            onClick={onReturnToUnassigned}
          >
            <Undo2 size={15} />
          </button>
        ) : (
          <button
            type="button"
            className="role-slot-clear icon-button"
            aria-label={`Limpar ${ROLE_LONG_LABELS[role]}`}
            title="Limpar slot"
            onClick={onClear}
          >
            <X size={15} />
          </button>
        )
      )}
    </div>
  );
}
