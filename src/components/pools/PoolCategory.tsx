import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { POOL_TIER_LABELS } from "../../domain/constants";
import type { Champion, PoolTier } from "../../domain/types";
import { championImageSource } from "../../services/championCatalog";

interface SortableChampionProps {
  champion: Champion;
  tier: PoolTier;
  onRemove: () => void;
}

function SortableChampion({ champion, tier, onRemove }: SortableChampionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${tier}:${champion.id}`,
    data: { type: "champion", tier, championId: champion.id },
  });

  return (
    <div
      ref={setNodeRef}
      className="pool-champion"
      data-dragging={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        className="pool-drag-handle"
        aria-label={`Reordenar ${champion.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={15} />
      </button>
      <img src={championImageSource(champion)} alt="" loading="lazy" />
      <span>{champion.name}</span>
      <button
        type="button"
        className="icon-button"
        aria-label={`Remover ${champion.name} da pool`}
        title="Remover da pool"
        onClick={onRemove}
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface PoolCategoryProps {
  tier: PoolTier;
  championIds: string[];
  championsById: Map<string, Champion>;
  onRemove: (championId: string) => void;
}

export function PoolCategory({
  tier,
  championIds,
  championsById,
  onRemove,
}: PoolCategoryProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `category:${tier}`,
    data: { type: "category", tier },
  });
  const champions = championIds
    .map((championId) => championsById.get(championId))
    .filter((champion): champion is Champion => Boolean(champion));

  return (
    <section className="pool-category" data-tier={tier} data-over={isOver}>
      <header>
        <h3>{POOL_TIER_LABELS[tier]}</h3>
        <span>{champions.length}</span>
      </header>
      <div ref={setNodeRef} className="pool-category-list">
        <SortableContext
          items={champions.map((champion) => `${tier}:${champion.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {champions.map((champion) => (
            <SortableChampion
              champion={champion}
              tier={tier}
              onRemove={() => onRemove(champion.id)}
              key={champion.id}
            />
          ))}
        </SortableContext>
        {champions.length === 0 && (
          <div className="pool-empty">
            Arraste campeões para cá
            <span>Esta categoria está vazia.</span>
          </div>
        )}
      </div>
    </section>
  );
}

