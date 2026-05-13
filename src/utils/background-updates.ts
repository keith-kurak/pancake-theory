import { Platform } from "react-native";

const BACKGROUND_UPDATE_TASK = "background-update-check";

if (process.env.EXPO_PUBLIC_UPDATES_DISABLED !== "1") {
  const TaskManager =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("expo-task-manager") as typeof import("expo-task-manager");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Updates = require("expo-updates") as typeof import("expo-updates");

  TaskManager.defineTask(BACKGROUND_UPDATE_TASK, async () => {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
    }
  });
}

export async function registerBackgroundUpdateTask() {
  if (
    Platform.OS === "web" ||
    process.env.EXPO_PUBLIC_UPDATES_DISABLED === "1"
  ) {
    return;
  }
  const BackgroundTask =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("expo-background-task") as typeof import("expo-background-task");
  await BackgroundTask.registerTaskAsync(BACKGROUND_UPDATE_TASK, {
    minimumInterval: 60 * 60 * 24, // once per day
  });
}
