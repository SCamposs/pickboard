import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriRuntime } from "./environment";

export async function applyAlwaysOnTop(enabled: boolean): Promise<void> {
  if (!isTauriRuntime()) return;
  await getCurrentWindow().setAlwaysOnTop(enabled);
}

