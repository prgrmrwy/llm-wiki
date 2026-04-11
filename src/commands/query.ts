import { ensureQmdIndex, queryQmd, runQmdQueryText } from "../utils/qmd.js";
import { detectWikiRoot } from "../utils/wiki.js";

interface QueryCommandOptions {
  question: string;
  json: boolean;
}

export async function runQueryCommand(options: QueryCommandOptions): Promise<void> {
  const wikiRoot = await detectWikiRoot();
  if (!wikiRoot) {
    throw new Error("未找到 wiki 根目录；请在 wiki 内部目录执行，或先运行 llm-wiki init。");
  }

  const indexStatus = await ensureQmdIndex(wikiRoot);
  if (indexStatus.warning) {
    console.error(indexStatus.warning);
  }

  if (options.json) {
    const results = await queryQmd(wikiRoot, options.question);
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  await runQmdQueryText(wikiRoot, options.question);
}
