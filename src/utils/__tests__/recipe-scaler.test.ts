import type { Ingredient } from "@/types/breakfast";
import { formatMetricAmount, getDisplayAmount } from "../recipe-scaler";

const flour: Ingredient = {
  name: "All-purpose flour",
  amount: 2,
  unit: "cups",
  metricAmount: 250,
  metricUnit: "g",
  category: "flour",
};

const eggs: Ingredient = {
  name: "Eggs",
  amount: 2,
  unit: "large",
  metricAmount: 100,
  metricUnit: "g",
  category: "eggs",
};

describe("formatMetricAmount", () => {
  it("rounds amounts of 10 or more to whole numbers", () => {
    expect(formatMetricAmount(187.5)).toBe("188");
  });

  it("keeps one decimal place for small amounts", () => {
    expect(formatMetricAmount(1.25)).toBe("1.3");
    expect(formatMetricAmount(3)).toBe("3");
  });
});

describe("getDisplayAmount", () => {
  it("uses standard units when metric is off", () => {
    expect(getDisplayAmount(flour, 1.5, false)).toEqual({
      amount: "3",
      unit: "cups",
    });
  });

  it("uses the recipe's own metric amount when metric is on", () => {
    expect(getDisplayAmount(flour, 1.5, true)).toEqual({
      amount: "375",
      unit: "g",
    });
  });

  it("falls back to standard units when the recipe has no metric amount", () => {
    const { metricAmount, metricUnit, ...noMetric } = flour;
    expect(getDisplayAmount(noMetric, 1, true)).toEqual({
      amount: "2",
      unit: "cups",
    });
  });

  it("weighs the same rounded-up egg count as standard mode", () => {
    expect(getDisplayAmount(eggs, 1.25, false)).toEqual({
      amount: "3",
      unit: "large",
    });
    expect(getDisplayAmount(eggs, 1.25, true)).toEqual({
      amount: "150",
      unit: "g",
    });
  });
});
