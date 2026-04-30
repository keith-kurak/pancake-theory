import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  TabList,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
  Tabs,
} from "expo-router/ui";
import { ComponentProps, Ref } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type IconName = ComponentProps<typeof MaterialIcons>["name"];

type TabButtonProps = TabTriggerSlotProps & {
  icon: IconName;
  ref?: Ref<View>;
};

function TabButton({ icon, children, isFocused, ...props }: TabButtonProps) {
  return (
    <Pressable
      {...props}
      style={[styles.tabButton, isFocused && styles.tabButtonFocused]}
    >
      <MaterialIcons
        name={icon}
        size={24}
        color={isFocused ? "#4630EB" : "#8E8E93"}
      />
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>
        {children}
      </Text>
    </Pressable>
  );
}

export default function WebTabLayout() {
  return (
    <Tabs>
      <TabSlot />
      <TabList asChild style={styles.tabList}>
        <View style={styles.tabBarWrapper}>
          <TabTrigger name="index" href="/(tabs)" asChild>
            <TabButton icon="tune">Chooser</TabButton>
          </TabTrigger>
          <TabTrigger name="browse" href="/(tabs)/browse" asChild>
            <TabButton icon="search">Browse</TabButton>
          </TabTrigger>
          <TabTrigger name="history" href="/(tabs)/history" asChild>
            <TabButton icon="schedule">History</TabButton>
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: "absolute",
    bottom: 24,
    left: 12,
    right: 12,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  tabList: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    gap: 4,
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 22,
    gap: 2,
  },
  tabButtonFocused: {
    backgroundColor: "rgba(70, 48, 235, 0.08)",
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#8E8E93",
  },
  tabLabelFocused: {
    color: "#4630EB",
    fontWeight: "600",
  },
});
