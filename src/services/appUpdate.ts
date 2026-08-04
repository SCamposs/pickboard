import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import packageJson from "../../package.json";
import { isTauriRuntime } from "./environment";

export const APP_VERSION = packageJson.version;
export type AvailableAppUpdate = Update;

export async function findAppUpdate(): Promise<AvailableAppUpdate | null> {
  if (!isTauriRuntime()) return null;
  return check({ timeout: 15_000 });
}

export async function installAppUpdate(
  update: AvailableAppUpdate,
  onEvent: (event: DownloadEvent) => void,
): Promise<void> {
  await update.downloadAndInstall(onEvent, { timeout: 120_000 });
  await relaunch();
}
