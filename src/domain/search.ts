import type { Champion } from "./types";

export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[\s\-'’.]/g, "")
    .replace(/[^\p{Letter}\p{Number}]/gu, "");
}

export function searchChampions(champions: Champion[], query: string): Champion[] {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return champions;

  return champions
    .filter((champion) => {
      if (champion.search.includes(normalizedQuery)) return true;
      return champion.aliases.some((alias) => normalizeSearch(alias).includes(normalizedQuery));
    })
    .sort((left, right) => {
      const leftExactAlias = left.aliases.some((alias) => normalizeSearch(alias) === normalizedQuery);
      const rightExactAlias = right.aliases.some((alias) => normalizeSearch(alias) === normalizedQuery);
      if (leftExactAlias !== rightExactAlias) return leftExactAlias ? -1 : 1;
      const leftStarts = left.search.startsWith(normalizedQuery);
      const rightStarts = right.search.startsWith(normalizedQuery);
      if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
      return left.name.localeCompare(right.name, "pt-BR");
    });
}

