import { isRunningInExpoGo } from "expo";

const noopModule = {
  configure: (options: { environment: string }) => {},
};

let ExpoObserve: typeof noopModule;

if (isRunningInExpoGo()) {
  ExpoObserve = noopModule;
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ExpoObserve = require("expo-observe").default;
}

export default ExpoObserve;
