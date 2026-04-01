import { isRunningInExpoGo } from "expo";

const noop = () => {};

const noopModule = {
  markFirstRender: noop,
  markInteractive: noop,
};

let AppMetrics: {
  markInteractive(): void;
};

let AppMetricsRoot: React.FC<{ children: React.ReactNode }>;

if (isRunningInExpoGo()) {
  AppMetrics = noopModule;
  // eslint-disable-next-line react/display-name
  AppMetricsRoot = ({ children }) => <>{children}</>;
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AppMetrics = require("expo-app-metrics").default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AppMetricsRoot = require("expo-app-metrics").AppMetricsRoot;
}

export default AppMetrics;
export { AppMetricsRoot };
