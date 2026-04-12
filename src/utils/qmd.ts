import { spawn, spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { loadInitRenderContext } from "./init-context.js";
import { ensureDir, exists, getUserHome, readTextFile, writeTextFile } from "./fs.js";
import { checkCommand } from "./process.js";

export interface QueryResult {
  path: string;
  score: number;
  excerpt: string[];
}

export interface IndexStatus {
  mode: "full" | "text-only";
  warning?: string;
}

interface QmdCommand {
  command: string;
  prefixArgs: string[];
}

export async function isQmdAvailable(): Promise<boolean> {
  return (await resolveQmdCommand()) !== null;
}

export async function ensureQmdIndex(wikiRoot: string, forceRefresh: boolean = false): Promise<IndexStatus> {
  const markerPath = path.join(wikiRoot, ".wiki", "qmd.yaml");
  if (!forceRefresh && await exists(markerPath)) {
    const existing = await readExistingIndexStatus(markerPath);
    return existing ?? { mode: "full" };
  }

  const context = await loadInitRenderContext(wikiRoot);
  const pagesDir = path.join(wikiRoot, "wiki", "pages");
  const qmd = await resolveQmdCommand();
  if (!qmd) {
    const warning = "未找到可用的 qmd CLI；将退回到本地文本搜索。";
    await writeIndexMarker(markerPath, {
      collection: context.wikiName,
      pagesDir,
      indexedAt: new Date().toISOString(),
      mode: "text-only",
      warning,
    });
    return { mode: "text-only", warning };
  }

  const addResult = spawnSync(
    qmd.command,
    [...qmd.prefixArgs, "collection", "add", pagesDir, "--name", context.wikiName, "--mask", "**/*.md"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const combinedOutput = `${addResult.stdout ?? ""}${addResult.stderr ?? ""}`.toLowerCase();
  if (addResult.status !== 0 && !combinedOutput.includes("exists")) {
    throw new Error(`qmd collection add 失败：${combinedOutput.trim() || "unknown error"}`);
  }

  await runQmd(["update"]);
  let status: IndexStatus = { mode: "full" };
  try {
    await runQmd(["embed"]);
  } catch (error) {
    status = {
      mode: "text-only",
      warning: `qmd embed 失败，已退回到文本搜索：${toErrorMessage(error)}`,
    };
  }

  await writeIndexMarker(markerPath, {
    collection: context.wikiName,
    pagesDir,
    indexedAt: new Date().toISOString(),
    mode: status.mode,
    warning: status.warning,
  });
  return status;
}

export async function queryQmd(wikiRoot: string, question: string): Promise<QueryResult[]> {
  const context = await loadInitRenderContext(wikiRoot);
  try {
    const raw = await runQmdCapture(["query", question, "--json", "-n", "10", "-c", context.wikiName]);
    const results = normalizeQueryResults(raw);
    return results.length > 0 ? results : fallbackTextSearch(wikiRoot, question);
  } catch {
    return fallbackTextSearch(wikiRoot, question);
  }
}

export async function runQmdQueryText(wikiRoot: string, question: string): Promise<void> {
  const context = await loadInitRenderContext(wikiRoot);
  try {
    await runQmd(["query", question, "-c", context.wikiName]);
  } catch {
    const results = await fallbackTextSearch(wikiRoot, question);
    printFallbackResults(results);
  }
}

export function getQmdIndexStatePaths(wikiRoot: string): string[] {
  return [
    path.join(wikiRoot, ".wiki", "qmd.yaml"),
  ];
}

function normalizeQueryResults(raw: string): QueryResult[] {
  const payload = extractJsonPayload(raw);
  const parsed = JSON.parse(payload) as unknown;
  const items = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { results?: unknown[] }).results)
      ? (parsed as { results: unknown[] }).results
      : [];

  return items.map((item) => normalizeQueryResultItem(item)).filter(Boolean) as QueryResult[];
}

function normalizeQueryResultItem(item: unknown): QueryResult | null {
  if (typeof item !== "object" || item === null) {
    return null;
  }

  const record = item as Record<string, unknown>;
  const resolvedPath = firstString(record.path, record.filepath, record.file, record.relativePath);
  const score = typeof record.score === "number" ? record.score : Number(record.score ?? 0);
  const excerpt = Array.isArray(record.excerpt)
    ? record.excerpt.filter((entry): entry is string => typeof entry === "string")
    : Array.isArray(record.snippets)
      ? record.snippets
          .map((entry) => {
            if (typeof entry === "string") {
              return entry;
            }
            if (typeof entry === "object" && entry !== null) {
              return firstString((entry as Record<string, unknown>).text, (entry as Record<string, unknown>).snippet);
            }
            return null;
          })
          .filter((entry): entry is string => Boolean(entry))
      : firstString(record.snippet)
        ? [firstString(record.snippet)!]
        : [];

  if (!resolvedPath) {
    return null;
  }

  return {
    path: resolvedPath,
    score: Number.isFinite(score) ? score : 0,
    excerpt,
  };
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}

async function runQmd(args: string[]): Promise<void> {
  const qmd = await resolveQmdCommand();
  if (!qmd) {
    throw new Error("未找到可用的 qmd CLI；请安装 `@tobilu/qmd`，或检查全局安装是否可执行。");
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(qmd.command, [...qmd.prefixArgs, ...args], {
      stdio: "inherit",
    });

    child.on("error", (error) => {
      reject(new Error(`无法执行 qmd：${error.message}`));
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`qmd ${args.join(" ")} exited with code ${code ?? "unknown"}.`));
    });
  });
}

