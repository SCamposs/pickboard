import { Pencil, X } from "lucide-react";
import { ROLE_LONG_LABELS } from "../../domain/constants";
import type { Champion, Role, TeamSide } from "../../domain/types";
import { championImageSource } from "../../services/championCatalog";

interface RoleSlotProps {
  role: Role;
  side: TeamSide;
  champion?: Champion;
  onEdit: () => void;
  onClear: () => void;
}

export function RoleSlot({ role, side, champion, onEdit, onClear }: RoleSlotProps) {
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
        </span>
        <Pencil className="role-slot-edit" size={15} aria-hidden="true" />
      </button>
      {champion && (
        <button
          type="button"
          className="role-slot-clear icon-button"
          aria-label={`Limpar ${ROLE_LONG_LABELS[role]}`}
          title="Limpar slot"
          onClick={onClear}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

