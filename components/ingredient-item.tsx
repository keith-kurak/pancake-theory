import { Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface IngredientItemProps {
  name: string;
  amount: string;
  unit: string;
  checked: boolean;
  onToggle: () => void;
}

export function IngredientItem({
  name,
  amount,
  unit,
  checked,
  onToggle,
}: IngredientItemProps) {
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <ThemedView
        style={[
          styles.checkbox,
          {
            borderColor: checked ? tintColor : textColor,
            backgroundColor: checked ? tintColor : 'transparent',
          },
        ]}
      >
        {checked && <IconSymbol name="checkmark" size={16} color="white" />}
      </ThemedView>

      <ThemedView style={[styles.content, { backgroundColor: 'transparent' }]}>
        <ThemedText
          style={[
            styles.text,
            checked && styles.checkedText,
            { color: textColor },
          ]}
        >
          {amount !== '0' && (
            <>
              <ThemedText style={styles.amount}>
                {amount} {unit}
              </ThemedText>{' '}
            </>
          )}
          {name}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: 16,
  },
  amount: {
    fontWeight: '600',
  },
  checkedText: {
    opacity: 0.5,
    textDecorationLine: 'line-through',
  },
});
