import { Platform } from "react-native";

let widgetModule: typeof import("@/widgets/BreakfastWidget") | null = null;

async function getWidgetModule() {
  if (widgetModule) return widgetModule;
  try {
    widgetModule = await import("@/widgets/BreakfastWidget");
    return widgetModule;
  } catch {
    return null;
  }
}

export async function updateBreakfastWidget() {
  if (Platform.OS !== "ios") return;

  try {
    const mod = await getWidgetModule();
    if (!mod) return;

    const { breakfastStore$ } = await import("@/store/breakfast-store");
    const pending = breakfastStore$.pendingRecipe.peek();

    if (pending) {
      mod.default.updateSnapshot({
        isActive: true,
        recipeId: pending.recipeId,
        recipeName: pending.recipeName,
        recipeType: pending.recipeType,
        startTime: pending.startTime,
      });
    } else {
      mod.default.updateSnapshot({ isActive: false });
    }
  } catch {
    // Widget updates are best-effort
  }
}

export function setupWidgetObserver() {
  if (Platform.OS !== "ios") return;

  import("@legendapp/state").then(({ observe }) => {
    import("@/store/breakfast-store").then(({ breakfastStore$ }) => {
      observe(() => {
        // Access pendingRecipe to track it
        breakfastStore$.pendingRecipe.get();
        updateBreakfastWidget();
      });
    });
  });
}
