import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import Constants from "expo-constants";
import * as Application from "expo-application";
import { useUpdates } from "expo-updates";
import type { ExpoUpdatesManifest } from "expo-manifests";
import { ScrollView, StyleSheet } from "react-native";

function InfoRow({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <ThemedView style={styles.row}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <ThemedText style={styles.value}>{value ?? "—"}</ThemedText>
    </ThemedView>
  );
}

function getCriticalIndex(manifest: any): number {
  const fromManifest = (manifest as ExpoUpdatesManifest)?.extra?.expoClient
    ?.extra?.criticalIndex;
  if (typeof fromManifest === "number") return fromManifest;

  const fromConstants = Constants.expoConfig?.extra?.criticalIndex;
  if (typeof fromConstants === "number") return fromConstants;

  return 0;
}

export default function InfoScreen() {
  const { currentlyRunning } = useUpdates();

  const runtimeVersion =
    typeof currentlyRunning.runtimeVersion === "string"
      ? currentlyRunning.runtimeVersion
      : undefined;

  const criticalIndex = getCriticalIndex(currentlyRunning.manifest);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          App
        </ThemedText>
        <InfoRow label="Name" value={Application.applicationName} />
        <InfoRow label="Version" value={Constants.expoConfig?.version} />
        <InfoRow label="Native Build" value={Application.nativeBuildVersion} />
        <InfoRow label="Runtime Version" value={runtimeVersion} />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Update
        </ThemedText>
        <InfoRow
          label="Embedded Launch"
          value={currentlyRunning.isEmbeddedLaunch ? "Yes" : "No"}
        />
        <InfoRow label="Update ID" value={currentlyRunning.updateId} />
        <InfoRow label="Critical Index" value={String(criticalIndex)} />
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
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
});
