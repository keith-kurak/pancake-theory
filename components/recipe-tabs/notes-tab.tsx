import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";
import { useRef } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

interface NotesTabProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  isEditing: boolean;
  onStartEditing: () => void;
  onStopEditing: () => void;
  tintColor: string;
  textColor: string;
  backgroundColor: string;
  bottomInset: number;
}

export function NotesTab({
  notes,
  onNotesChange,
  isEditing,
  onStartEditing,
  onStopEditing,
  tintColor,
  textColor,
  backgroundColor,
  bottomInset,
}: NotesTabProps) {
  const notesInputRef = useRef<TextInput>(null);

  const handleEditNotes = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onStartEditing();
    // Focus the input after state updates
    setTimeout(() => {
      notesInputRef.current?.focus();
    }, 100);
  };

  const handleDoneEditing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onStopEditing();
    notesInputRef.current?.blur();
  };

  return <View style={{ flex: 1 }}>
      {isEditing ? (
        <ThemedView style={[styles.notesContainer, { backgroundColor }]}>
          <TextInput
            ref={notesInputRef}
            style={[
              styles.notesInput,
              {
                color: textColor,
              },
            ]}
            value={notes}
            onChangeText={onNotesChange}
            placeholder="Add notes about this recipe..."
            placeholderTextColor={textColor + "80"}
            multiline
            textAlignVertical="top"
            editable={true}
          />
        </ThemedView>
      ) : (
        <ScrollView style={styles.content}>
          <ThemedView style={[styles.notesContainer, { backgroundColor }]}>
            {notes.trim() ? (
              <ThemedText style={[styles.notesText, { color: textColor }]}>
                {notes}
              </ThemedText>
            ) : (
              <ThemedText
                style={[styles.notesPlaceholder, { color: textColor }]}
              >
                No notes yet.
              </ThemedText>
            )}
          </ThemedView>
        </ScrollView>
      )}

      {isEditing ? (
        <Pressable
          onPress={handleDoneEditing}
          style={[
            styles.editFab,
            { backgroundColor: tintColor, bottom: bottomInset + 16 },
          ]}
        >
          <IconSymbol name="checkmark" size={24} color="white" />
        </Pressable>
      ) : (
        <Pressable
          onPress={handleEditNotes}
          style={[
            styles.editFab,
            { backgroundColor: tintColor, bottom: bottomInset + 16 },
          ]}
        >
          <IconSymbol name="pencil" size={24} color="white" />
        </Pressable>
      )}
    </View>;
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  notesContainer: {
    flex: 1,
  },
  notesInput: {
    padding: 16,
    fontSize: 16,
    lineHeight: 18,
    flex: 1,
  },
  notesText: {
    padding: 16,
    fontSize: 16,
    lineHeight: 18,
  },
  notesPlaceholder: {
    padding: 16,
    fontSize: 16,
    opacity: 0.5,
    fontStyle: "italic",
  },
  editFab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
