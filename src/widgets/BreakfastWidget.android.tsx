import { Column, Text } from "@expo/ui/jetpack-compose";
import {
  background,
  fillMaxSize,
  paddingAll,
} from "@expo/ui/jetpack-compose/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import type { BreakfastWidgetProps } from "./breakfast-widget-props";


const BreakfastWidget = (
  props: BreakfastWidgetProps,
  environment: WidgetEnvironment,
) => {
  "widget";

  // Everything the widget uses must be declared inside this function: the
  // bundler serializes only the body, so module-scope values are not present
  // at runtime.
  const surface = "#FFF8E1";
  const inkStrong = "#333333";
  const inkMuted = "#666666";
  const inkFaint = "#999999";

  if (!props.isActive) {
    return (
      <Column
        modifiers={[fillMaxSize(), background(surface), paddingAll(16)]}
        verticalArrangement="center"
        horizontalAlignment="center"
      >
        <Text color={inkStrong} style={{ fontSize: 16, fontWeight: "600" }}>
          Start making breakfast!
        </Text>
      </Column>
    );
  }

  return (
    <Column
      modifiers={[fillMaxSize(), background(surface), paddingAll(16)]}
      verticalArrangement="center"
    >
      <Text
        color={inkStrong}
        style={{ fontSize: 16, fontWeight: "bold" }}
        maxLines={1}
        overflow="ellipsis"
      >
        {props.recipeName}
      </Text>
      <Text color={inkFaint} style={{ fontSize: 11 }}>
        {props.recipeType}
      </Text>
      <Text color={inkMuted} style={{ fontSize: 13 }}>
        Started {props.startedAtLabel}
      </Text>
    </Column>
  );
};

export default createWidget("BreakfastWidget", BreakfastWidget);
