// Adapted from https://github.com/brentvatne/microfoam-app/blob/main/apps/mobile/utils/useInitialUpdateState.ts

export enum UpdateCheckState {
  Unknown = "Unknown",
  NativeStateInitialized = "NativeStateInitialized",
  NoEventsAfterInitialized = "NoEventsAfterInitialized",
  InProgress = "InProgress",
  UpdateReady = "UpdateReady",
  NoUpdateAvailable = "NoUpdateAvailable",
  Error = "Error",
  Timeout = "Timeout",
}

export const TERMINAL_UPDATE_CHECK_STATES = [
  UpdateCheckState.UpdateReady,
  UpdateCheckState.NoUpdateAvailable,
  UpdateCheckState.Error,
  UpdateCheckState.Timeout,
];

export type LaunchUpdateStatus = {
  isChecking: boolean;
  isDownloading: boolean;
  isUpdatePending: boolean;
  isUpdateAvailable: boolean;
  hasDownloadedUpdate: boolean;
  hasError: boolean;
  hasCheckedSinceRestart: boolean;
};

/**
 * Moves the launch update check forward based on the latest expo-updates
 * state. Never leaves a terminal state.
 */
export function nextUpdateCheckState(
  state: UpdateCheckState,
  status: LaunchUpdateStatus,
): UpdateCheckState {
  if (TERMINAL_UPDATE_CHECK_STATES.includes(state)) {
    return state;
  }

  const busy =
    status.isChecking || status.isDownloading || status.isUpdateAvailable;

  if (status.isUpdatePending || status.hasDownloadedUpdate) {
    return UpdateCheckState.UpdateReady;
  }
  if (status.hasError) {
    return UpdateCheckState.Error;
  }
  if (busy) {
    return UpdateCheckState.InProgress;
  }
  if (state === UpdateCheckState.InProgress) {
    return UpdateCheckState.NoUpdateAvailable;
  }
  if (status.hasCheckedSinceRestart && state === UpdateCheckState.Unknown) {
    return UpdateCheckState.NativeStateInitialized;
  }
  return state;
}
