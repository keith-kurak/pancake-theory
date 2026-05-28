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
      startTime: pending.startTime,
    });
  } else {
    BreakfastWidget.updateSnapshot({ isActive: false });
  }
}

export function updateBreakfastWidget() {
  if (Platform.OS !== "ios") return;
  pushSnapshot();
}

export function setupWidgetObserver() {
  if (Platform.OS !== "ios") return;

  observe(() => {
    breakfastStore$.pendingRecipe.get();
    pushSnapshot();
  });
}