async function runQmdCapture(args: string[]): Promise<string> {
  const qmd = await resolveQmdCommand();
  if (!qmd) {
    throw new Error("未找到可用的 qmd CLI；请安装 `@tobilu/qmd`，或检查全局安装是否可执行。");
  }

  return new Promise<string>((resolve, reject) => {
    const child = spawn(qmd.command, [...qmd.prefixArgs, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      reject(new Error(`无法执行 qmd：${error.message}`));
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(stderr.trim() || `qmd ${args.join(" ")} exited with code ${code ?? "unknown"}.`));
    });
  });
}

async function fallbackTextSearch(wikiRoot: string, question: string): Promise<QueryResult[]> {
  const pagesDir = path.join(wikiRoot, "wiki", "pages");
  const files = await collectMarkdownFiles(pagesDir);
  const tokens = tokenize(question);
  const results: QueryResult[] = [];

  for (const filePath of files) {
    const text = await readTextFile(filePath);
    const normalized = text.toLowerCase();
    const score = tokens.reduce((total, token) => total + countOccurrences(normalized, token), 0);
    if (score === 0) {
      continue;
    }

    const excerpt = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && tokens.some((token) => line.toLowerCase().includes(token)))
      .slice(0, 3);

    results.push({
      path: filePath,
      score,
      excerpt,
    });
  }

  return results.sort((left, right) => right.score - left.score).slice(0, 10);
}

async function collectMarkdownFiles(rootDir: string): Promise<string[]> {
  if (!(await exists(rootDir))) {
    return [];
  }

  const entries = await readdir(rootDir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const resolved = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      return collectMarkdownFiles(resolved);
    }
    return entry.isFile() && resolved.endsWith(".md") ? [resolved] : [];
  }));

  return nested.flat();
}

function tokenize(question: string): string[] {
  return [...new Set(question
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2))];
}

function countOccurrences(text: string, token: string): number {
  let total = 0;
  let index = 0;
  while ((index = text.indexOf(token, index)) !== -1) {
    total += 1;
    index += token.length;
  }
  return total;
}

function printFallbackResults(results: QueryResult[]): void {
  if (results.length === 0) {
    console.log("No results found.");
    return;
  }

  console.log("qmd unavailable or degraded; showing local text matches:");
  for (const result of results) {
    console.log(`- ${result.path} (${result.score})`);
    for (const snippet of result.excerpt) {
      console.log(`  ${snippet}`);
    }
  }
}

function extractJsonPayload(raw: string): string {
  const cleaned = stripAnsi(raw).trim();
  const candidates = [cleaned.indexOf("["), cleaned.indexOf("{")].filter((value) => value >= 0);
  if (candidates.length === 0) {
    throw new Error("qmd 未返回有效 JSON。");
  }

  const start = Math.min(...candidates);
  const open = cleaned[start];
  const close = open === "[" ? "]" : "}";
  const end = cleaned.lastIndexOf(close);
  if (end < start) {
    throw new Error("qmd 返回的 JSON 结构不完整。");
  }

  return cleaned.slice(start, end + 1);
}

function stripAnsi(value: string): string {
  return value.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "");
}

async function readExistingIndexStatus(markerPath: string): Promise<IndexStatus | null> {
  try {
    const raw = await readTextFile(markerPath);
    const parsed = YAML.parse(raw) as { mode?: unknown; warning?: unknown } | null;
    const mode = parsed?.mode === "text-only" ? "text-only" : "full";
    const warning = typeof parsed?.warning === "string" ? parsed.warning : undefined;
    return { mode, warning };
  } catch {
    return null;
  }
}

async function writeIndexMarker(
  markerPath: string,
  data: {
    collection: string;
    pagesDir: string;
    indexedAt: string;
    mode: "full" | "text-only";
    warning?: string;
  },
): Promise<void> {
  await ensureDir(path.dirname(markerPath));
  await writeTextFile(markerPath, YAML.stringify(data));
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function resolveQmdCommand(): Promise<QmdCommand | null> {
  const nativeQmd = checkCommand("qmd", ["--help"]);
  if (nativeQmd.ok) {
    return {
      command: "qmd",
      prefixArgs: [],
    };
  }

  for (const candidate of await getFallbackQmdEntryCandidates()) {
    if (!(await exists(candidate))) {
      continue;
    }

    const probe = checkCommand("node", [candidate, "--help"]);
    if (probe.ok) {
      return {
        command: "node",
        prefixArgs: [candidate],
      };
    }
  }

  return null;
}

async function getFallbackQmdEntryCandidates(): Promise<string[]> {
  const npmRoot = checkCommand("npm", ["root", "-g"]);
  const npmGlobalRoot = npmRoot.ok ? npmRoot.output.split(/\r?\n/)[0]?.trim() : "";
  const candidates = [
    path.join(path.dirname(process.execPath), "node_modules", "@tobilu", "qmd", "dist", "cli", "qmd.js"),
    path.join(getUserHome(), "AppData", "Roaming", "npm", "node_modules", "@tobilu", "qmd", "dist", "cli", "qmd.js"),
    path.join(getUserHome(), ".npm-global", "lib", "node_modules", "@tobilu", "qmd", "dist", "cli", "qmd.js"),
    path.join("/usr/local/lib/node_modules", "@tobilu", "qmd", "dist", "cli", "qmd.js"),
    path.join("/opt/homebrew/lib/node_modules", "@tobilu", "qmd", "dist", "cli", "qmd.js"),
  ];

  if (npmGlobalRoot) {
    candidates.push(path.join(npmGlobalRoot, "@tobilu", "qmd", "dist", "cli", "qmd.js"));
  }

  return [...new Set(candidates)];
}
