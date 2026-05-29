import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  padding,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

type BreakfastWidgetProps = {
  isActive: boolean;
  recipeId?: string;
  recipeName?: string;
  recipeType?: string;
  startTime?: number;
};

const BreakfastWidget = (
  props: BreakfastWidgetProps,
  environment: WidgetEnvironment,
) => {
  "widget";

  const isSmall = environment.widgetFamily === "systemSmall";

  if (!props.isActive) {
    return (
      <VStack
        spacing={8}
        modifiers={[
          containerBackground("#FFF8E1", "widget"),
          widgetURL("pancaketheory:///"),
          padding({ all: 16 }),
        ]}
      >
        <Image systemName="fork.knife" size={isSmall ? 32 : 40} color="#F57C00" />
        <Text
          modifiers={[
            font({ weight: "semibold", size: isSmall ? 14 : 16 }),
            foregroundStyle("#333333"),
          ]}
        >
          Start making breakfast!
        </Text>
      </VStack>
    );
  }

  const startDate = props.startTime ? new Date(props.startTime) : new Date();
  const deepLink = `pancaketheory:///recipes/detail/${props.recipeId}`;

  if (isSmall) {
    return (
      <VStack
        spacing={6}
        modifiers={[
          containerBackground("#FFF8E1", "widget"),
          widgetURL(deepLink),
          padding({ all: 12 }),
        ]}
      >
        <Image systemName="frying.pan" size={24} color="#F57C00" />
        <Text
          modifiers={[
            font({ weight: "bold", size: 14 }),
            foregroundStyle("#333333"),
          ]}
        >
          {props.recipeName}
        </Text>
        <Text
          date={startDate}
          dateStyle="relative"
          modifiers={[
            font({ size: 12 }),
            foregroundStyle("#666666"),
          ]}
        />
      </VStack>
    );
  }

  // systemMedium — horizontal layout with more detail
  return (
    <HStack
      spacing={12}
      modifiers={[
        containerBackground("#FFF8E1", "widget"),
        widgetURL(deepLink),
        padding({ all: 16 }),
      ]}
    >
      <VStack spacing={4}>
        <Image systemName="frying.pan" size={32} color="#F57C00" />
        <Text
          modifiers={[
            font({ size: 11 }),
            foregroundStyle("#999999"),
          ]}
        >
          {props.recipeType}
        </Text>
      </VStack>
      <VStack spacing={4}>
        <Text
          modifiers={[
            font({ weight: "bold", size: 16 }),
            foregroundStyle("#333333"),
          ]}
        >
          {props.recipeName}
        </Text>
        <HStack spacing={4}>
          <Image systemName="timer" size={14} color="#F57C00" />
          <Text
            date={startDate}
            dateStyle="relative"
            modifiers={[
              font({ size: 13 }),
              foregroundStyle("#666666"),
            ]}
          />
        </HStack>
      </VStack>
      <Spacer />
    </HStack>
  );
};

export default createWidget("BreakfastWidget", BreakfastWidget);
