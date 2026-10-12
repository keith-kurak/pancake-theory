import { useUpdates } from "expo-updates";
import { useEffect, useState } from "react";

import {
  nextUpdateCheckState,
  TERMINAL_UPDATE_CHECK_STATES,
  UpdateCheckState,
} from "@/utils/initial-update-state";

export { UpdateCheckState };

const DEFAULT_TIMEOUT = 10_000;

/**
 * Follows the update check that expo-updates runs natively on cold launch and
 * reports where it ended up, so the app can reload into a fresh update before
 * the user starts interacting with a stale one.
 */
export function useInitialUpdateState(options?: { timeout?: number }) {
  const updates = useUpdates();
  const [updateCheckState, setUpdateCheckState] = useState<UpdateCheckState>(
    UpdateCheckState.Unknown,
  );

  // Adjust state during render instead of in an effect, so we skip an extra
  // commit with stale state.
  const next = nextUpdateCheckState(updateCheckState, {
    isChecking: updates.isChecking,
    isDownloading: updates.isDownloading,
    isUpdatePending: updates.isUpdatePending,
    isUpdateAvailable: updates.isUpdateAvailable,
    hasDownloadedUpdate: !!updates.downloadedUpdate,
    hasError: !!(updates.checkError || updates.downloadError),
    hasCheckedSinceRestart:
      updates.lastCheckForUpdateTimeSinceRestart !== undefined,
  });
  if (next !== updateCheckState) {
    setUpdateCheckState(next);
  }

  useEffect(() => {
    if (updateCheckState === UpdateCheckState.NativeStateInitialized) {
      // Fallback in case native state initializes but no further events arrive.
      return moveFromStateAfterDelay(
        setUpdateCheckState,
        UpdateCheckState.NativeStateInitialized,
        UpdateCheckState.NoEventsAfterInitialized,
        100,
      );
    }
    if (updateCheckState === UpdateCheckState.Unknown) {
      // No launch check is happening, e.g. right after reloadAsync().
      return moveFromStateAfterDelay(
        setUpdateCheckState,
        UpdateCheckState.Unknown,
        UpdateCheckState.NoEventsAfterInitialized,
        16,
      );
    }
  }, [updateCheckState]);

  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setUpdateCheckState((state) =>
        TERMINAL_UPDATE_CHECK_STATES.includes(state)
          ? state
          : UpdateCheckState.Timeout,
      );
    }, timeout);
    return () => clearTimeout(timeoutId);
  }, [timeout]);

  return updateCheckState;
}

function moveFromStateAfterDelay(
  setState: (update: (state: UpdateCheckState) => UpdateCheckState) => void,
  from: UpdateCheckState,
  to: UpdateCheckState,
  timeoutMs: number,
) {
  const timeoutId = setTimeout(() => {
    setState((state) => (state === from ? to : state));
  }, timeoutMs);
  return () => clearTimeout(timeoutId);
}
