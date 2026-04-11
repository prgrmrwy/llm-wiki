import { confirm } from "@inquirer/prompts";
import { deleteRegistryEntries, readRegistry } from "../registry.js";
import { pathHasWiki } from "../utils/fs.js";

export async function runGcCommand(): Promise<void> {
  const registry = await readRegistry();
  const missing = [];

  for (const entry of registry.wikis) {
    if (!(await pathHasWiki(entry.path))) {
      missing.push(entry);
    }
  }

  if (missing.length === 0) {
    console.log("No missing entries.");
    return;
  }

  console.log("Missing wiki entries:");
  for (const entry of missing) {
    console.log(`- ${entry.name}: ${entry.path}`);
  }

  const accepted = await confirm({
    message: `Remove ${missing.length} missing entr${missing.length === 1 ? "y" : "ies"} from the registry?`,
    default: true,
  });

  if (!accepted) {
    console.log("GC cancelled.");
    return;
  }

  await deleteRegistryEntries(missing.map((entry) => entry.name));
  console.log(`Removed ${missing.length} missing entr${missing.length === 1 ? "y" : "ies"}.`);
}
