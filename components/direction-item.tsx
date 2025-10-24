import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

interface DirectionItemProps {
  stepNumber: number;
  instruction: string;
}

export function DirectionItem({ stepNumber, instruction }: DirectionItemProps) {
  const tintColor = useThemeColor({}, 'tint');

  return (
    <ThemedView style={styles.container}>
      <ThemedView
        style={[styles.stepNumber, { backgroundColor: tintColor }]}
      >
        <ThemedText style={styles.stepText}>{stepNumber}</ThemedText>
      </ThemedView>

      <ThemedView style={[styles.content, { backgroundColor: 'transparent' }]}>
        <ThemedText style={styles.instruction}>{instruction}</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  instruction: {
    fontSize: 16,
    lineHeight: 24,
  },
});
