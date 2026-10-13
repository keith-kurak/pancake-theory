import type { Ingredient } from "@/types/breakfast";
import { getIngredientDisplay } from "../recipe-scaler";

const flour: Ingredient = {
  name: "Flour",
  amount: 2,
  unit: "cups",
  metricAmount: 250,
  metricUnit: "g",
  category: "flour",
};

describe("getIngredientDisplay", () => {
  it("uses imperial values by default", () => {
    expect(getIngredientDisplay(flour, 1, false)).toEqual({ amount: "2", unit: "cups" });
  });

  it("uses the authored metric values and scales them", () => {
    expect(getIngredientDisplay(flour, 1.5, true)).toEqual({ amount: "375", unit: "g" });
  });

  it("falls back to imperial when no metric value exists", () => {
    const zest: Ingredient = { name: "Zest", amount: 1, unit: "zest of lemon", metricAmount: null, metricUnit: null, category: "other" };
    expect(getIngredientDisplay(zest, 1, true)).toEqual({ amount: "1", unit: "zest of lemon" });
  });
});
