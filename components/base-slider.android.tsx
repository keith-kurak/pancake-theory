import { useThemeColor } from "@/hooks/use-theme-color";
import { isRunningInExpoGo } from "expo";
import { View } from "react-native";
import { BaseSliderGo } from "./base-slider-go";

let BaseSliderInner = BaseSliderGo;

let Slider: any = View;

const BYPASS_EXPO_UI_SLIDER = false;

if (!isRunningInExpoGo() && !BYPASS_EXPO_UI_SLIDER) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Slider = require("@expo/ui/jetpack-compose").Slider;
  BaseSliderInner = ExpoUiBaseSliderInner;
}

interface BaseSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  // we suppress the steps on android for the ratio slider because it looks bad,
  // but they're appropriate on other sliders
  androidUseExplicitSteps?: boolean;
}

export function BaseSlider({
  value,
  onValueChange,
  minimumValue = 1,
  maximumValue = 15,
  step = 0.5,
  androidUseExplicitSteps = false,
}: BaseSliderProps) {
  return (
    <BaseSliderInner
      value={value}
      onValueChange={onValueChange}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      androidUseExplicitSteps={androidUseExplicitSteps}
    />
  );
}

function ExpoUiBaseSliderInner({
  value,
  onValueChange,
  minimumValue = 1,
  maximumValue = 15,
  step = 0.5,
  androidUseExplicitSteps = false,
}: BaseSliderProps) {
  const tintColor = useThemeColor({}, "tint");
  const backgroundColor = useThemeColor(
    { light: "#f0f0f0", dark: "#333333" },
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
      style={{ width: "100%", height: 40 }}
      steps={androidUseExplicitSteps ? (steps - 1) : undefined}
      elementColors={{
        thumbColor: tintColor,
        activeTrackColor: tintColor,
        inactiveTrackColor: backgroundColor,
        //activeTickColor: "#ff0000",
        //inactiveTickColor: "#00ff00",
      }}
    />
  );
}
