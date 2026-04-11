import path from "node:path";
import YAML from "yaml";
import type { RegistryData, RegistryEntry } from "./types.js";
import { ensureDir, getUserHome, readTextFile, writeTextFile } from "./utils/fs.js";

const REGISTRY_DIR = path.join(getUserHome(), ".llm-wiki");
const REGISTRY_PATH = path.join(REGISTRY_DIR, "registry.yaml");

function createEmptyRegistry(): RegistryData {
  return { wikis: [] };
}

function normalizeRegistryEntry(input: unknown): RegistryEntry | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name : "";
  const targetPath = typeof record.path === "string" ? record.path : "";
  const description = typeof record.description === "string" ? record.description : "";
  const created = typeof record.created === "string" ? record.created : "";

  if (!name || !targetPath) {
    return null;
  }

  return {
    name,
    path: targetPath,
    description,
    created,
  };
}

export function getRegistryPath(): string {
  return REGISTRY_PATH;
}

export async function readRegistry(): Promise<RegistryData> {
  try {
    const raw = await readTextFile(REGISTRY_PATH);
    const parsed = YAML.parse(raw) as Partial<RegistryData> | null;
    return {
      wikis: Array.isArray(parsed?.wikis)
        ? parsed.wikis.map((entry) => normalizeRegistryEntry(entry)).filter((entry): entry is RegistryEntry => Boolean(entry))
        : [],
    };
  } catch {
    return createEmptyRegistry();
  }
}

export async function writeRegistry(data: RegistryData): Promise<void> {
  await ensureDir(REGISTRY_DIR);
  const serialized = [
    "wikis:",
    ...data.wikis.flatMap((entry) => [
      `  - name: ${JSON.stringify(entry.name)}`,
      `    path: ${JSON.stringify(entry.path)}`,
      `    description: ${JSON.stringify(entry.description)}`,
      `    created: ${JSON.stringify(entry.created)}`,
    ]),
    "",
  ].join("\n");
  await writeTextFile(REGISTRY_PATH, serialized);
}

export async function upsertRegistryEntry(entry: RegistryEntry): Promise<void> {
  const registry = await readRegistry();
  const filtered = registry.wikis.filter((item) => item.name !== entry.name && item.path !== entry.path);
  filtered.push(entry);
  await writeRegistry({ wikis: filtered });
}

export async function deleteRegistryEntries(names: string[]): Promise<void> {
  const registry = await readRegistry();
  const remaining = registry.wikis.filter((entry) => !names.includes(entry.name));
  await writeRegistry({ wikis: remaining });
}

export async function getRegistryEntryByName(name: string): Promise<RegistryEntry | undefined> {
  const registry = await readRegistry();
  return registry.wikis.find((entry) => entry.name === name);
}
