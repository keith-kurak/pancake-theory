import { observable } from "@legendapp/state";
import { observablePersistSqlite } from "@legendapp/state/persist-plugins/expo-sqlite";
import { configureSynced, syncObservable } from "@legendapp/state/sync";
import Storage from "expo-sqlite/kv-store";

const persistOptions = configureSynced({
  persist: {
    plugin: observablePersistSqlite(Storage),
  },
});

interface SettingsStore {
  useMetric: boolean;
}

// Kept apart from breakfastStore so that its persisted state does not need a migration
export const settingsStore$ = observable<SettingsStore>({
  useMetric: false,
});

syncObservable(
  settingsStore$,
  persistOptions({
    persist: {
      name: "settings",
    },
  }),
);

export const settingsActions = {
  setUseMetric: (useMetric: boolean) => {
    settingsStore$.useMetric.set(useMetric);
  },
};
