import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import aliases from "../data/champion-aliases.json";
import embeddedSnapshot from "../data/champions.json";
import { normalizeSearch } from "../domain/search";
import type { Champion, ChampionCatalog } from "../domain/types";
import { isTauriRuntime } from "./environment";

const aliasesByChampion = new Map<string, string[]>();
for (const [alias, championName] of Object.entries(aliases)) {
  const key = normalizeSearch(championName);
  aliasesByChampion.set(key, [...(aliasesByChampion.get(key) ?? []), alias]);
}

function enrichAliases(champion: Champion): Champion {
  return {
    ...champion,
    aliases: [...new Set([...champion.aliases, ...(aliasesByChampion.get(champion.search) ?? [])])],
  };
}

export function getEmbeddedCatalog(): ChampionCatalog {
  return {
    version: embeddedSnapshot.version,
    champions: embeddedSnapshot.champions.map((champion) =>
      enrichAliases({ ...champion, source: "embedded" }),
    ),
  };
}

async function prepareDownloadedCatalog(catalog: ChampionCatalog): Promise<ChampionCatalog> {
  const root = await appLocalDataDir();
  return {
    version: catalog.version,
    champions: await Promise.all(
      catalog.champions.map(async (champion) =>
        enrichAliases({
          ...champion,
          image: convertFileSrc(await join(root, "champions", champion.image)),
          source: "downloaded",
        }),
      ),
    ),
  };
}

export async function loadChampionCatalog(): Promise<ChampionCatalog> {
  if (!isTauriRuntime()) return getEmbeddedCatalog();
  try {
    const catalog = await invoke<ChampionCatalog | null>("get_installed_champion_catalog");
    return catalog ? prepareDownloadedCatalog(catalog) : getEmbeddedCatalog();
  } catch {
    return getEmbeddedCatalog();
  }
}

export async function checkLatestChampionVersion(): Promise<string> {
  if (!isTauriRuntime()) {
    throw new Error("A verificação de atualização está disponível no aplicativo desktop.");
  }
  return invoke<string>("check_champion_version");
}

export async function installChampionCatalog(version: string): Promise<ChampionCatalog> {
  const catalog = await invoke<ChampionCatalog>("install_champion_update", { version });
  return prepareDownloadedCatalog(catalog);
}

export function championImageSource(champion: Champion): string {
  return champion.source === "downloaded" ? champion.image : `/champions/${champion.image}`;
}

