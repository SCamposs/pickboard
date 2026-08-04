import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AppUpdateProvider } from "./components/updates/AppUpdateProvider";
import { ToastProvider } from "./components/ui/ToastProvider";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <AppUpdateProvider>
        <App />
      </AppUpdateProvider>
    </ToastProvider>
  </StrictMode>,
);
