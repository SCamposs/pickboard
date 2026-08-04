import { readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const localSigningKey = path.join(root, ".tauri", "pickboard.key");
const localSigningPassword = path.join(root, ".tauri", "pickboard.key.password");

function run(script: "build:tauri" | "package:portable", env = process.env): void {
  const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `pnpm.cmd ${script}`]
      : [script];
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit" });
  if (result.status !== 0) {
    const detail = result.error?.message ?? `exit code ${result.status ?? "unknown"}`;
    throw new Error(`pnpm ${script} failed: ${detail}.`);
  }
}

async function main(): Promise<void> {
  const configuredSigningKey =
    process.env.TAURI_SIGNING_PRIVATE_KEY ?? process.env.TAURI_SIGNING_PRIVATE_KEY_PATH;
  if (!configuredSigningKey) {
    await Promise.all([stat(localSigningKey), stat(localSigningPassword)]).catch(() => {
      throw new Error(
        "Updater signing key or password not found. Configure the signing environment variables.",
      );
    });
  }
  const signingPassword =
    process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ??
    (!configuredSigningKey ? (await readFile(localSigningPassword, "utf8")).trim() : "");

  const env = {
    ...process.env,
    TAURI_SIGNING_PRIVATE_KEY: configuredSigningKey ?? localSigningKey,
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: signingPassword,
  };

  run("build:tauri", env);
  run("package:portable", env);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
