import { spawnSync } from "node:child_process";

export interface CommandCheckResult {
  ok: boolean;
  output: string;
}

export function checkCommand(command: string, args: string[] = []): CommandCheckResult {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    return {
      ok: false,
      output: result.error.message,
    };
  }

  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
}
