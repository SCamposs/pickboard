import { useState } from "react";
import { Database, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import { checkLatestChampionVersion } from "../../services/championCatalog";
import { confirmAction } from "../../services/confirm";
import { useAppStore } from "../../store/appStore";
import { Button } from "../ui/Button";
import { Switch } from "../ui/Switch";
import { useToast } from "../ui/ToastProvider";
import { InitialSetup } from "./InitialSetup";

export function SettingsPage() {
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const settings = useAppStore((state) => state.settings);
  const championDataVersion = useAppStore((state) => state.championDataVersion);
  const setSetting = useAppStore((state) => state.setSetting);
  const resetDefaults = useAppStore((state) => state.resetDefaults);
  const installChampionUpdate = useAppStore((state) => state.installChampionUpdate);
  const { notify } = useToast();

  const checkForUpdates = async (): Promise<void> => {
    setChecking(true);
    try {
      const latest = await checkLatestChampionVersion();
      setAvailableVersion(latest);
      if (latest === championDataVersion) {
        notify("Os dados de campeões já estão atualizados.");
        return;
      }
      const accepted = await confirmAction(
        `A versão ${latest} está disponível. Baixar os dados e ícones agora?`,
        "Atualizar campeões",
        "info",
      );
      if (!accepted) return;
      setInstalling(true);
      await installChampionUpdate(latest);
      notify(`Campeões atualizados para a versão ${latest}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "A rede não está disponível.";
      notify(`Não foi possível verificar atualizações. ${message}`, "warning");
    } finally {
      setChecking(false);
      setInstalling(false);
    }
  };

  const restoreDefaults = async (): Promise<void> => {
    const accepted = await confirmAction(
      "Restaurar pools, funções, preferências e o draft para os valores iniciais?",
      "Restaurar configurações padrão",
    );
    if (!accepted) return;
    await resetDefaults();
    notify("Configurações padrão restauradas.");
  };

  return (
    <div className="settings-page page">
      <header className="page-heading">
        <div>
          <h1>Configurações</h1>
          <p>Preferências locais, dados offline e perfil de recomendação.</p>
        </div>
      </header>

      <div className="settings-content">
        <InitialSetup />

        <section className="settings-section" aria-labelledby="behavior-title">
          <header className="settings-section-heading">
            <div>
              <h2 id="behavior-title">Comportamento da janela</h2>
              <p>Estas opções são aplicadas e salvas automaticamente.</p>
            </div>
          </header>
          <div className="switch-list">
            <Switch
              checked={settings.syncWithLeagueClient}
              label="Sincronizar com o League Client"
              description="Preenche picks e bans confirmados automaticamente enquanto o League Client estiver aberto. O modo manual continua disponível."
              onChange={(value) => setSetting("syncWithLeagueClient", value)}
            />
            <Switch
              checked={settings.alwaysOnTop}
              label="Sempre no topo"
              description="Mantém o PickBoard visível acima do cliente do jogo."
              onChange={(value) => setSetting("alwaysOnTop", value)}
            />
            <Switch
              checked={settings.compactMode}
              label="Modo compacto"
              description="Reduz margens e altura dos slots sem ocultar controles."
              onChange={(value) => setSetting("compactMode", value)}
            />
            <Switch
              checked={settings.clearDraftOnStart}
              label="Limpar draft ao iniciar"
              description="Limpa somente picks e bans; pools e preferências são mantidas."
              onChange={(value) => setSetting("clearDraftOnStart", value)}
            />
          </div>
        </section>

        <section className="settings-section" aria-labelledby="data-title">
          <header className="settings-section-heading">
            <div>
              <h2 id="data-title">Dados dos campeões</h2>
              <p>Verifique quando quiser se há campeões e ícones mais recentes.</p>
            </div>
            <ShieldCheck size={20} aria-hidden="true" />
          </header>
          <div className="data-version-row">
            <Database size={20} aria-hidden="true" />
            <div>
              <strong>Versão instalada</strong>
              <span>{championDataVersion}</span>
            </div>
            {availableVersion && availableVersion !== championDataVersion && (
              <div>
                <strong>Versão disponível</strong>
                <span>{availableVersion}</span>
              </div>
            )}
            <Button
              variant="secondary"
              icon={<RefreshCw className={checking ? "spin" : ""} size={16} />}
              disabled={checking || installing}
              onClick={() => void checkForUpdates()}
            >
              {installing
                ? "Baixando atualização..."
                : checking
                  ? "Verificando..."
                  : "Verificar atualizações de campeões"}
            </Button>
          </div>
        </section>

        <section className="settings-section danger-section" aria-labelledby="restore-title">
          <header className="settings-section-heading">
            <div>
              <h2 id="restore-title">Restaurar configurações padrão</h2>
              <p>Substitui os dados locais atuais pelos valores iniciais do PickBoard.</p>
            </div>
            <Button
              variant="danger"
              icon={<RotateCcw size={16} />}
              onClick={() => void restoreDefaults()}
            >
              Restaurar configurações
            </Button>
          </header>
        </section>
      </div>
    </div>
  );
}
