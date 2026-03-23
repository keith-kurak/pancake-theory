import { isRunningInExpoGo } from "expo";
import type * as SentryType from "@sentry/react-native";

type SentryModule = typeof SentryType;

const noop = () => {};

const noopModule: Pick<
  SentryModule,
  "init" | "mobileReplayIntegration" | "feedbackIntegration"
> = {
  init: noop,
  mobileReplayIntegration: () => ({}) as ReturnType<SentryModule["mobileReplayIntegration"]>,
  feedbackIntegration: () => ({}) as ReturnType<SentryModule["feedbackIntegration"]>,
};

let Sentry: typeof noopModule;

if (isRunningInExpoGo()) {
  Sentry = noopModule;
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require("@sentry/react-native");
}

export default Sentry;
