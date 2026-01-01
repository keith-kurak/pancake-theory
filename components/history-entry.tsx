import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BREAKFAST_TYPES } from '@/constants/breakfast-ratios';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { HistoryEntry as HistoryEntryType } from '@/types/breakfast';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

interface HistoryEntryProps {
  entry: HistoryEntryType;
}

export function HistoryEntry({ entry }: HistoryEntryProps) {
  const backgroundColor = useThemeColor(
    { light: '#f8f8f8', dark: '#2a2a2a' },
    'background'
  );
  const borderColor = useThemeColor(
    { light: '#e0e0e0', dark: '#404040' },
    'text'
  );
  const tintColor = useThemeColor({}, 'tint');

  const breakfastInfo = BREAKFAST_TYPES[entry.recipeType];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: `/recipes/detail/${entry.recipeId}`,
      params: {
        scale: entry.scaleFactor.toString(),
      },
    } as any);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      const days = Math.floor(diffInDays);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const formatDuration = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor, borderColor },
        pressed && styles.pressed,
      ]}
    >
      <ThemedView style={[styles.content, { backgroundColor: 'transparent' }]}>
        <ThemedView style={[styles.header, { backgroundColor: 'transparent' }]}>
          <ThemedText style={styles.recipeName} numberOfLines={1}>
            {entry.recipeName}
          </ThemedText>
          <ThemedText style={[styles.type, { color: tintColor }]}>
            {breakfastInfo.name}
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.footer, { backgroundColor: 'transparent' }]}>
          <ThemedText style={styles.timestamp}>
            {formatDate(entry.timestamp)}
          </ThemedText>
          <ThemedView style={[styles.metadata, { backgroundColor: 'transparent' }]}>
            {entry.cookingDuration && (
              <ThemedText style={styles.duration}>
                {formatDuration(entry.cookingDuration)}
                {entry.cookDuration && (
                  <ThemedText style={[styles.duration, { opacity: 0.5 }]}>
                    {' '}({formatDuration(entry.cookDuration)} cook)
                  </ThemedText>
                )}
              </ThemedText>
            )}
            {entry.scaleFactor !== 1 && (
              <ThemedText style={styles.scale}>
                {entry.scaleFactor}x
              </ThemedText>
            )}
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    gap: 8,
  },
  header: {
    gap: 4,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '600',
  },
  type: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
  },
  metadata: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  duration: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: '500',
  },
  scale: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: 'italic',
  },
});
