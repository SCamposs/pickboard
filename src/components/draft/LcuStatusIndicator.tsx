import type { LcuConnectionState, LcuStatus } from "../../domain/types";

const STATUS_LABELS: Record<LcuConnectionState, string> = {
  disabled: "Sincronização desativada",
  searching: "Procurando League Client",
  "client-found": "League Client encontrado",
  connecting: "Conectando ao draft",
  idle: "Aguardando seleção",
  "champ-select": "Draft sincronizado",
  reconnecting: "Reconectando",
  unavailable: "Integração indisponível",
};

interface LcuStatusIndicatorProps {
  enabled: boolean;
  status: LcuStatus;
}

export function LcuStatusIndicator({ enabled, status }: LcuStatusIndicatorProps) {
  const state = enabled ? status.state : "disabled";
  const detail = enabled ? status.message : "Ative a opção nas configurações.";

  return (
    <div className="lcu-status" data-state={state} role="status" title={detail ?? undefined}>
      <span className="lcu-status-dot" aria-hidden="true" />
      <span>{STATUS_LABELS[state]}</span>
    </div>
  );
}
