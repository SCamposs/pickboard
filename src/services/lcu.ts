import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Champion, LcuDraftSnapshot, LcuStatus } from "../domain/types";

const STATUS_EVENT = "pickboard://lcu-status";
const SNAPSHOT_EVENT = "pickboard://lcu-snapshot";

export async function configureLcuCatalog(champions: Champion[]): Promise<void> {
  await invoke("configure_lcu_catalog", {
    champions: champions.map(({ key, id }) => ({ key, id })),
  });
}

export async function setLcuSyncEnabled(enabled: boolean): Promise<void> {
  await invoke("set_lcu_sync_enabled", { enabled });
}

export async function getLcuStatus(): Promise<LcuStatus> {
  return invoke<LcuStatus>("get_lcu_status");
}

export function onLcuStatus(handler: (status: LcuStatus) => void): Promise<UnlistenFn> {
  return listen<LcuStatus>(STATUS_EVENT, (event) => handler(event.payload));
}

export function onLcuSnapshot(
  handler: (snapshot: LcuDraftSnapshot) => void,
): Promise<UnlistenFn> {
  return listen<LcuDraftSnapshot>(SNAPSHOT_EVENT, (event) => handler(event.payload));
}
