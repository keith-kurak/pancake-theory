import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';

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
  maximumValue = 10,
  step = 0.5,
}: RatioSliderProps) {
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor(
    { light: '#f0f0f0', dark: '#333' },
    'background'
  );

  const handleValueChange = (newValue: number) => {
    // Trigger light haptic feedback on value change
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      <Slider
        style={styles.slider}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        value={value}
        onValueChange={handleValueChange}
        minimumTrackTintColor={tintColor}
        maximumTrackTintColor={backgroundColor}
        thumbTintColor={tintColor}
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
  slider: {
    width: '100%',
    height: 40,
  },
});
