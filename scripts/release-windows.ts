import { stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const localSigningKey = path.join(root, ".tauri", "pickboard.key");

function run(command: string, args: string[], env = process.env): void {
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

async function main(): Promise<void> {
  const hasSigningKey = Boolean(
    process.env.TAURI_SIGNING_PRIVATE_KEY || process.env.TAURI_SIGNING_PRIVATE_KEY_PATH,
  );
  if (!hasSigningKey) {
    await stat(localSigningKey).catch(() => {
      throw new Error(
        "Updater signing key not found. Set TAURI_SIGNING_PRIVATE_KEY or TAURI_SIGNING_PRIVATE_KEY_PATH.",
      );
    });
  }

  const env = {
    ...process.env,
    ...(!hasSigningKey ? { TAURI_SIGNING_PRIVATE_KEY_PATH: localSigningKey } : {}),
  };

  run("pnpm.cmd", ["build:tauri"], env);
  run("pnpm.cmd", ["package:portable"], env);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
