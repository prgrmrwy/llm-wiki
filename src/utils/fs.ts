import { access, copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function exists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(targetPath: string): Promise<void> {
  await mkdir(targetPath, { recursive: true });
}

export async function writeTextFile(targetPath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(targetPath));
  await writeFile(targetPath, content, "utf8");
}

export async function readTextFile(targetPath: string): Promise<string> {
  return readFile(targetPath, "utf8");
}

export function getUserHome(): string {
  return os.homedir();
}

export async function isDirectory(targetPath: string): Promise<boolean> {
  try {
    return (await stat(targetPath)).isDirectory();
  } catch {
    return false;
  }
}

export async function pathHasWiki(targetPath: string): Promise<boolean> {
  return isDirectory(path.join(targetPath, ".wiki"));
}

export async function listDirectoryNames(targetPath: string): Promise<string[]> {
  if (!(await exists(targetPath))) {
    return [];
  }

  const entries = await readdir(targetPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

export async function copyFileWithDirs(source: string, destination: string): Promise<void> {
  await ensureDir(path.dirname(destination));
  await copyFile(source, destination);
}
