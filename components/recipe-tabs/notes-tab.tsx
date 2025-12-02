import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { RecipeNote } from "@/types/breakfast";
import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

interface NotesTabProps {
  notes: RecipeNote[];
  onAddNote: (content: string) => void;
  onDeleteNote: (noteId: string) => void;
  tintColor: string;
  textColor: string;
  backgroundColor: string;
  bottomInset: number;
}

export function NotesTab({
  notes,
  onAddNote,
  onDeleteNote,
  tintColor,
  textColor,
  backgroundColor,
  bottomInset,
}: NotesTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handleStartAdding = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsAdding(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleCancelAdding = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsAdding(false);
    setNewNoteText("");
    Keyboard.dismiss();
  };

  const handleSaveNote = () => {
    if (newNoteText.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onAddNote(newNoteText.trim());
      setNewNoteText("");
      setIsAdding(false);
      Keyboard.dismiss();
    }
  };

  const handleDeleteNote = (noteId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDeleteNote(noteId);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    } else if (diffInHours < 48) {
      return `Yesterday at ${date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })}`;
    } else {
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
  };

  const renderNote = ({ item }: { item: RecipeNote }) => (
    <ThemedView style={[styles.noteCard, { backgroundColor: 'transparent' }]}>
      <ThemedView style={styles.noteHeader}>
        <ThemedText style={[styles.noteTimestamp, { color: textColor }]}>
          {formatTimestamp(item.timestamp)}
        </ThemedText>
        <Pressable
          onPress={() => handleDeleteNote(item.id)}
          hitSlop={8}
        >
          <IconSymbol name="trash" size={16} color={textColor} style={{ opacity: 0.5 }} />
        </Pressable>
      </ThemedView>
      <ThemedText style={[styles.noteContent, { color: textColor }]}>
        {item.content}
      </ThemedText>
    </ThemedView>
  );

  const renderEmptyState = () => (
    <ThemedView style={styles.emptyContainer}>
      <ThemedText style={[styles.emptyText, { color: textColor }]}>
        No notes yet.
      </ThemedText>
      <ThemedText style={[styles.emptyHint, { color: textColor }]}>
        Tap the + button to add your first note!
      </ThemedText>
    </ThemedView>
  );

  const notesSorted = notes.slice().sort((a, b) => b.timestamp - a.timestamp);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={notesSorted}
        renderItem={renderNote}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          notes.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState}
        inverted={false}
      />

      {isAdding && (
        <ThemedView
          style={[
            styles.inputContainer,
            { backgroundColor, borderTopColor: textColor + "20" },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                color: textColor,
                backgroundColor: textColor + "10",
              },
            ]}
            value={newNoteText}
            onChangeText={setNewNoteText}
            placeholder="Add a note..."
            placeholderTextColor={textColor + "60"}
            multiline
            maxLength={500}
          />
          <ThemedView style={styles.inputActions}>
            <Pressable
              onPress={handleCancelAdding}
              style={styles.inputButton}
            >
              <ThemedText style={{ color: textColor, opacity: 0.7 }}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSaveNote}
              style={[styles.inputButton, { backgroundColor: tintColor }]}
              disabled={!newNoteText.trim()}
            >
              <ThemedText
                style={{
                  color: "white",
                  fontWeight: "600",
                  opacity: newNoteText.trim() ? 1 : 0.5,
                }}
              >
                Save
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      )}

      {!isAdding && (
        <Pressable
          onPress={handleStartAdding}
          style={[
            styles.addFab,
            { backgroundColor: tintColor, bottom: bottomInset + 16 },
          ]}
        >
          <IconSymbol name="plus" size={24} color="white" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "transparent",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    opacity: 0.6,
  },
  emptyHint: {
    fontSize: 14,
    opacity: 0.4,
  },
  noteCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.2)",
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "transparent",
  },
  noteTimestamp: {
    fontSize: 12,
    opacity: 0.6,
  },
  noteContent: {
    fontSize: 15,
    lineHeight: 20,
  },
  inputContainer: {
    borderTopWidth: 1,
    padding: 16,
    gap: 12,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 44,
    maxHeight: 120,
  },
  inputActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    backgroundColor: "transparent",
  },
  inputButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addFab: {
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
