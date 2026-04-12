import path from "node:path";
import YAML from "yaml";
import { schemaTemplates } from "../templates/schema.js";
import type { InitRenderContext } from "../templates/wiki.js";
import type { TemplateKey } from "../types.js";
import { exists, readTextFile } from "./fs.js";

interface ConfigShape {
  name?: string;
  root?: string;
  template?: TemplateKey;
  created?: string;
  languagePreference?: string;
}

export async function loadInitRenderContext(rootDir: string): Promise<InitRenderContext> {
  const configPath = path.join(rootDir, ".wiki", "config.yaml");
  const schemaPath = path.join(rootDir, ".wiki", "schema.md");
  const config = await readConfig(configPath);

  const templateKey = config.template && schemaTemplates[config.template] ? config.template : "learning";
  const template = schemaTemplates[templateKey];
  const schemaText = await safeRead(schemaPath);
  const pageTypeNames = schemaText.length > 0
    ? extractPageTypes(schemaText, template.pageTypes.map((pageType) => pageType.name))
    : template.pageTypes.map((pageType) => pageType.name);

  return {
    wikiName: config.name || path.basename(rootDir),
    absoluteRoot: rootDir,
    cliCommand: getCliCommand(),
    domainDescription: extractDomainDescription(schemaText) || `${template.title} workspace.`,
    languagePreference: config.languagePreference || "中文",
    template,
    pageTypeNames,
    createdAt: config.created || new Date().toISOString(),
  };
}

function getCliCommand(): string {
  const cliEntry = process.argv[1];
  if (!cliEntry) {
    return "llm-wiki";
  }

  return `node ${JSON.stringify(cliEntry.replace(/\\/g, "/"))}`;
}

async function readConfig(configPath: string): Promise<ConfigShape> {
  if (!(await exists(configPath))) {
    return {};
  }

  try {
    const raw = await readTextFile(configPath);
    return (YAML.parse(raw) as ConfigShape | null) ?? {};
  } catch {
    return {};
  }
}

async function safeRead(targetPath: string): Promise<string> {
  try {
    return await readTextFile(targetPath);
  } catch {
    return "";
  }
}

function extractDomainDescription(schemaText: string): string | null {
  const match = schemaText.match(/## Domain Description\s+([\s\S]*?)(?:\n## |\s*$)/);
  return match?.[1]?.trim() || null;
}

function extractPageTypes(schemaText: string, fallback: string[]): string[] {
  const matches = [...schemaText.matchAll(/^###\s+([^\r\n]+)$/gm)].map((match) => match[1].trim());
  return matches.length > 0 ? matches : fallback;
}
