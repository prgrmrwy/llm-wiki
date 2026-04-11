import { readRegistry } from "../registry.js";
import { printTable } from "../utils/output.js";
import { pathHasWiki } from "../utils/fs.js";

export async function runListCommand(): Promise<void> {
  const registry = await readRegistry();
  if (registry.wikis.length === 0) {
    console.log("No wikis registered.");
    return;
  }

  const rows: string[][] = [];
  let hasMissing = false;
  for (const entry of registry.wikis) {
    const active = await pathHasWiki(entry.path);
    hasMissing ||= !active;
    rows.push([
      entry.name,
      active ? "active" : "missing",
      entry.path,
      entry.description,
    ]);
  }

  printTable(["name", "status", "path", "description"], rows);
  if (hasMissing) {
    console.log("\nRun `llm-wiki gc` to remove missing entries.");
  }
}
