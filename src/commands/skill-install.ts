import { select } from "@inquirer/prompts";
import path from "node:path";
import { getRegistryEntryByName, readRegistry } from "../registry.js";
import { copyFileWithDirs, ensureDir, getUserHome } from "../utils/fs.js";

interface SkillInstallOptions {
  wikiName: string;
}

export async function runSkillInstallCommand(options: SkillInstallOptions): Promise<void> {
  const entry = await getRegistryEntryByName(options.wikiName);
  if (!entry) {
    const registry = await readRegistry();
    const available = registry.wikis.map((item) => item.name).join(", ");
    throw new Error(
      available.length > 0
        ? `未找到 wiki "${options.wikiName}"。可用项: ${available}`
        : `未找到 wiki "${options.wikiName}"，且注册表为空。`,
    );
  }

  const source = path.join(entry.path, ".claude", "skills", entry.name, "SKILL.md");
  const scope = await select<"user" | "project">({
    message: "选择安装 scope：",
    choices: [
      {
        name: "user",
        value: "user",
        description: "~/.claude/skills/",
      },
      {
        name: "project",
        value: "project",
        description: ".claude/skills/",
      },
    ],
  });

  const destination = scope === "user"
    ? path.join(getUserHome(), ".claude", "skills", entry.name, "SKILL.md")
    : path.join(process.cwd(), ".claude", "skills", entry.name, "SKILL.md");

  await ensureDir(path.dirname(destination));
  await copyFileWithDirs(source, destination);
  console.log(`Installed skill to ${destination}`);
}
