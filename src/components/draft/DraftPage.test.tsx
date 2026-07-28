import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultPersistedState } from "../../domain/defaults";
import { champions } from "../../test/fixtures";
import { useAppStore } from "../../store/appStore";
import { ToastProvider } from "../ui/ToastProvider";
import { DraftPage } from "./DraftPage";

describe("fluxo principal de seleção", () => {
  beforeEach(() => {
    useAppStore.setState({
      ...createDefaultPersistedState(),
      champions,
      hydrated: true,
      recoveredState: false,
    });
  });

  it("abre um slot, pesquisa e preenche o campeão selecionado", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <DraftPage onOpenSettings={() => undefined} />
      </ToastProvider>,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Selecionar campeão em Topo do meu time",
      }),
    );
    const search = screen.getByRole("searchbox", { name: "Buscar campeão" });
    await user.type(search, "morde");
    await user.click(screen.getByRole("option", { name: /Mordekaiser/ }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Mordekaiser")).toBeInTheDocument();
    expect(useAppStore.getState().draft.picks.ally.TOP).toBe("Mordekaiser");
  });
});
