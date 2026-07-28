import { Swords } from "lucide-react";
import { ROLES, type Champion, type DraftState, type PickerTarget, type TeamSide } from "../../domain/types";
import { BanPanel } from "./BanPanel";
import { RoleSlot } from "./RoleSlot";

interface TeamPanelProps {
  side: TeamSide;
  draft: DraftState;
  championsById: Map<string, Champion>;
  onEdit: (target: PickerTarget) => void;
  onClear: (target: PickerTarget) => void;
}

export function TeamPanel({ side, draft, championsById, onEdit, onClear }: TeamPanelProps) {
  const ally = side === "ally";
  return (
    <section className="team-panel" data-side={side} aria-labelledby={`${side}-team-title`}>
      <header className="team-heading">
        <span className="team-emblem" aria-hidden="true">
          <Swords size={17} />
        </span>
        <div>
          <h2 id={`${side}-team-title`}>{ally ? "Meu time" : "Time inimigo"}</h2>
          <span>{ally ? "Sua composição" : "Composição adversária"}</span>
        </div>
      </header>
      <div className="role-list">
        {ROLES.map((role) => (
          <RoleSlot
            key={role}
            role={role}
            side={side}
            champion={
              draft.picks[side][role]
                ? championsById.get(draft.picks[side][role])
                : undefined
            }
            onEdit={() => onEdit({ kind: "pick", side, role })}
            onClear={() => onClear({ kind: "pick", side, role })}
          />
        ))}
      </div>
      <BanPanel
        side={side}
        bans={draft.bans[side]}
        championsById={championsById}
        onEdit={(index) => onEdit({ kind: "ban", side, index })}
        onClear={(index) => onClear({ kind: "ban", side, index })}
      />
    </section>
  );
}
