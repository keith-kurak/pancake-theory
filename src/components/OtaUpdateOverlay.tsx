import { useThemeColor } from "@/hooks/use-theme-color";
import { useUpdateMonitor } from "@/hooks/use-update-monitor";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import { useState } from "react";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { CriticalUpdateOverlay } from "./critical-update-overlay";
import { PressableWithOpacity } from "./ui/PressableWithOpacity";
import { reloadAsync } from "expo-updates";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function ExpoOtaUpdateMonitor() {
  const {
    pendingNonCritical,
    downloadingCritical,
    criticalReloadPending,
    dismissUpdate,
  } = useUpdateMonitor();
  const { top } = useSafeAreaInsets();
  const [visible, setVisible] = useState(true);

  const textColor = useThemeColor(
    { light: "#e0e0e0", dark: "#404040" },
    "text",
  );

  const backgroundColor = useThemeColor(
    { light: "#f8f8f8", dark: "#2a2a2a" },
    "background",
  );

  return (
    <>
      {pendingNonCritical && visible && (
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
              onPress={() => {
                setVisible(false);
                dismissUpdate();
              }}
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
