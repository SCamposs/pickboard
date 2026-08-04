import { createContext, useContext } from "react";

export interface AppUpdateContextValue {
  checking: boolean;
  checkForAppUpdate: () => Promise<void>;
}

export const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

export function useAppUpdate(): AppUpdateContextValue {
  const value = useContext(AppUpdateContext);
  if (!value) throw new Error("useAppUpdate precisa estar dentro de AppUpdateProvider.");
  return value;
}
