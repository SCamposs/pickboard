import { confirm } from "@tauri-apps/plugin-dialog";
import { isTauriRuntime } from "./environment";

export async function confirmAction(
  message: string,
  title = "Confirmar ação",
  kind: "info" | "warning" = "warning",
): Promise<boolean> {
  if (isTauriRuntime()) {
    return confirm(message, { title, kind });
  }
  return window.confirm(message);
}

