import { StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

interface ScaleSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
}

export function ScaleSlider({ value, onValueChange, disabled = false }: ScaleSliderProps) {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor(
    { light: '#f0f0f0', dark: '#333' },
    'background'
  );

  const handleValueChange = (newValue: number) => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(newValue);
  };

  return (
    <ThemedView style={[styles.container, disabled && { opacity: 0.5 }]}>
      <ThemedView style={styles.labelRow}>
        <ThemedText style={styles.label}>Scale Recipe</ThemedText>
        <ThemedText style={styles.value}>{value}x</ThemedText>
      </ThemedView>
      <Slider
        style={styles.slider}
        minimumValue={0.5}
        maximumValue={3}
        step={0.5}
        value={value}
        onValueChange={handleValueChange}
        minimumTrackTintColor={tintColor}
        maximumTrackTintColor={backgroundColor}
        thumbTintColor={tintColor}
        disabled={disabled}
      />
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
  slider: {
    width: '100%',
    height: 40,
  },
});
