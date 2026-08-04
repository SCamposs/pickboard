import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../ui/ToastProvider";
import { AppUpdateProvider } from "./AppUpdateProvider";

const updaterMocks = vi.hoisted(() => ({
  findAppUpdate: vi.fn(),
  installAppUpdate: vi.fn(),
}));

vi.mock("../../services/appUpdate", () => updaterMocks);

describe("AppUpdateProvider", () => {
  beforeEach(() => {
    updaterMocks.findAppUpdate.mockReset();
    updaterMocks.installAppUpdate.mockReset();
  });

  it("checks silently on startup and only opens the dialog when an update exists", async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    const update = { version: "0.3.0", close };
    updaterMocks.findAppUpdate.mockResolvedValue(update);

    render(
      <ToastProvider>
        <AppUpdateProvider>
          <div>PickBoard</div>
        </AppUpdateProvider>
      </ToastProvider>,
    );

    expect(await screen.findByRole("dialog", { name: "PickBoard 0.3.0" })).toBeInTheDocument();
    expect(screen.getByText("Nova versão disponível")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Agora não" }));
    expect(close).toHaveBeenCalledOnce();
  });

  it("downloads, installs, and requests a restart after confirmation", async () => {
    const update = { version: "0.3.0", close: vi.fn() };
    updaterMocks.findAppUpdate.mockResolvedValue(update);
    updaterMocks.installAppUpdate.mockResolvedValue(undefined);

    render(
      <ToastProvider>
        <AppUpdateProvider>
          <div>PickBoard</div>
        </AppUpdateProvider>
      </ToastProvider>,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "Atualizar e reiniciar" }),
    );

    expect(updaterMocks.installAppUpdate).toHaveBeenCalledWith(update, expect.any(Function));
  });
});
