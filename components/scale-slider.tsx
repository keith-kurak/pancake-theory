import { BaseSlider } from '@/components/base-slider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';

interface ScaleSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
}

export function ScaleSlider({ value, onValueChange, disabled = false }: ScaleSliderProps) {
  const handleValueChange = (newValue: number) => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(newValue);
  };

  // Round to 1 decimal place to avoid floating point precision issues
  const displayValue = Math.round(value * 10) / 10;

  return (
    <ThemedView style={[styles.container, disabled && { opacity: 0.5 }]}>
      <ThemedView style={styles.labelRow}>
        <ThemedText style={styles.label}>Scale Recipe</ThemedText>
        <ThemedText style={styles.value}>{displayValue}x</ThemedText>
      </ThemedView>
      <View style={styles.sliderContainer} pointerEvents={disabled ? 'none' : 'auto'}>
        <BaseSlider
          value={value}
          onValueChange={handleValueChange}
          minimumValue={0.5}
          maximumValue={3}
          step={0.5}
          androidUseExplicitSteps={true}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    minWidth: 50,
    textAlign: 'right',
  },
  sliderContainer: {
    width: '100%',
  },
});
