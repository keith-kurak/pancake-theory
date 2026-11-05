import type { BreakfastType } from "@/types/breakfast";

/**
 * The snapshot shape shared by the iOS and Android widgets.
 *
 * Both platforms show the same thing — the cook in progress, or a prompt to
 * start one — but they get the elapsed time differently, so each sends only the
 * timing field its own layout can render.
 */
export type BreakfastWidgetProps = {
  isActive: boolean;
  recipeId?: string;
  recipeName?: string;
  recipeType?: BreakfastType | string;
  /**
   * iOS only. SwiftUI's date Text renders a live relative timer from this.
   */
  startTime?: number;
  /**
   * Android only. Preformatted clock time, for example "8:42 AM". Glance has no
   * relative-date text and widget code cannot format a date itself, so the app
   * formats it. Absolute, so it does not go stale between snapshots.
   */
  startedAtLabel?: string;
};
