import { BaseSlider } from '@/components/base-slider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet } from 'react-native';

interface RatioSliderProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  targetRatio?: number;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
}

export function RatioSlider({
  label,
  value,
  onValueChange,
  targetRatio,
  minimumValue = 1,
  maximumValue = 15,
  step = 0.5,
}: RatioSliderProps) {
  const handleValueChange = (newValue: number) => {
    // Trigger light haptic feedback on value change
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Ensure value doesn't go below 1
    onValueChange(Math.max(1, newValue));
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.labelRow}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        {targetRatio !== undefined && (
          <ThemedText style={[styles.targetRatio, { opacity: 0.5 }]}>
            {targetRatio}
          </ThemedText>
        )}
      </ThemedView>
      <BaseSlider
        value={value}
        onValueChange={handleValueChange}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    //paddingVertical: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  targetRatio: {
    fontSize: 16,
    fontWeight: '400',
  },
});
