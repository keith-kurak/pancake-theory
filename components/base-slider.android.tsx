import { useThemeColor } from "@/hooks/use-theme-color";
import { Slider } from "@expo/ui/jetpack-compose";

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
  const tintColor = useThemeColor({}, "tint");
  const backgroundColor = useThemeColor(
    { light: "#f0f0f0", dark: "#333" },
    "background"
  );

  // Calculate steps: number of discrete steps between min and max
  const steps = Math.round((maximumValue - minimumValue) / step);

  return (
    <Slider
      value={value}
      onValueChange={onValueChange}
      min={minimumValue}
      max={maximumValue}
      steps={steps}
      style={{ width: "100%", height: 40 }}
      elementColors={{
        thumbColor: tintColor,
        activeTrackColor: tintColor,
        inactiveTrackColor: backgroundColor,
      }}
    />
  );
}
