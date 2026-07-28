import { X } from "lucide-react";
import { ROLES, type Role } from "../../domain/types";
import { useAppStore } from "../../store/appStore";

export function RecommendationRoleControls() {
  const primaryRole = useAppStore((state) => state.settings.primaryRole);
  const additionalRoles = useAppStore((state) => state.settings.additionalRoles);
  const setPrimaryRole = useAppStore((state) => state.setPrimaryRole);
  const toggleAdditionalRole = useAppStore((state) => state.toggleAdditionalRole);

  return (
    <section className="recommendation-controls" aria-label="Funções para recomendação">
      <label className="field compact-field">
        <span>Estou jogando de</span>
        <select value={primaryRole} onChange={(event) => setPrimaryRole(event.target.value as Role)}>
          {ROLES.map((role) => (
            <option value={role} key={role}>
              {role}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="additional-roles">
        <legend>Recomendar também</legend>
        <div className="role-chips">
          {ROLES.filter((role) => role !== primaryRole).map((role) => {
            const selected = additionalRoles.includes(role);
            return (
              <button
                type="button"
                className="role-chip"
                data-selected={selected}
                aria-pressed={selected}
                onClick={() => toggleAdditionalRole(role)}
                key={role}
              >
                {role}
                {selected && <X size={12} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}

