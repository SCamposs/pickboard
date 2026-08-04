import { useEffect } from "react";
import type { LcuStatus } from "../domain/types";
import {
  configureLcuCatalog,
  getLcuStatus,
  onLcuSnapshot,
  onLcuStatus,
  setLcuSyncEnabled,
} from "../services/lcu";
import { isTauriRuntime } from "../services/environment";
import { useAppStore } from "../store/appStore";

const DESKTOP_ONLY_STATUS: LcuStatus = {
  state: "unavailable",
  message: "A sincronização está disponível no aplicativo instalado.",
};

const STARTUP_ERROR_STATUS: LcuStatus = {
  state: "unavailable",
  message: "Não foi possível iniciar a integração local.",
};

export function useLcuSync(): void {
  const hydrated = useAppStore((state) => state.hydrated);
  const champions = useAppStore((state) => state.champions);
  const enabled = useAppStore((state) => state.settings.syncWithLeagueClient);
  const applySnapshot = useAppStore((state) => state.applyLcuSnapshot);
  const setStatus = useAppStore((state) => state.setLcuStatus);

  useEffect(() => {
    if (!hydrated) return;
    if (!isTauriRuntime()) {
      setStatus(DESKTOP_ONLY_STATUS);
      return;
    }

    let disposed = false;
    const unlisteners: Array<() => void> = [];

    const subscribe = async (): Promise<void> => {
      try {
        const [stopStatus, stopSnapshot] = await Promise.all([
          onLcuStatus((status) => {
            if (!disposed) setStatus(status);
          }),
          onLcuSnapshot((snapshot) => {
            if (!disposed) applySnapshot(snapshot);
          }),
        ]);
        unlisteners.push(stopStatus, stopSnapshot);
        if (disposed) {
          stopStatus();
          stopSnapshot();
          return;
        }
        setStatus(await getLcuStatus());
      } catch {
        if (!disposed) setStatus(STARTUP_ERROR_STATUS);
      }
    };

    void subscribe();
    return () => {
      disposed = true;
      for (const unlisten of unlisteners) unlisten();
    };
  }, [applySnapshot, hydrated, setStatus]);

  useEffect(() => {
    if (!hydrated || !isTauriRuntime()) return;

    let disposed = false;
    const configure = async (): Promise<void> => {
      try {
        await configureLcuCatalog(champions);
        if (!disposed) await setLcuSyncEnabled(enabled);
      } catch {
        if (!disposed) setStatus(STARTUP_ERROR_STATUS);
      }
    };

    void configure();
    return () => {
      disposed = true;
    };
  }, [champions, enabled, hydrated, setStatus]);
}
