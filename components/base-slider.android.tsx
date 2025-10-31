import { useThemeColor } from "@/hooks/use-theme-color";
import React, { useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

const HANDLE_SIZE = 30;

interface BaseSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
}

const BaseSlider = ({
  value,
  onValueChange,
  minimumValue = 1,
  maximumValue = 15,
  step = 0.5,
}: BaseSliderProps) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const offset = useSharedValue(0);

  // Convert value to position (0 to trackWidth)
  const valueToPosition = (val: number) => {
    const normalizedValue =
      (val - minimumValue) / (maximumValue - minimumValue);
    return normalizedValue * trackWidth;
  };

  // Convert position to value
  const positionToValue = (pos: number) => {
    const normalizedPosition = pos / trackWidth;
    const rawValue =
      minimumValue + normalizedPosition * (maximumValue - minimumValue);
    // Round to nearest step
    const steppedValue = Math.round(rawValue / step) * step;
    // Clamp to min/max
    return Math.max(minimumValue, Math.min(maximumValue, steppedValue));
  };

  // Initialize position from value
  useEffect(() => {
    if (trackWidth > 0) {
      offset.value = valueToPosition(value);
    }
  }, [value, trackWidth]);

  const tintColor = useThemeColor({}, "tint");

  const backgroundColor = useThemeColor(
    { light: "#f0f0f0", dark: "#333" },
    "background"
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setTrackWidth(width);
  };

  const updateValue = (position: number) => {
    const newValue = positionToValue(position);
    onValueChange(newValue);
  };

  const pan = Gesture.Pan()
    .onChange((event) => {
      const newOffset = offset.value + event.changeX;
      // Clamp offset to track bounds
      offset.value = Math.max(0, Math.min(trackWidth, newOffset));
    })
    .onEnd(() => {
      // Update value when gesture ends
      runOnJS(updateValue)(offset.value);
    });

  const sliderStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: offset.value }],
    };
  });

  return (
    <GestureHandlerRootView style={styles.container}>
      <View
        style={[styles.sliderTrack, { backgroundColor }]}
        onLayout={handleLayout}
      >
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[
              styles.sliderHandle,
              sliderStyle,
              { backgroundColor: tintColor },
            ]}
          />
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 40,
    justifyContent: "center",
  },
  sliderTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    justifyContent: "center",
    position: "relative",
  },
  sliderHandle: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    position: "absolute",
    top: -(HANDLE_SIZE - 4) / 2, // Center vertically on track
    left: -HANDLE_SIZE / 2, // Offset to center on position
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export { BaseSlider };
