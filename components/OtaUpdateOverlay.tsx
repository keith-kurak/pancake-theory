import { useThemeColor } from "@/hooks/use-theme-color";
import { isAvailableUpdateCritical } from "@/utils/update-utils";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import {
  checkForUpdateAsync,
  fetchUpdateAsync,
  reloadAsync,
  useUpdates,
} from "expo-updates";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { PressableWithOpacity } from "./ui/PressableWithOpacity";

// const for testing update visuals
const OVERRIDE_OVERLAY_VISIBLE = false;

export default function ExpoOtaUpdateMonitor() {
  const updatesSystem = useUpdates();
  const { isUpdateAvailable, isUpdatePending, downloadedUpdate, availableUpdate, isRestarting } = updatesSystem;
  const { top } = useSafeAreaInsets();
  const [visible, setVisible] = useState(true);

  const textColor = useThemeColor(
    { light: "#e0e0e0", dark: "#404040" },
    "text"
  );

  const backgroundColor = useThemeColor(
    { light: "#f8f8f8", dark: "#2a2a2a" },
    "background"
  );

  // check for update when app is brought back to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkForUpdateAsync();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // download update if available (either found on cold start or after foregrounding)
  useEffect(() => {
    (async function doAsync() {
      if (isUpdateAvailable) {
        await fetchUpdateAsync();
        if (isAvailableUpdateCritical(updatesSystem)) {
          setTimeout(() => {
            reloadAsync();
          }, 3000);
        }
      }
    })();
  }, [isUpdateAvailable, updatesSystem]);

  if (!visible) return null;

  if (isUpdatePending || OVERRIDE_OVERLAY_VISIBLE) {
    return (
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
              await reloadAsync({
                reloadScreenOptions: {
                  backgroundColor,
                  spinner: {
                    color: textColor,
                    size: "medium",
                  }
                }
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
              {isAvailableUpdateCritical(updatesSystem)
                ? "A critical update is available. Updating now."
                : "An update is available. Tap here to update."}
            </ThemedText>
          </PressableWithOpacity>
          <PressableWithOpacity
            onPress={() => setVisible(false)}
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
    );
  }
}
