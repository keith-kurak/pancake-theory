import { isRunningInExpoGo } from "expo";

const noop = () => {};

const noopModule = {
  configure: (options: { environment: string }) => {},
};

const noopAppMetrics = {
  markFirstRender: noop,
  markInteractive: noop,
};

let ExpoObserve: typeof noopModule;

let AppMetrics: {
  markInteractive(): void;
};

let AppMetricsRoot: React.FC<{ children: React.ReactNode }>;

if (isRunningInExpoGo()) {
  ExpoObserve = noopModule;
  AppMetrics = noopAppMetrics;
  // eslint-disable-next-line react/display-name
  AppMetricsRoot = ({ children }) => <>{children}</>;
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ExpoObserve = require("expo-observe").default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AppMetrics = require("expo-observe").AppMetrics;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AppMetricsRoot = require("expo-observe").AppMetricsRoot;
}

export default ExpoObserve;

export { AppMetrics, AppMetricsRoot };

