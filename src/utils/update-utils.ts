import Constants from "expo-constants";
import type { CurrentlyRunningInfo, UseUpdatesReturnType } from "expo-updates";
import { ExpoConfig, ExpoUpdatesManifest } from "expo/config";

const expoConfig: ExpoConfig = require("../app.json")
  .expo as unknown as ExpoConfig;

export const updateUrl: string = expoConfig.updates?.url ?? "";

export function getCriticalIndex(manifest: any): number {
  const fromManifest = (manifest as ExpoUpdatesManifest)?.extra?.expoClient
    ?.extra?.criticalIndex;
  if (typeof fromManifest === "number") return fromManifest;

  const fromConstants = Constants.expoConfig?.extra?.criticalIndex;
  if (typeof fromConstants === "number") return fromConstants;

  return 0;
}

export function isCriticalUpdate(
  currentManifest: any,
  availableManifest: any,
): boolean {
  if (!availableManifest) return false;
  return (
    getCriticalIndex(availableManifest) > getCriticalIndex(currentManifest)
  );
}

const isAvailableUpdateCritical = (updatesSystem: UseUpdatesReturnType) => {
  return isCriticalUpdate(
    updatesSystem.currentlyRunning.manifest,
    updatesSystem.availableUpdate?.manifest,
  );
};

const manifestMessage = (manifest: any) => {
  return manifest?.extra?.expoClient?.extra?.message ?? "";
};

// Utils for constructing display text

const isInDevelopmentMode = (currentlyRunning: CurrentlyRunningInfo) => {
  return __DEV__ && currentlyRunning.updateId === undefined;
};

const currentlyRunningTitle = (currentlyRunning: CurrentlyRunningInfo) => {
  if (isInDevelopmentMode(currentlyRunning)) {
    return "No update soup for you in dev mode";
  }
  return currentlyRunning?.isEmbeddedLaunch
    ? "Running the embedded bundle:"
    : "Running an update:";
};

const currentlyRunningDescription = (
  currentlyRunning: CurrentlyRunningInfo,
  lastCheckForUpdateTime?: Date,
) => {
  return (
    ` ID: ${currentlyRunning.updateId}\n` +
    ` Created: ${currentlyRunning.createdAt?.toISOString()}\n` +
    ` Channel: ${currentlyRunning.channel}\n` +
    ` Runtime Version: ${currentlyRunning.runtimeVersion}\n` +
    ` Message: ${manifestMessage(currentlyRunning.manifest)}\n` +
    ` Last check: ${lastCheckForUpdateTime?.toISOString()}\n`
  );
};

const availableUpdateTitle = (updatesSystem: UseUpdatesReturnType) => {
  if (isInDevelopmentMode(updatesSystem.currentlyRunning)) {
    return "No update soup for you in dev mode";
  }
  return updatesSystem.isUpdateAvailable
    ? `${isAvailableUpdateCritical(updatesSystem) ? "A critical update" : "An update"} ${
        updatesSystem.isUpdatePending ? "has been downloaded" : "is available"
      }`
    : "App is running the latest update";
};

const availableUpdateDescription = (updatesSystem: UseUpdatesReturnType) => {
  if (isInDevelopmentMode(updatesSystem.currentlyRunning)) {
    return "";
  }
  const availableUpdate = updatesSystem.availableUpdate;
  const updateDescription = availableUpdate
    ? ` ID: ${availableUpdate.updateId}\n` +
      ` Created: ${availableUpdate.createdAt?.toISOString() || ""}\n` +
      ` Message: ${manifestMessage(availableUpdate.manifest)}\n` +
      ` Critical: ${isAvailableUpdateCritical(updatesSystem)}\n`
    : "No available update\n";
  return updateDescription;
};

const errorDescription = (updatesSystem: UseUpdatesReturnType) => {
  const { checkError, downloadError } = updatesSystem;
  const checkErrorDescription = checkError?.message
    ? `Error on check: ${checkError?.message}\n`
    : "";
  const downloadErrorDescription = downloadError?.message
    ? `Error on download: ${downloadError?.message}\n`
    : "";
  return checkErrorDescription + downloadErrorDescription;
};

export {
  availableUpdateDescription,
  availableUpdateTitle,
  currentlyRunningDescription,
  currentlyRunningTitle,
  errorDescription,
  isAvailableUpdateCritical,
  manifestMessage,
};
