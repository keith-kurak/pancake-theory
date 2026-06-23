import Constants from "expo-constants";
import type { ExpoUpdatesManifest } from "expo-manifests";
import {
  useUpdates,
  checkForUpdateAsync,
  fetchUpdateAsync,
  reloadAsync,
} from "expo-updates";
import { useEffect, useRef, useCallback, useState } from "react";
import { AppState } from "react-native";

function getCriticalIndex(manifest: any): number {
  const fromManifest = (manifest as ExpoUpdatesManifest)?.extra?.expoClient
    ?.extra?.criticalIndex;
  if (typeof fromManifest === "number") return fromManifest;

  const fromConstants = Constants.expoConfig?.extra?.criticalIndex;
  if (typeof fromConstants === "number") return fromConstants;

  return 0;
}

export type UpdateMonitorState = {
  pendingNonCritical: boolean;
  downloadingCritical: boolean;
  criticalReloadPending: boolean;
  dismissUpdate: () => void;
  applyUpdate: () => void;
};

export function useUpdateMonitor(): UpdateMonitorState {
  const { currentlyRunning, isUpdateAvailable, isUpdatePending, availableUpdate } =
    useUpdates();

  const [pendingNonCritical, setPendingNonCritical] = useState(false);
  const [downloadingCritical, setDownloadingCritical] = useState(false);
  const [criticalReloadPending, setCriticalReloadPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isHandling = useRef(false);

  const isCritical = (() => {
    if (!availableUpdate?.manifest) return false;
    const currentIndex = getCriticalIndex(currentlyRunning.manifest);
    const availableIndex = getCriticalIndex(availableUpdate.manifest);
    return availableIndex > currentIndex;
  })();

  // Check for updates on foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkForUpdateAsync().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, []);

  // Also check once on mount
  useEffect(() => {
    checkForUpdateAsync().catch(() => {});
  }, []);

  // Handle critical update available — auto-download
  useEffect(() => {
    if (!isUpdateAvailable || isHandling.current) return;

    if (isCritical) {
      isHandling.current = true;
      setDownloadingCritical(true);
      fetchUpdateAsync().catch(() => {
        setDownloadingCritical(false);
        isHandling.current = false;
      });
    }
  }, [isUpdateAvailable, isCritical]);

  // Handle critical update downloaded — signal countdown before reload
  useEffect(() => {
    if (isUpdatePending && isCritical) {
      setCriticalReloadPending(true);
    }
  }, [isUpdatePending, isCritical]);

  // Handle non-critical update available — download in background, then prompt
  useEffect(() => {
    if (!isUpdateAvailable || isCritical || isHandling.current) return;
    isHandling.current = true;
    fetchUpdateAsync().catch(() => {
      isHandling.current = false;
    });
  }, [isUpdateAvailable, isCritical]);

  // Show prompt when non-critical update is downloaded
  useEffect(() => {
    if (isUpdatePending && !isCritical && !dismissed) {
      setPendingNonCritical(true);
    }
  }, [isUpdatePending, isCritical, dismissed]);

  const dismissUpdate = useCallback(() => {
    setPendingNonCritical(false);
    setDismissed(true);
  }, []);

  const applyUpdate = useCallback(() => {
    setPendingNonCritical(false);
    reloadAsync().catch(() => {});
  }, []);

  return {
    pendingNonCritical,
    downloadingCritical,
    criticalReloadPending,
    dismissUpdate,
    applyUpdate,
  };
}
