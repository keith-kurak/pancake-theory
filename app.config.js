/** Derive runtime version from major.minor (patch is for OTA updates). */
function runtimeVersion(version) {
  const [major, minor] = version.split(".");
  return `${major}.${minor}.0`;
}

const version = process.env.APP_VERSION || undefined;
const criticalIndex = process.env.CRITICAL_INDEX
  ? parseInt(process.env.CRITICAL_INDEX, 10)
  : undefined;

module.exports = ({ config }) => {
  let bundleIdSuffix = "";
  if (process.env.APP_VARIANT) {
    bundleIdSuffix += process.env.APP_VARIANT.toLowerCase();
  }

  const plugins = config.plugins || [];
  plugins.push([
    "expo-dev-client",
    {
      addGeneratedScheme: process.env.APP_VARIANT === "DEV",
    },
  ]);
  plugins.push("expo-background-task");
  plugins.push("expo-status-bar");

  let name = config.name;
  if (process.env.APP_VARIANT) {
    name = "PK-" + process.env.APP_VARIANT;
  }

  return {
    ...config,
    ...(version && { version }),
    name,
    ios: {
      ...config.ios,
      bundleIdentifier: config.ios.bundleIdentifier + bundleIdSuffix,
    },
    android: {
      ...config.android,
      package: config.android.package + bundleIdSuffix,
    },
    updates: {
      ...config.updates,
      enabled: process.env.EXPO_PUBLIC_UPDATES_DISABLED !== "1",
      url:
        process.env.EXPO_PUBLIC_UPDATES_DISABLED !== "1"
          ? config.updates.url
          : undefined,
    },
    extra: {
      ...config.extra,
      ...(criticalIndex != null && { criticalIndex }),
    },
    runtimeVersion: runtimeVersion(version || config.version),
    plugins,
  };
};
