import { useThemeColor } from "@/hooks/use-theme-color";
import { isCriticalUpdate } from "@/utils/update-utils";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CriticalUpdateOverlay } from "./critical-update-overlay";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { PressableWithOpacity } from "./ui/PressableWithOpacity";

function getUpdates() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-updates") as typeof import("expo-updates");
}

function ExpoOtaUpdateMonitor() {
  const Updates = getUpdates();
  const {
    currentlyRunning,
    isUpdateAvailable,
    isUpdatePending,
    availableUpdate,
  } = Updates.useUpdates();
  const { top } = useSafeAreaInsets();
  const [visible, setVisible] = useState(true);
  const isHandling = useRef(false);

  const isCritical = isCriticalUpdate(
    currentlyRunning.manifest,
    availableUpdate?.manifest,
  );

  // Derive critical overlay states from update status
  const downloadingCritical = isCritical && isUpdateAvailable && !isUpdatePending;
  const criticalReloadPending = isCritical && isUpdatePending;

  const textColor = useThemeColor(
    { light: "#e0e0e0", dark: "#404040" },
    "text",
  );

  const backgroundColor = useThemeColor(
    { light: "#f8f8f8", dark: "#2a2a2a" },
    "background",
  );

  // Check for updates on foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        Updates.checkForUpdateAsync().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [Updates]);

  // Also check once on mount
  useEffect(() => {
    Updates.checkForUpdateAsync().catch(() => {});
  }, [Updates]);

  // Download update when available (critical or non-critical)
  useEffect(() => {
    if (!isUpdateAvailable || isHandling.current) return;
    isHandling.current = true;
    Updates.fetchUpdateAsync().catch(() => {
      isHandling.current = false;
    });
  }, [isUpdateAvailable, Updates]);

  const dismissUpdate = useCallback(() => {
    setVisible(false);
  }, []);

  // Show non-critical banner when update is pending and not critical
  const showNonCriticalBanner = isUpdatePending && !isCritical && visible;

  return (
    <>
      {showNonCriticalBanner && (
        <ThemedView
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              paddingTop: top,
              backgroundColor,
            },
          ]}
        >
          <ThemedView
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor,
            }}
          >
            <PressableWithOpacity
              style={{
                flex: 1,
                justifyContent: "center",
                paddingLeft: 8,
                paddingVertical: 16,
              }}
              onPress={async () => {
                await Updates.reloadAsync({
                  reloadScreenOptions: {
                    backgroundColor,
                    spinner: {
                      color: textColor,
                      size: "medium",
                    },
                  },
                });
              }}
            >
              <ThemedText
                style={[
                  {
                    flex: 1,
                    textAlign: "left",
                  },
                ]}
              >
                An update is available. Tap here to update.
              </ThemedText>
            </PressableWithOpacity>
            <PressableWithOpacity
              onPress={dismissUpdate}
              style={{
                paddingRight: 8,
                paddingVertical: 8,
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close update notification"
            >
              <Ionicons color={textColor} size={30} name="close-outline" />
            </PressableWithOpacity>
          </ThemedView>
        </ThemedView>
      )}
      <CriticalUpdateOverlay
        visible={downloadingCritical}
        reloadPending={criticalReloadPending}
      />
    </>
  );
}

export default function OtaUpdateOverlayOuter() {
  if (process.env.EXPO_PUBLIC_UPDATES_DISABLED === "1") {
    return null;
  }

  return <ExpoOtaUpdateMonitor />;
}
