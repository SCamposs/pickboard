import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, Check, Search, ShieldBan, Swords, X } from "lucide-react";
import { TEAM_LABELS } from "../../domain/constants";
import { searchChampions } from "../../domain/search";
import { validateChampionForTarget } from "../../domain/draftValidation";
import type { Champion, PickerTarget } from "../../domain/types";
import { championImageSource } from "../../services/championCatalog";
import { confirmAction } from "../../services/confirm";
import { useAppStore } from "../../store/appStore";
import { useToast } from "../ui/ToastProvider";

interface ChampionPickerProps {
  target: PickerTarget;
  onClose: () => void;
}

export function ChampionPicker({ target, onClose }: ChampionPickerProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const champions = useAppStore((state) => state.champions);
  const draft = useAppStore((state) => state.draft);
  const chooseChampion = useAppStore((state) => state.chooseChampion);
  const clearTarget = useAppStore((state) => state.clearTarget);
  const { notify } = useToast();
  const results = useMemo(() => searchChampions(champions, query), [champions, query]);
  const resolvedActiveIndex = Math.min(activeIndex, Math.max(0, results.length - 1));

  const targetLabel =
    target.kind === "pick"
      ? `${TEAM_LABELS[target.side]} · ${target.role}`
      : `${TEAM_LABELS[target.side]} · Ban ${target.index + 1}`;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "/") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [onClose]);

  const selectChampion = async (champion: Champion): Promise<void> => {
    const validation = validateChampionForTarget(draft, champion.id, target);
    if (!validation.allowed && validation.requiresPickRemoval) {
      const accepted = await confirmAction(
        `${champion.name} está selecionado em ${validation.pickedAt?.role}. Remover o pick e aplicar o ban?`,
        "Mover campeão para os bans",
      );
      if (!accepted) return;
      chooseChampion(target, champion.id, true);
      notify(`${champion.name} removido do pick e adicionado aos bans.`);
      onClose();
      return;
    }
    if (!validation.allowed) {
      notify(validation.reason ?? "Campeão indisponível.", "warning");
      return;
    }
    chooseChampion(target, champion.id);
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && results[resolvedActiveIndex]) {
      event.preventDefault();
      void selectChampion(results[resolvedActiveIndex]);
    }
  };

  return (
    <div className="picker-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="champion-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="picker-heading">
          <div>
            <span className="picker-context">
              {target.kind === "pick" ? <Swords size={14} /> : <ShieldBan size={14} />}
              Editando
            </span>
            <h2 id="picker-title">{targetLabel}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Fechar seletor" onClick={onClose}>
            <X size={19} />
          </button>
        </header>

        <div className="picker-search">
          <Search size={17} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            placeholder="Buscar campeão ou alias..."
            aria-label="Buscar campeão"
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <kbd>/</kbd>
        </div>

        <div className="picker-meta">
          <span>{results.length} campeões</span>
          <span>↑↓ navegar · Enter selecionar · Esc fechar</span>
        </div>

        <div className="champion-results" role="listbox" aria-label="Resultados de campeões">
          {results.map((champion, index) => {
            const availability = validateChampionForTarget(draft, champion.id, target);
            const unavailable = !availability.allowed;
            const canRequestMove = Boolean(availability.requiresPickRemoval);
            return (
              <button
                type="button"
                role="option"
                aria-selected={index === resolvedActiveIndex}
                aria-disabled={unavailable}
                className="champion-result"
                data-active={index === resolvedActiveIndex}
                data-unavailable={unavailable}
                disabled={unavailable && !canRequestMove}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => void selectChampion(champion)}
                onDoubleClick={() => void selectChampion(champion)}
                key={champion.id}
              >
                <img src={championImageSource(champion)} alt="" loading="lazy" />
                <span className="champion-result-name">{champion.name}</span>
                {availability.allowed ? (
                  <Check className="champion-result-check" size={16} aria-hidden="true" />
                ) : (
                  <span className="champion-result-status">
                    {availability.reason?.startsWith("Banido") && <Ban size={13} />}
                    {availability.reason}
                  </span>
                )}
              </button>
            );
          })}
          {results.length === 0 && (
            <div className="picker-empty">
              <Search size={24} aria-hidden="true" />
              <strong>Nenhum campeão encontrado</strong>
              <span>Tente o nome oficial ou um alias como “ww”, “noc” ou “kaisa”.</span>
            </div>
          )}
        </div>

        <footer className="picker-footer">
          <button
            type="button"
            className="button button-ghost"
            onClick={() => {
              clearTarget(target);
              onClose();
            }}
          >
            <X size={15} />
            Limpar slot
          </button>
        </footer>
      </aside>
    </div>
  );
}
