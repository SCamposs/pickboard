import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Clipboard,
  Eraser,
  LayoutPanelTop,
  Pin,
  Plus,
  RotateCcw,
  Settings2,
  ShieldX,
} from "lucide-react";
import { formatDraftPrompt } from "../../domain/promptFormatters";
import { hasDraftContent } from "../../domain/draftValidation";
import type { PickerTarget } from "../../domain/types";
import { copyText } from "../../services/clipboard";
import { confirmAction } from "../../services/confirm";
import { useAppStore } from "../../store/appStore";
import { Button } from "../ui/Button";
import { useToast } from "../ui/ToastProvider";
import { ChampionPicker } from "./ChampionPicker";
import { RecommendationRoleControls } from "./RecommendationRoleControls";
import { TeamPanel } from "./TeamPanel";

interface DraftPageProps {
  onOpenSettings: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function DraftPage({ onOpenSettings }: DraftPageProps) {
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const draft = useAppStore((state) => state.draft);
  const champions = useAppStore((state) => state.champions);
  const primaryRole = useAppStore((state) => state.settings.primaryRole);
  const additionalRoles = useAppStore((state) => state.settings.additionalRoles);
  const alwaysOnTop = useAppStore((state) => state.settings.alwaysOnTop);
  const compactMode = useAppStore((state) => state.settings.compactMode);
  const setupCompleted = useAppStore((state) => state.profile.setupCompleted);
  const clearTarget = useAppStore((state) => state.clearTarget);
  const clearPicks = useAppStore((state) => state.clearPicks);
  const clearBans = useAppStore((state) => state.clearBans);
  const startNewMatch = useAppStore((state) => state.startNewMatch);
  const invertTeams = useAppStore((state) => state.invertTeams);
  const setSetting = useAppStore((state) => state.setSetting);
  const { notify } = useToast();

  const championsById = useMemo(
    () => new Map(champions.map((champion) => [champion.id, champion])),
    [champions],
  );

  const copyDraft = useCallback(async () => {
    try {
      await copyText(formatDraftPrompt({ draft, primaryRole, additionalRoles, champions }));
      notify("Draft copiado. O quadro foi mantido.");
    } catch {
      notify("Não foi possível copiar o draft.", "warning");
    }
  }, [additionalRoles, champions, draft, notify, primaryRole]);

  const newMatch = useCallback(async () => {
    if (
      hasDraftContent(draft) &&
      !(await confirmAction("Limpar todos os picks e bans desta partida?", "Nova partida"))
    ) {
      return;
    }
    startNewMatch();
    notify("Novo quadro preparado.");
  }, [draft, notify, startNewMatch]);

  const swap = async (): Promise<void> => {
    if (
      !(await confirmAction(
        "Trocar picks e bans entre Meu time e Time inimigo?",
        "Inverter times",
      ))
    ) {
      return;
    }
    invertTeams();
    notify("Times invertidos.");
  };

  const clearAllPicks = async (): Promise<void> => {
    const hasPicks = Object.values(draft.picks).some((team) =>
      Object.values(team).some(Boolean),
    );
    if (
      hasPicks &&
      !(await confirmAction("Limpar todos os picks dos dois times?", "Limpar picks"))
    ) {
      return;
    }
    clearPicks();
    notify("Todos os picks foram limpos.");
  };

  const clearAllBans = async (): Promise<void> => {
    const hasBans = Object.values(draft.bans).some((team) => team.some(Boolean));
    if (
      hasBans &&
      !(await confirmAction("Limpar todos os bans dos dois times?", "Limpar bans"))
    ) {
      return;
    }
    clearBans();
    notify("Todos os bans foram limpos.");
  };

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLocaleLowerCase() === "c") {
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        void copyDraft();
      }
      if (event.ctrlKey && event.key.toLocaleLowerCase() === "n") {
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        void newMatch();
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [copyDraft, newMatch]);

  return (
    <div className="draft-page page">
      <header className="page-heading draft-page-heading">
        <div>
          <h1>Quadro de draft</h1>
          <p>Registre picks e bans em qualquer ordem.</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="status-toggle"
            data-active={alwaysOnTop}
            aria-pressed={alwaysOnTop}
            title="Manter a janela acima das outras"
            onClick={() => setSetting("alwaysOnTop", !alwaysOnTop)}
          >
            <Pin size={15} />
            Sempre no topo
          </button>
          <button
            type="button"
            className="status-toggle"
            data-active={compactMode}
            aria-pressed={compactMode}
            onClick={() => setSetting("compactMode", !compactMode)}
          >
            <LayoutPanelTop size={15} />
            Modo compacto
          </button>
        </div>
      </header>

      {!setupCompleted && (
        <div className="setup-banner">
          <span>
            <strong>Revise seu perfil de recomendação.</strong> O quadro já pode ser usado; o
            contexto para novos chats será liberado após a confirmação.
          </span>
          <Button variant="ghost" icon={<Settings2 size={15} />} onClick={onOpenSettings}>
            Revisar agora
          </Button>
        </div>
      )}

      <div className="draft-workspace">
        <TeamPanel
          side="ally"
          draft={draft}
          championsById={championsById}
          onEdit={setPickerTarget}
          onClear={clearTarget}
        />

        <aside className="draft-center">
          <RecommendationRoleControls />
          <Button
            variant="primary"
            className="copy-draft-button"
            icon={<Clipboard size={18} />}
            onClick={() => void copyDraft()}
          >
            Copiar draft
            <kbd>Ctrl Shift C</kbd>
          </Button>
          <div className="draft-quick-actions">
            <Button variant="secondary" icon={<Plus size={16} />} onClick={() => void newMatch()}>
              Nova partida
            </Button>
            <Button variant="ghost" icon={<ArrowLeftRight size={16} />} onClick={() => void swap()}>
              Inverter times
            </Button>
            <div className="action-divider" />
            <Button
              variant="ghost"
              icon={<Eraser size={15} />}
              onClick={() => void clearAllPicks()}
            >
              Limpar picks
            </Button>
            <Button
              variant="ghost"
              icon={<ShieldX size={15} />}
              onClick={() => void clearAllBans()}
            >
              Limpar bans
            </Button>
          </div>
          <div className="draft-tip">
            <RotateCcw size={15} />
            O último draft é restaurado ao abrir.
          </div>
        </aside>

        <TeamPanel
          side="enemy"
          draft={draft}
          championsById={championsById}
          onEdit={setPickerTarget}
          onClear={clearTarget}
        />
      </div>

      {pickerTarget && (
        <ChampionPicker target={pickerTarget} onClose={() => setPickerTarget(null)} />
      )}
    </div>
  );
}
