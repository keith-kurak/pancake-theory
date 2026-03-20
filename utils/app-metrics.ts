import { isRunningInExpoGo } from "expo";

const noop = () => {};

const noopModule = {
  markFirstRender: noop,
  markInteractive: noop,
};

let AppMetrics: {
  markFirstRender(): void;
  markInteractive(): void;
};

if (isRunningInExpoGo()) {
  AppMetrics = noopModule;
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AppMetrics = require("expo-eas-observe").default;
}

export default AppMetrics;
