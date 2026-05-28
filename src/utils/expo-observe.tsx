import { isRunningInExpoGo } from "expo";

const noop = () => {};

const noopObserve = {
  configure: (options: { environment: string }) => {},
  dispatchEvents: () => {},
  logEvent: (_name: string, _options?: { attributes?: Record<string, unknown> }) => {},
};

const noopAppMetrics = {
  markFirstRender: noop,
  markInteractive: noop,
};

let Observe: typeof noopObserve;

let AppMetrics: {
  markInteractive(): void;
};

let ObserveRoot: React.FC<{ children: React.ReactNode }>;

let useObserve: () => { markInteractive: () => void };

if (isRunningInExpoGo()) {
  Observe = noopObserve;
  AppMetrics = noopAppMetrics;
  // eslint-disable-next-line react/display-name
  ObserveRoot = ({ children }) => <>{children}</>;
  useObserve = () => ({ markInteractive: noop });
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("expo-observe");
  AppMetrics = mod.AppMetrics;
  ObserveRoot = mod.ObserveRoot;
  useObserve = mod.useObserve;

  // On Android the Observe proxy can resolve as an empty object when the
  // native module's Proxy wrapper doesn't forward all properties. Guard
  // against that so callers like Observe.logEvent() don't crash.
  if (mod.Observe && typeof mod.Observe.logEvent === "function") {
    Observe = mod.Observe;
  } else {
    Observe = noopObserve;
  }
}

export { AppMetrics, Observe, ObserveRoot, useObserve };
