import { Check, Clipboard, Info } from "lucide-react";
import { formatAssistantContext } from "../../domain/promptFormatters";
import { ROLES } from "../../domain/types";
import { copyText } from "../../services/clipboard";
import { useAppStore } from "../../store/appStore";
import { Button } from "../ui/Button";
import { useToast } from "../ui/ToastProvider";

export function InitialSetup() {
  const playedRoles = useAppStore((state) => state.profile.playedRoles);
  const preferences = useAppStore((state) => state.profile.recommendationPreferences);
  const setupCompleted = useAppStore((state) => state.profile.setupCompleted);
  const pools = useAppStore((state) => state.pools);
  const champions = useAppStore((state) => state.champions);
  const setProfile = useAppStore((state) => state.setProfile);
  const { notify } = useToast();

  const togglePlayedRole = (role: (typeof ROLES)[number]): void => {
    setProfile(
      "playedRoles",
      playedRoles.includes(role)
        ? playedRoles.filter((current) => current !== role)
        : [...playedRoles, role],
    );
  };

  const copyAssistantContext = async (): Promise<void> => {
    if (!setupCompleted) return;
    await copyText(
      formatAssistantContext({
        playedRoles,
        pools,
        preferences,
        champions,
      }),
    );
    notify("Contexto para IA copiado. Cole em uma conversa nova.");
  };

  return (
    <section className="settings-section setup-section" aria-labelledby="setup-title">
      <header className="settings-section-heading">
        <div>
          <h2 id="setup-title">Perfil de recomendação</h2>
          <p>Define suas funções, pools e preferências no contexto enviado à IA.</p>
        </div>
        <span className="setup-status" data-complete={setupCompleted}>
          {setupCompleted ? <Check size={14} /> : <Info size={14} />}
          {setupCompleted ? "Configuração confirmada" : "Revisão pendente"}
        </span>
      </header>

      <fieldset className="settings-fieldset">
        <legend>Funções que eu jogo</legend>
        <div className="choice-chips">
          {ROLES.map((role) => {
            const selected = playedRoles.includes(role);
            return (
              <button
                type="button"
                className="choice-chip"
                aria-pressed={selected}
                data-selected={selected}
                onClick={() => togglePlayedRole(role)}
                key={role}
              >
                {selected && <Check size={13} />}
                {role}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="field preferences-field">
        <span>Preferências de recomendação</span>
        <textarea
          value={preferences}
          rows={9}
          onChange={(event) => setProfile("recommendationPreferences", event.target.value)}
        />
      </label>

      <div className="setup-actions">
        <Button
          variant={setupCompleted ? "secondary" : "primary"}
          icon={<Check size={16} />}
          onClick={() => {
            setProfile("setupCompleted", true);
            notify("Configuração inicial confirmada.");
          }}
        >
          {setupCompleted ? "Confirmar novamente" : "Confirmar configuração"}
        </Button>
        <div className="assistant-context-action">
          <Button
            variant="primary"
            icon={<Clipboard size={16} />}
            disabled={!setupCompleted}
            onClick={() => void copyAssistantContext()}
          >
            Copiar contexto para novo chat
          </Button>
          <span>
            {setupCompleted
              ? "Inclui suas funções, pools e preferências. Cole como primeira mensagem na IA de sua escolha."
              : "Confirme a configuração para liberar o contexto completo para IA."}
          </span>
        </div>
      </div>
    </section>
  );
}
