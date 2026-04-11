import { ensureQmdIndex } from "../utils/qmd.js";
import { detectWikiRoot } from "../utils/wiki.js";

export async function runIndexCommand(): Promise<void> {
  const wikiRoot = await detectWikiRoot();
  if (!wikiRoot) {
    throw new Error("未找到 wiki 根目录；请在 wiki 实例内运行 index。");
  }

  const status = await ensureQmdIndex(wikiRoot, true);
  if (status.mode === "full") {
    console.log("qmd index is ready.");
    return;
  }

  console.log(status.warning ?? "qmd embed unavailable; text-only fallback is ready.");
}
