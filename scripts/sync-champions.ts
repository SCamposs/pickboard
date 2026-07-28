import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { z } from "zod";

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, "src", "data", "champions.json");
const ALIASES_PATH = path.join(ROOT, "src", "data", "champion-aliases.json");
const IMAGE_DIR = path.join(ROOT, "public", "champions");
const VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";

const dataDragonChampionSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  name: z.string().min(1),
  image: z.object({ full: z.string().min(1) }),
});

const dataDragonSchema = z.object({
  data: z.record(z.string(), dataDragonChampionSchema),
});

const aliasesSchema = z.record(z.string(), z.string());

interface ChampionSnapshot {
  version: string;
  generatedAt: string;
  champions: Array<{
    id: string;
    key: string;
    name: string;
    image: string;
    search: string;
    aliases: string[];
  }>;
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[\s\-'’.]/g, "")
    .replace(/[^\p{Letter}\p{Number}]/gu, "");
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} ao consultar ${url}`);
  }
  return response.json() as Promise<unknown>;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await task(items[index]);
    }
  });
  await Promise.all(workers);
}

async function main(): Promise<void> {
  console.log("Consultando a versão estável mais recente do Data Dragon...");
  const versions = z.array(z.string().min(1)).min(1).parse(await fetchJson(VERSIONS_URL));
  const version = versions[0];
  const aliases = aliasesSchema.parse(JSON.parse(await readFile(ALIASES_PATH, "utf8")));

  let installed: ChampionSnapshot | undefined;
  try {
    installed = JSON.parse(await readFile(DATA_PATH, "utf8")) as ChampionSnapshot;
  } catch {
    installed = undefined;
  }

  const dataUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/data/pt_BR/champion.json`;
  const payload = dataDragonSchema.parse(await fetchJson(dataUrl));
  const aliasesByChampion = new Map<string, string[]>();
  for (const [alias, championName] of Object.entries(aliases)) {
    const current = aliasesByChampion.get(normalizeSearch(championName)) ?? [];
    current.push(alias);
    aliasesByChampion.set(normalizeSearch(championName), current);
  }

  const champions = Object.values(payload.data)
    .map((champion) => ({
      id: champion.id,
      key: champion.key,
      name: champion.name,
      image: champion.image.full,
      search: normalizeSearch(champion.name),
      aliases: (aliasesByChampion.get(normalizeSearch(champion.name)) ?? []).sort(),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));

  if (champions.length < 160) {
    throw new Error(`O snapshot recebido contém apenas ${champions.length} campeões.`);
  }

  await mkdir(IMAGE_DIR, { recursive: true });
  const missingImages = [];
  for (const champion of champions) {
    if (!(await fileExists(path.join(IMAGE_DIR, champion.image)))) {
      missingImages.push(champion);
    }
  }

  if (installed?.version === version && missingImages.length === 0) {
    console.log(`Snapshot ${version} já está completo (${champions.length} campeões).`);
    return;
  }

  console.log(`Baixando ${missingImages.length} ícones da versão ${version}...`);
  await mapWithConcurrency(missingImages, 8, async (champion) => {
    const imageUrl =
      `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.image}`;
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Falha ao baixar ${champion.name}: ${response.status} ${response.statusText}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 100) {
      throw new Error(`O ícone recebido para ${champion.name} é inválido.`);
    }
    await writeFile(path.join(IMAGE_DIR, champion.image), bytes);
  });

  const snapshot: ChampionSnapshot = {
    version,
    generatedAt: new Date().toISOString(),
    champions,
  };
  await writeFile(DATA_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Snapshot ${version} salvo com ${champions.length} campeões e ícones locais.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Falha ao sincronizar campeões: ${message}`);
  process.exitCode = 1;
});

