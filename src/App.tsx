import { useEffect, useState } from "react";
import { AppShell, type AppPage } from "./components/layout/AppShell";
import { DraftPage } from "./components/draft/DraftPage";
import { PoolPage } from "./components/pools/PoolPage";
import { SettingsPage } from "./components/settings/SettingsPage";
import { AboutPage } from "./components/settings/AboutPage";
import { useToast } from "./components/ui/ToastProvider";
import { useLcuSync } from "./hooks/useLcuSync";
import { useAppStore } from "./store/appStore";

export function App() {
  useLcuSync();
  const [page, setPage] = useState<AppPage>("draft");
  const initialize = useAppStore((state) => state.initialize);
  const hydrated = useAppStore((state) => state.hydrated);
  const recoveredState = useAppStore((state) => state.recoveredState);
  const compactMode = useAppStore((state) => state.settings.compactMode);
  const { notify } = useToast();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (hydrated && recoveredState) {
      notify("Os dados locais eram inválidos. As configurações seguras foram restauradas.", "warning");
    }
  }, [hydrated, notify, recoveredState]);

  if (!hydrated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--color-bg)] text-[var(--color-ink)]">
        <div className="flex items-center gap-3 text-sm text-[var(--color-muted)]" role="status">
          <span className="loading-mark" aria-hidden="true" />
          Preparando seu quadro...
        </div>
      </main>
    );
  }

  return (
    <div data-compact={compactMode ? "true" : "false"}>
      <AppShell page={page} onNavigate={setPage}>
        {page === "draft" && <DraftPage onOpenSettings={() => setPage("settings")} />}
        {page === "pools" && <PoolPage />}
        {page === "settings" && <SettingsPage />}
        {page === "about" && <AboutPage />}
      </AppShell>
    </div>
  );
}
