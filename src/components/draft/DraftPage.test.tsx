import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultPersistedState } from "../../domain/defaults";
import { applyLcuSnapshot } from "../../domain/lcuReconciliation";
import { championId, champions } from "../../test/fixtures";
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

  it("exibe inimigo sincronizado sem posição e permite atribuir e desfazer a função", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    const detected = applyLcuSnapshot(createDefaultPersistedState().draft, {
      sessionKey: "session-ui",
      phase: "BAN_PICK",
      sequence: 1,
      allyPicks: [],
      enemyPicks: [championId("Aurora")],
      bans: { ally: [], enemy: [] },
      unknownChampionIds: [],
    });
    useAppStore.setState({
      draft: detected,
      lcuStatus: { state: "champ-select", message: null },
    });

    render(
      <ToastProvider>
        <DraftPage onOpenSettings={() => undefined} />
      </ToastProvider>,
    );

    expect(screen.getByText("Picks inimigos detectados")).toBeInTheDocument();
    expect(screen.getByText("Draft sincronizado")).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Definir posição de Aurora" }),
      "MID",
    );

    expect(useAppStore.getState().draft.picks.enemy.MID).toBe(championId("Aurora"));
    await user.click(screen.getByRole("button", { name: /Copiar draft/ }));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("MID: Aurora"),
    );
    await user.click(
      screen.getByRole("button", { name: "Retornar Aurora para sem posição" }),
    );
    expect(useAppStore.getState().draft.picks.enemy.MID).toBeNull();
    expect(useAppStore.getState().draft.unassignedPicks.enemy[0]?.championId).toBe(
      championId("Aurora"),
    );
  });
});
