import { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Check, Clipboard, Search } from "lucide-react";
import { POOL_TIER_LABELS } from "../../domain/constants";
import { formatAllPools, formatRolePool } from "../../domain/promptFormatters";
import { searchChampions } from "../../domain/search";
import { POOL_TIERS, ROLES, type PoolTier, type Role } from "../../domain/types";
import { championImageSource } from "../../services/championCatalog";
import { copyText } from "../../services/clipboard";
import { useAppStore } from "../../store/appStore";
import { Button } from "../ui/Button";
import { useToast } from "../ui/ToastProvider";
import { PoolCategory } from "./PoolCategory";

export function PoolPage() {
  const [activeRole, setActiveRole] = useState<Role>("ADC");
  const [targetTier, setTargetTier] = useState<PoolTier>("main");
  const [query, setQuery] = useState("");
  const pools = useAppStore((state) => state.pools);
  const champions = useAppStore((state) => state.champions);
  const playedRoles = useAppStore((state) => state.profile.playedRoles);
  const placePoolChampion = useAppStore((state) => state.placePoolChampion);
  const removePoolChampion = useAppStore((state) => state.removePoolChampion);
  const reorderPoolChampion = useAppStore((state) => state.reorderPoolChampion);
  const { notify } = useToast();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const championsById = useMemo(
    () => new Map(champions.map((champion) => [champion.id, champion])),
    [champions],
  );
  const searchResults = useMemo(
    () => searchChampions(champions, query).slice(0, query ? 24 : 12),
    [champions, query],
  );

  const currentTierFor = (championId: string): PoolTier | undefined =>
    POOL_TIERS.find((tier) => pools[activeRole][tier].includes(championId));

  const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    if (!over) return;
    const activeData = active.data.current as
      | { type: "champion"; tier: PoolTier; championId: string }
      | undefined;
    const overData = over.data.current as
      | { type: "champion"; tier: PoolTier; championId: string }
      | { type: "category"; tier: PoolTier }
      | undefined;
    if (!activeData || !overData) return;

    if (activeData.tier === overData.tier && overData.type === "champion") {
      reorderPoolChampion(
        activeRole,
        activeData.tier,
        activeData.championId,
        overData.championId,
      );
      return;
    }

    const index =
      overData.type === "champion"
        ? pools[activeRole][overData.tier].indexOf(overData.championId)
        : undefined;
    placePoolChampion(activeRole, overData.tier, activeData.championId, index);
  };

  const copyRole = async (): Promise<void> => {
    await copyText(formatRolePool(activeRole, pools, champions));
    notify(`Pool de ${activeRole} copiada.`);
  };

  const copyAll = async (): Promise<void> => {
    await copyText(formatAllPools(playedRoles, pools, champions));
    notify("Todas as pools jogadas foram copiadas.");
  };

  return (
    <div className="pool-page page">
      <header className="page-heading">
        <div>
          <h1>Minhas pools</h1>
          <p>Organize sua familiaridade por função e prioridade.</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" icon={<Clipboard size={16} />} onClick={() => void copyRole()}>
            Copiar pool desta função
          </Button>
          <Button variant="primary" icon={<Clipboard size={16} />} onClick={() => void copyAll()}>
            Copiar todas as pools
          </Button>
        </div>
      </header>

      <div className="role-tabs" role="tablist" aria-label="Funções da pool">
        {ROLES.map((role) => (
          <button
            type="button"
            role="tab"
            aria-selected={activeRole === role}
            data-active={activeRole === role}
            onClick={() => setActiveRole(role)}
            key={role}
          >
            {role}
            <span>
              {POOL_TIERS.reduce((total, tier) => total + pools[role][tier].length, 0)}
            </span>
          </button>
        ))}
      </div>

      <div className="pool-layout">
        <aside className="pool-catalog">
          <header>
            <h2>Adicionar campeão</h2>
            <p>Escolha o destino e pesquise no catálogo completo.</p>
          </header>
          <label className="field">
            <span>Categoria de destino</span>
            <select
              value={targetTier}
              onChange={(event) => setTargetTier(event.target.value as PoolTier)}
            >
              {POOL_TIERS.map((tier) => (
                <option value={tier} key={tier}>
                  {POOL_TIER_LABELS[tier]}
                </option>
              ))}
            </select>
          </label>
          <label className="catalog-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={query}
              placeholder="Nome ou alias..."
              aria-label="Pesquisar campeão para a pool"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="catalog-results">
            {searchResults.map((champion) => {
              const currentTier = currentTierFor(champion.id);
              return (
                <button
                  type="button"
                  className="catalog-result"
                  data-in-pool={Boolean(currentTier)}
                  onClick={() => placePoolChampion(activeRole, targetTier, champion.id)}
                  key={champion.id}
                >
                  <img src={championImageSource(champion)} alt="" loading="lazy" />
                  <span>{champion.name}</span>
                  {currentTier ? (
                    <small>
                      <Check size={12} /> {POOL_TIER_LABELS[currentTier]}
                    </small>
                  ) : (
                    <small>Adicionar</small>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="pool-board">
            {POOL_TIERS.map((tier) => (
              <PoolCategory
                tier={tier}
                championIds={pools[activeRole][tier]}
                championsById={championsById}
                onRemove={(championId) => removePoolChampion(activeRole, championId)}
                key={tier}
              />
            ))}
          </div>
        </DndContext>
      </div>
    </div>
  );
}
