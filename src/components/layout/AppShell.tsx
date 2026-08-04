import type { PropsWithChildren } from "react";
import { CircleHelp, Columns3, Settings2, ShieldEllipsis } from "lucide-react";

const logoUrl = "/pickboard-mark.svg";

export type AppPage = "draft" | "pools" | "settings" | "about";

interface AppShellProps extends PropsWithChildren {
  page: AppPage;
  onNavigate: (page: AppPage) => void;
}

const NAVIGATION: Array<{
  id: AppPage;
  label: string;
  shortLabel: string;
  icon: typeof Columns3;
}> = [
  { id: "draft", label: "Draft", shortLabel: "Draft", icon: Columns3 },
  { id: "pools", label: "Minhas pools", shortLabel: "Pools", icon: ShieldEllipsis },
  { id: "settings", label: "Configurações", shortLabel: "Ajustes", icon: Settings2 },
  { id: "about", label: "Sobre", shortLabel: "Sobre", icon: CircleHelp },
];

export function AppShell({ page, onNavigate, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="nav-rail" aria-label="Navegação principal">
        <div className="brand-mark" title="PickBoard">
          <img src={logoUrl} alt="" />
          <span>PickBoard</span>
        </div>
        <nav>
          {NAVIGATION.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                className="nav-item"
                data-active={page === item.id}
                aria-current={page === item.id ? "page" : undefined}
                aria-label={item.label}
                title={item.label}
                onClick={() => onNavigate(item.id)}
                key={item.id}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
        <div className="version-mark">v0.2.1</div>
      </aside>
      <main className="app-content">{children}</main>
    </div>
  );
}
