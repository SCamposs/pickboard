import { load } from "@tauri-apps/plugin-store";
import { createDefaultPersistedState } from "../domain/defaults";
import type { PersistedState } from "../domain/types";
import { hydratePersistedState, type HydratedStateResult } from "../domain/schemas";
import { isTauriRuntime } from "./environment";

const STORE_KEY = "state";
const LOCAL_STORAGE_KEY = "pickboard-state";

export async function loadPersistedState(): Promise<HydratedStateResult> {
  try {
    if (isTauriRuntime()) {
      const store = await load("pickboard-state.json", { autoSave: 150 });
      const raw = await store.get<unknown>(STORE_KEY);
      return raw === undefined
        ? { state: createDefaultPersistedState(), recovered: false }
        : hydratePersistedState(raw);
    }
    const serialized = localStorage.getItem(LOCAL_STORAGE_KEY);
    return serialized
      ? hydratePersistedState(JSON.parse(serialized) as unknown)
      : { state: createDefaultPersistedState(), recovered: false };
  } catch {
    return hydratePersistedState(undefined);
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export function schedulePersistedState(state: PersistedState): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void savePersistedState(state);
  }, 160);
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  if (isTauriRuntime()) {
    const store = await load("pickboard-state.json", { autoSave: 150 });
    await store.set(STORE_KEY, state);
    await store.save();
    return;
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
}
