import { reloadAsync } from "expo-updates";
import { useEffect } from "react";

import {
  UpdateCheckState,
  useInitialUpdateState,
} from "@/hooks/use-initial-update-state";

// Adapted from https://github.com/brentvatne/microfoam-app/blob/main/apps/mobile/utils/CheckForUpdateOnceOnLaunch.tsx

const COMPLETE_STATES = [
  UpdateCheckState.NoUpdateAvailable,
  UpdateCheckState.Error,
  UpdateCheckState.NoEventsAfterInitialized,
  UpdateCheckState.NativeStateInitialized,
  UpdateCheckState.Timeout,
];

/**
 * Waits for the launch update check. Reloads into the new update if one was
 * downloaded, otherwise calls `onComplete` so the app can render. Renders
 * nothing: the splash screen stays up while this is mounted.
 */
export default function CheckForUpdateOnceOnLaunch({
  onComplete,
  timeout,
}: {
  onComplete: () => void;
  timeout?: number;
}) {
  const state = useInitialUpdateState({ timeout });

  useEffect(() => {
    if (state === UpdateCheckState.UpdateReady) {
      requestAnimationFrame(() => {
        // If the reload fails, carry on with the update that is running now.
        reloadAsync().catch(onComplete);
      });
    } else if (COMPLETE_STATES.includes(state)) {
      onComplete();
    }
  }, [onComplete, state]);

  return null;
}
