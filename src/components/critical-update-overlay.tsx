import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { ThemedText } from "./themed-text";

function getUpdates() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-updates") as typeof import("expo-updates");
}

type CriticalUpdateOverlayProps = {
  visible: boolean;
  reloadPending?: boolean;
};

export function CriticalUpdateOverlay({
  visible,
  reloadPending,
}: CriticalUpdateOverlayProps) {
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!reloadPending) {
      setCountdown(null);
      return;
    }

    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          getUpdates().reloadAsync().catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [reloadPending]);

  if (!visible && !reloadPending) return null;

  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color="#fff" />
      {countdown !== null ? (
        <>
          <ThemedText style={styles.text}>Critical update ready</ThemedText>
          <ThemedText style={styles.countdown}>{countdown}</ThemedText>
          <ThemedText style={styles.subtext}>Restarting...</ThemedText>
        </>
      ) : (
        <ThemedText style={styles.text}>
          Installing critical update...
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    zIndex: 9999,
  },
  text: {
    color: "#fff",
    fontSize: 16,
  },
  countdown: {
    color: "#fff",
    fontSize: 64,
    fontWeight: "700",
  },
  subtext: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
  },
});
