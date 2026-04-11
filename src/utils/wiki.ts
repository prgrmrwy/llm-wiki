import path from "node:path";
import { exists, pathHasWiki } from "./fs.js";

export async function detectWikiRoot(startDir: string = process.cwd()): Promise<string | null> {
  let currentDir = path.resolve(startDir);

  while (true) {
    if (await pathHasWiki(currentDir)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

export async function ensureNoExistingWiki(targetDir: string): Promise<void> {
  if (await exists(path.join(targetDir, ".wiki"))) {
    throw new Error("当前目录已是 wiki 实例。");
  }
}
