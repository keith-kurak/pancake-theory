import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import * as Updates from "expo-updates";

const BACKGROUND_UPDATE_TASK = "background-update-check";

TaskManager.defineTask(BACKGROUND_UPDATE_TASK, async () => {
  const update = await Updates.checkForUpdateAsync();
  if (update.isAvailable) {
    await Updates.fetchUpdateAsync();
  }
});

export async function registerBackgroundUpdateTask() {
  await BackgroundTask.registerTaskAsync(BACKGROUND_UPDATE_TASK, {
    minimumInterval: 60 * 60 * 24, // once per day
  });
}
