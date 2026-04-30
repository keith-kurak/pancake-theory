import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  TabList,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
  Tabs,
} from "expo-router/ui";
import { ComponentProps, Ref } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

type IconName = ComponentProps<typeof MaterialIcons>["name"];

const DESKTOP_BREAKPOINT = 768;
const CONTENT_MAX_WIDTH = 700;

type TabButtonProps = TabTriggerSlotProps & {
  icon: IconName;
  ref?: Ref<View>;
};

function TabButton({ icon, children, isFocused, ...props }: TabButtonProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  if (isDesktop) {
    return (
      <Pressable
        {...props}
        style={[styles.desktopTabButton, isFocused && styles.desktopTabFocused]}
      >
        <Text
          style={[
            styles.desktopTabLabel,
            isFocused && styles.desktopTabLabelFocused,
          ]}
        >
          {children}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      {...props}
      style={[styles.mobileTabButton, isFocused && styles.mobileTabFocused]}
    >
      <MaterialIcons
        name={icon}
        size={24}
        color={isFocused ? "#4630EB" : "#8E8E93"}
      />
      <Text
        style={[
          styles.mobileTabLabel,
          isFocused && styles.mobileTabLabelFocused,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export default function WebTabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  return (
    <View style={styles.root}>
      <Tabs style={isDesktop ? styles.desktopTabs : styles.mobileTabs}>
        <View style={isDesktop ? styles.desktopContent : styles.mobileContent}>
          <TabSlot />
        </View>
        <TabList
          style={isDesktop ? styles.desktopTabList : styles.mobileTabList}
        >
          <TabTrigger name="(chooser)" href="/" asChild>
            <TabButton icon="tune">Chooser</TabButton>
          </TabTrigger>
          <TabTrigger name="(browse)" href="/browse" asChild>
            <TabButton icon="search">Browse</TabButton>
          </TabTrigger>
          <TabTrigger name="(history)" href="/history" asChild>
            <TabButton icon="schedule">History</TabButton>
          </TabTrigger>
        </TabList>
      </Tabs>
      {isDesktop && (
        <View style={styles.logoContainer}>
          <Text style={styles.desktopLogo}>Pancake Theory</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Desktop layout
  desktopTabs: {
    flex: 1,
    flexDirection: "column-reverse",
  },
  desktopTabList: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  desktopContent: {
    flex: 1,
    maxWidth: CONTENT_MAX_WIDTH,
    width: "100%",
    alignSelf: "center",
  },
  logoContainer: {
    position: "absolute",
    top: 24,
    left: 24,
  },
  desktopLogo: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  desktopTabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  desktopTabFocused: {
    borderBottomColor: "#4630EB",
  },
  desktopTabLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  desktopTabLabelFocused: {
    color: "#000",
    fontWeight: "600",
  },

  // Mobile layout
  mobileTabs: {
    flex: 1,
  },
  mobileContent: {
    flex: 1,
  },
  mobileTabList: {
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
    position: "absolute",
    bottom: 24,
    left: 12,
    right: 12,
    alignSelf: "center",
  },
  mobileTabButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 22,
    gap: 2,
  },
  mobileTabFocused: {
    backgroundColor: "rgba(70, 48, 235, 0.08)",
  },
  mobileTabLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#8E8E93",
  },
  mobileTabLabelFocused: {
    color: "#4630EB",
    fontWeight: "600",
  },
});
