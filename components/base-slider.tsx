import { useThemeColor } from '@/hooks/use-theme-color';
import Slider from '@react-native-community/slider';
import { StyleSheet } from 'react-native';

interface BaseSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
}

export function BaseSlider({
  value,
  onValueChange,
  minimumValue = 1,
  maximumValue = 15,
  step = 0.5,
}: BaseSliderProps) {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor(
    { light: '#f0f0f0', dark: '#333' },
    'background'
  );

  return (
    <Slider
      style={styles.slider}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      value={value}
      onValueChange={onValueChange}
      minimumTrackTintColor={tintColor}
      maximumTrackTintColor={backgroundColor}
      thumbTintColor={tintColor}
    />
  );
}

const styles = StyleSheet.create({
  slider: {
    width: '100%',
    height: 40,
  },
});
