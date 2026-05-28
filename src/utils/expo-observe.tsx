import { isRunningInExpoGo } from "expo";

const noop = () => {};

const noopModule = {
  configure: (options: { environment: string }) => {},
  dispatchEvents: () => {},
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

let Observe: React.FC<{ children: React.ReactNode }> & {
  logEvent: (name: string, options?: { attributes?: Record<string, unknown> }) => void;
};

let useObserve: () => { markInteractive: () => void };

if (isRunningInExpoGo()) {
  ExpoObserve = noopModule;
  AppMetrics = noopAppMetrics;
  // eslint-disable-next-line react/display-name
  AppMetricsRoot = ({ children }) => <>{children}</>;
  const ObserveNoop: React.FC<{ children: React.ReactNode }> & {
    logEvent: (name: string, options?: { attributes?: Record<string, unknown> }) => void;
  } = ({ children }) => <>{children}</>;
  ObserveNoop.logEvent = noop;
  Observe = ObserveNoop as typeof Observe;
  useObserve = () => ({ markInteractive: noop });
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ExpoObserve = require("expo-observe").default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AppMetrics = require("expo-observe").AppMetrics;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AppMetricsRoot = require("expo-observe").ObserveRoot;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Observe = require("expo-observe").Observe;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useObserve = require("expo-observe").useObserve;
}

export default ExpoObserve;

export { AppMetrics, AppMetricsRoot, Observe, useObserve };
