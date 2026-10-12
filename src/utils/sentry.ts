import { isRunningInExpoGo } from "expo";
import type * as SentryType from "@sentry/react-native";

type SentryModule = typeof SentryType;

const noop = () => {};

const noopModule: Pick<
  SentryModule,
  "init" | "mobileReplayIntegration" | "feedbackIntegration" | "nativeCrash"
> = {
  init: noop,
  mobileReplayIntegration: () => ({}) as ReturnType<SentryModule["mobileReplayIntegration"]>,
  feedbackIntegration: () => ({}) as ReturnType<SentryModule["feedbackIntegration"]>,
  // Expo Go has no Sentry native module, so a JS error is the closest we can get.
  nativeCrash: () => {
    throw new Error("Crash triggered from the Developer section");
  },
};

let Sentry: typeof noopModule;

if (isRunningInExpoGo()) {
  Sentry = noopModule;
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require("@sentry/react-native");
}

export default Sentry;
