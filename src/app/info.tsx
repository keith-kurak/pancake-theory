import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { PressableWithOpacity } from "@/components/ui/PressableWithOpacity";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getCriticalIndex } from "@/utils/update-utils";
import Constants from "expo-constants";
import * as Application from "expo-application";
import { router } from "expo-router";
import { useUpdates } from "expo-updates";
import { useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined | null;
}) {
  return (
    <ThemedView style={styles.row}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <ThemedText style={styles.value}>{value ?? "—"}</ThemedText>
    </ThemedView>
  );
}

const TAP_THRESHOLD = 5;

export default function InfoScreen() {
  const { currentlyRunning } = useUpdates();
  const [devVisible, setDevVisible] = useState(false);
  const tapCountRef = useRef(0);
  const lastTapRef = useRef(0);
  const tintColor = useThemeColor({}, "tint");

  const runtimeVersion =
    typeof currentlyRunning.runtimeVersion === "string"
      ? currentlyRunning.runtimeVersion
      : undefined;

  const criticalIndex = getCriticalIndex(currentlyRunning.manifest);

  const handleVersionTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current > 1500) {
      tapCountRef.current = 0;
    }
    lastTapRef.current = now;
    tapCountRef.current += 1;

    if (tapCountRef.current >= TAP_THRESHOLD) {
      setDevVisible((prev) => !prev);
      tapCountRef.current = 0;
    }
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.appName}>
          Pancake Theory
        </ThemedText>
        <ThemedText style={styles.tagline}>
          Every stack deserves a flip.
        </ThemedText>
        <PressableWithOpacity onPress={handleVersionTap}>
          <ThemedText style={styles.version}>
            v.{Constants.expoConfig?.version ?? "—"}
          </ThemedText>
        </PressableWithOpacity>
      </ThemedView>

      {devVisible && (
        <>
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Developer
            </ThemedText>
            <InfoRow label="Channel" value={currentlyRunning.channel} />
            <InfoRow
              label="Native Build"
              value={Application.nativeBuildVersion}
            />
            <InfoRow label="Runtime Version" value={runtimeVersion} />
            <InfoRow
              label="Embedded Launch"
              value={currentlyRunning.isEmbeddedLaunch ? "Yes" : "No"}
            />
            <InfoRow label="Update ID" value={currentlyRunning.updateId} />
            <InfoRow label="Critical Index" value={String(criticalIndex)} />
          </ThemedView>

          <PressableWithOpacity
            style={[styles.button, { backgroundColor: tintColor }]}
            onPress={() => router.push("/channel-surf")}
          >
            <ThemedText style={styles.buttonText}>Channel Surfing</ThemedText>
          </PressableWithOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: "transparent",
  },
  appName: {
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    opacity: 0.5,
    fontStyle: "italic",
    marginBottom: 12,
  },
  version: {
    fontSize: 20,
    opacity: 0.5,
  },
  section: {
    marginBottom: 24,
    backgroundColor: "transparent",
  },
  sectionTitle: {
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128, 128, 128, 0.3)",
    backgroundColor: "transparent",
  },
  label: {
    opacity: 0.6,
    fontSize: 15,
  },
  value: {
    fontSize: 15,
    fontWeight: "500",
    flexShrink: 1,
    textAlign: "right",
    maxWidth: "60%",
  },
  button: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
