import { breakfastStore$ } from "@/store/breakfast-store";
import BreakfastWidget from "@/widgets/BreakfastWidget";
import { observe } from "@legendapp/state";
import { Platform } from "react-native";

function pushSnapshot() {
  const pending = breakfastStore$.pendingRecipe.peek();

  if (pending) {
    BreakfastWidget.updateSnapshot({
      isActive: true,
      recipeId: pending.recipeId,
      recipeName: pending.recipeName,
      recipeType: pending.recipeType,
      // Glance cannot render a live relative timer the way the iOS widget
      // does, and widget code cannot format a date, so send a formatted
      // absolute time. See BreakfastWidget.android.tsx.
      startedAtLabel: new Date(pending.startTime).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    });
  } else {
    BreakfastWidget.updateSnapshot({ isActive: false });
  }
}

export function updateBreakfastWidget() {
  if (Platform.OS !== "android") return;
  pushSnapshot();
}

export function setupWidgetObserver() {
  if (Platform.OS !== "android") return;

  observe(() => {
    breakfastStore$.pendingRecipe.get();
    pushSnapshot();
  });
}
