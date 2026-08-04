import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Download, RefreshCw, Sparkles, X } from "lucide-react";
import {
  findAppUpdate,
  installAppUpdate,
  type AvailableAppUpdate,
} from "../../services/appUpdate";
import { Button } from "../ui/Button";
import { useToast } from "../ui/ToastProvider";
import { AppUpdateContext, type AppUpdateContextValue } from "./AppUpdateContext";

export function AppUpdateProvider({ children }: PropsWithChildren) {
  const [availableUpdate, setAvailableUpdate] = useState<AvailableAppUpdate | null>(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installationStatus, setInstallationStatus] = useState("Preparando atualização...");
  const startupCheckStarted = useRef(false);
  const { notify } = useToast();

  const runCheck = useCallback(
    async (silent: boolean): Promise<void> => {
      if (checking || installing) return;
      setChecking(true);
      try {
        const update = await findAppUpdate();
        if (update) {
          setAvailableUpdate(update);
        } else if (!silent) {
          notify("Você já está usando a versão mais recente do PickBoard.");
        }
      } catch {
        if (!silent) {
          notify("Não foi possível verificar atualizações agora. Tente novamente mais tarde.", "warning");
        }
      } finally {
        setChecking(false);
      }
    },
    [checking, installing, notify],
  );

  useEffect(() => {
    if (startupCheckStarted.current) return;
    startupCheckStarted.current = true;
    void runCheck(true);
  }, [runCheck]);

  const dismissUpdate = async (): Promise<void> => {
    if (!availableUpdate || installing) return;
    await availableUpdate.close();
    setAvailableUpdate(null);
  };

  const applyUpdate = async (): Promise<void> => {
    if (!availableUpdate || installing) return;
    setInstalling(true);
    setInstallationStatus("Baixando atualização...");
    try {
      await installAppUpdate(availableUpdate, (event) => {
        if (event.event === "Finished") {
          setInstallationStatus("Instalando e reiniciando o PickBoard...");
        }
      });
    } catch {
      setInstalling(false);
      setInstallationStatus("Preparando atualização...");
      notify("Não foi possível instalar a atualização. Tente novamente mais tarde.", "warning");
    }
  };

  const value = useMemo<AppUpdateContextValue>(
    () => ({ checking, checkForAppUpdate: () => runCheck(false) }),
    [checking, runCheck],
  );

  return (
    <AppUpdateContext.Provider value={value}>
      {children}
      {availableUpdate && (
        <div className="update-backdrop" role="presentation">
          <section
            className="update-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="update-title"
            aria-describedby="update-description"
          >
            <header className="update-dialog-heading">
              <span className="update-dialog-icon" aria-hidden="true">
                <Sparkles size={22} />
              </span>
              <button
                type="button"
                className="icon-button"
                aria-label="Fechar aviso de atualização"
                disabled={installing}
                onClick={() => void dismissUpdate()}
              >
                <X size={18} />
              </button>
            </header>
            <div className="update-dialog-copy">
              <span>Nova versão disponível</span>
              <h2 id="update-title">PickBoard {availableUpdate.version}</h2>
              <p id="update-description">
                Atualize agora para receber as melhorias mais recentes. O aplicativo será
                reiniciado ao concluir.
              </p>
            </div>
            {installing && (
              <div className="update-installation-status" role="status">
                <RefreshCw className="spin" size={16} aria-hidden="true" />
                {installationStatus}
              </div>
            )}
            <footer className="update-dialog-actions">
              <Button variant="ghost" disabled={installing} onClick={() => void dismissUpdate()}>
                Agora não
              </Button>
              <Button
                variant="primary"
                icon={<Download size={16} />}
                disabled={installing}
                onClick={() => void applyUpdate()}
              >
                {installing ? "Atualizando..." : "Atualizar e reiniciar"}
              </Button>
            </footer>
          </section>
        </div>
      )}
    </AppUpdateContext.Provider>
  );
}
