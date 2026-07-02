import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { PressableWithOpacity } from "@/components/ui/PressableWithOpacity";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useUpdates } from "expo-updates";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, TextInput } from "react-native";

function getUpdates() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-updates") as typeof import("expo-updates");
}

export default function ChannelSurfScreen() {
  const { currentlyRunning } = useUpdates();
  const [channel, setChannel] = useState(currentlyRunning.channel ?? "");
  const [status, setStatus] = useState("");
  const [switching, setSwitching] = useState(false);
  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");

  const handleSwitch = useCallback(async () => {
    if (!channel.trim()) return;
    const Updates = getUpdates();
    setSwitching(true);
    try {
      setStatus("Switching channel…");
      Updates.setUpdateRequestHeadersOverride({
        "expo-channel-name": channel.trim(),
      });

      setStatus("Fetching update…");
      await Updates.fetchUpdateAsync();

      setStatus("Reloading…");
      await Updates.reloadAsync();
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
      setSwitching(false);
    }
  }, [channel]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Switch Update Channel
        </ThemedText>
        <ThemedText style={styles.hint}>
          Current channel: {currentlyRunning.channel ?? "—"}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <TextInput
          style={[
            styles.input,
            {
              color: textColor,
              borderColor: "rgba(128, 128, 128, 0.3)",
            },
          ]}
          value={channel}
          onChangeText={setChannel}
          placeholder="Enter channel name"
          placeholderTextColor="rgba(128, 128, 128, 0.6)"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!switching}
        />

        <PressableWithOpacity
          style={[
            styles.button,
            { backgroundColor: tintColor },
            switching && styles.buttonDisabled,
          ]}
          onPress={handleSwitch}
          disabled={switching || !channel.trim()}
        >
          <ThemedText style={styles.buttonText}>Switch Channel</ThemedText>
        </PressableWithOpacity>
      </ThemedView>

      {status ? (
        <ThemedText style={styles.status}>{status}</ThemedText>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: "transparent",
  },
  sectionTitle: {
    marginBottom: 12,
  },
  hint: {
    opacity: 0.5,
    fontSize: 14,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  status: {
    marginTop: 20,
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
  },
});
