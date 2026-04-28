import path from "node:path";
import { ensureQmdIndex, queryQmd, runQmdQueryText } from "../utils/qmd.js";
import { pathHasWiki } from "../utils/fs.js";
import { detectWikiRoot } from "../utils/wiki.js";

interface QueryCommandOptions {
  question: string;
  json: boolean;
  root?: string;
}

export async function runQueryCommand(options: QueryCommandOptions): Promise<void> {
  const wikiRoot = await resolveQueryWikiRoot(options.root);
  if (!wikiRoot) {
    throw new Error("未找到 wiki 根目录；请在 wiki 内部目录执行，或通过 --root 指定 wiki 路径，或先运行 llm-wiki init。");
  }

  const indexStatus = await ensureQmdIndex(wikiRoot);
  if (indexStatus.warning) {
    console.error(`[info] ${indexStatus.warning}`);
  }

  if (options.json) {
    const results = await queryQmd(wikiRoot, options.question);
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  await runQmdQueryText(wikiRoot, options.question);
}

async function resolveQueryWikiRoot(explicitRoot: string | undefined): Promise<string | null> {
  if (explicitRoot && explicitRoot.length > 0) {
    const absolute = path.resolve(explicitRoot);
    if (!(await pathHasWiki(absolute))) {
      throw new Error(`--root 指定的路径不是 wiki 实例（缺少 .wiki/）：${absolute}`);
    }
    return absolute;
  }
  return detectWikiRoot();
}
