import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BREAKFAST_TYPES } from "@/constants/breakfast-ratios";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { BreakfastType } from "@/types/breakfast";
import { StyleSheet, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";

interface BreakfastPieChartProps {
  typeCounts: Record<BreakfastType, number>;
  totalCount: number;
}

const COLORS = [
  "#FF6B6B", // Pancakes - red
  "#4ECDC4", // Waffles - teal
  "#FFD93D", // Crepes - yellow
  "#95E1D3", // Dutch Baby - mint
  "#F38181", // Popover - pink
  "#AA96DA", // Donut - purple
  "#FCBAD3", // Clafoutis - light pink
  "#A8D8EA", // Breakfast Cake - light blue
];

export function BreakfastPieChart({
  typeCounts,
  totalCount,
}: BreakfastPieChartProps) {
  const textColor = useThemeColor({}, "text");

  if (totalCount === 0) {
    return null;
  }

  const types: BreakfastType[] = [
    "pancakes",
    "waffles",
    "crepes",
    "dutch-baby",
    "popover",
    "donut",
    "clafoutis",
    "breakfast-cake",
  ];

  // Calculate percentages and filter out zeros
  const data = types
    .map((type, index) => ({
      type,
      count: typeCounts[type] || 0,
      color: COLORS[index],
      name: BREAKFAST_TYPES[type].name,
    }))
    .filter((item) => item.count > 0);

  // Calculate pie slices
  const size = 200;
  const radius = 80;
  const center = size / 2;

  let currentAngle = -90; // Start at top

  const slices = data.map((item) => {
    const percentage = (item.count / totalCount) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    currentAngle = endAngle;

    // Convert angles to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Calculate start and end points
    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    // Large arc flag
    const largeArc = angle > 180 ? 1 : 0;

    // Create path
    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `Z`,
    ].join(" ");

    return {
      ...item,
      percentage,
      path: pathData,
    };
  });

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.legend}>
        {slices.map((slice) => (
          <ThemedView key={slice.type} style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: slice.color }]}
            />
            <ThemedText style={[styles.legendText, { color: textColor }]}>
              {slice.name} ({slice.percentage.toFixed(0)}%)
            </ThemedText>
          </ThemedView>
        ))}
      </ThemedView>
      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          <G>
            {slices.map((slice, index) => (
              <Path
                key={slice.type}
                d={slice.path}
                fill={slice.color}
                opacity={0.9}
              />
            ))}
          </G>
        </Svg>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    flexDirection: "row",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  chartContainer: {
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  legend: {
    alignSelf: "stretch",
    gap: 8,
    backgroundColor: "transparent",
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "transparent",
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 14,
  },
});
