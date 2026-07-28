import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { isTauriRuntime } from "./environment";

export async function copyText(text: string): Promise<void> {
  if (isTauriRuntime()) {
    await writeText(text);
    return;
  }
  await navigator.clipboard.writeText(text);
}

