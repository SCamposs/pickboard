import { create } from "zustand";
import { assignBan, assignPick, swapTeams, validateChampionForTarget } from "../domain/draftValidation";
import { createDefaultPersistedState, createEmptyDraft } from "../domain/defaults";
import { placeChampionInPool, removeChampionFromPool, reorderPoolTier } from "../domain/poolOperations";
import {
  POOL_TIERS,
  ROLES,
  TEAM_SIDES,
  type AppSettings,
  type Champion,
  type PersistedState,
  type PickerTarget,
  type PoolTier,
  type Role,
  type UserProfile,
  type ValidationResult,
} from "../domain/types";
import {
  getEmbeddedCatalog,
  installChampionCatalog,
  loadChampionCatalog,
} from "../services/championCatalog";
import { loadPersistedState, savePersistedState, schedulePersistedState } from "../services/persistence";
import { applyAlwaysOnTop } from "../services/window";

interface AppStore extends PersistedState {
  champions: Champion[];
  hydrated: boolean;
  recoveredState: boolean;
  initialize: () => Promise<void>;
  chooseChampion: (
    target: PickerTarget,
    championId: string,
    removeExistingPick?: boolean,
  ) => ValidationResult;
  clearTarget: (target: PickerTarget) => void;
  clearPicks: () => void;
  clearBans: () => void;
  startNewMatch: () => void;
  invertTeams: () => void;
  setPrimaryRole: (role: Role) => void;
  toggleAdditionalRole: (role: Role) => void;
  setSetting: <Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) => void;
  setProfile: <Key extends keyof UserProfile>(key: Key, value: UserProfile[Key]) => void;
  placePoolChampion: (role: Role, tier: PoolTier, championId: string, index?: number) => void;
  removePoolChampion: (role: Role, championId: string) => void;
  reorderPoolChampion: (
    role: Role,
    tier: PoolTier,
    championId: string,
    overChampionId: string,
  ) => void;
  resetDefaults: () => Promise<void>;
  installChampionUpdate: (version: string) => Promise<void>;
}

const initialPersistedState = createDefaultPersistedState();
const embeddedCatalog = getEmbeddedCatalog();

function persistedSlice(state: AppStore): PersistedState {
  return {
    schemaVersion: state.schemaVersion,
    championDataVersion: state.championDataVersion,
    draft: state.draft,
    pools: state.pools,
    profile: state.profile,
    settings: state.settings,
  };
}

export const useAppStore = create<AppStore>((set, get) => {
  const persist = (): void => schedulePersistedState(persistedSlice(get()));
  const update = (partial: Partial<AppStore> | ((state: AppStore) => Partial<AppStore>)): void => {
    set(partial);
    persist();
  };

  return {
    ...initialPersistedState,
    champions: embeddedCatalog.champions,
    hydrated: false,
    recoveredState: false,

    initialize: async () => {
      const [{ state, recovered }, catalog] = await Promise.all([
        loadPersistedState(),
        loadChampionCatalog(),
      ]);
      const nextState = {
        ...state,
        championDataVersion: catalog.version,
        champions: catalog.champions,
        hydrated: true,
        recoveredState: recovered,
        draft: state.settings.clearDraftOnStart ? createEmptyDraft() : state.draft,
      };
      set(nextState);
      await applyAlwaysOnTop(state.settings.alwaysOnTop).catch(() => undefined);
      if (state.settings.clearDraftOnStart) {
        await savePersistedState(persistedSlice(get()));
      }
    },

    chooseChampion: (target, championId, removeExistingPick = false) => {
      const validation = validateChampionForTarget(get().draft, championId, target);
      if (!validation.allowed && !(validation.requiresPickRemoval && removeExistingPick)) {
        return validation;
      }
      const draft =
        target.kind === "pick"
          ? assignPick(get().draft, target.side, target.role, championId)
          : assignBan(get().draft, target.side, target.index, championId, removeExistingPick);
      update({ draft });
      return { allowed: true };
    },

    clearTarget: (target) => {
      const draft = structuredClone(get().draft);
      if (target.kind === "pick") draft.picks[target.side][target.role] = null;
      else draft.bans[target.side][target.index] = null;
      update({ draft });
    },

    clearPicks: () => {
      const draft = structuredClone(get().draft);
      for (const side of TEAM_SIDES) {
        for (const role of ROLES) draft.picks[side][role] = null;
      }
      update({ draft });
    },

    clearBans: () => {
      const draft = structuredClone(get().draft);
      for (const side of TEAM_SIDES) draft.bans[side] = Array.from({ length: 5 }, () => null);
      update({ draft });
    },

    startNewMatch: () => update({ draft: createEmptyDraft() }),
    invertTeams: () => update({ draft: swapTeams(get().draft) }),

    setPrimaryRole: (role) =>
      update((state) => ({
        settings: {
          ...state.settings,
          primaryRole: role,
          additionalRoles: state.settings.additionalRoles.filter((item) => item !== role),
        },
      })),

    toggleAdditionalRole: (role) => {
      const { settings } = get();
      if (role === settings.primaryRole) return;
      const contains = settings.additionalRoles.includes(role);
      update({
        settings: {
          ...settings,
          additionalRoles: contains
            ? settings.additionalRoles.filter((item) => item !== role)
            : [...settings.additionalRoles, role],
        },
      });
    },

    setSetting: (key, value) => {
      update((state) => ({ settings: { ...state.settings, [key]: value } }));
      if (key === "alwaysOnTop") {
        void applyAlwaysOnTop(value as boolean);
      }
    },

    setProfile: (key, value) =>
      update((state) => ({ profile: { ...state.profile, [key]: value } })),

    placePoolChampion: (role, tier, championId, index) =>
      update((state) => ({
        pools: placeChampionInPool(state.pools, role, tier, championId, index),
      })),

    removePoolChampion: (role, championId) =>
      update((state) => ({ pools: removeChampionFromPool(state.pools, role, championId) })),

    reorderPoolChampion: (role, tier, championId, overChampionId) =>
      update((state) => ({
        pools: reorderPoolTier(state.pools, role, tier, championId, overChampionId),
      })),

    resetDefaults: async () => {
      const defaults = createDefaultPersistedState();
      set({ ...defaults, champions: get().champions, hydrated: true, recoveredState: false });
      await applyAlwaysOnTop(false).catch(() => undefined);
      await savePersistedState(defaults);
    },

    installChampionUpdate: async (version) => {
      const catalog = await installChampionCatalog(version);
      update({ champions: catalog.champions, championDataVersion: catalog.version });
    },
  };
});

export const appStoreConstants = { POOL_TIERS };
