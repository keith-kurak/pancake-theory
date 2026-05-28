module.exports = ({ config }) => {
  let bundleIdSuffix = "";
  if (process.env.APP_VARIANT) {
    bundleIdSuffix += process.env.APP_VARIANT.toLowerCase();
  }

  //test

  const plugins = config.plugins || [];
  plugins.push([
    "expo-dev-client",
    {
      addGeneratedScheme: process.env.APP_VARIANT === "DEV",
    },
  ]);
  plugins.push("expo-background-task");

  let name = config.name;
  if (process.env.APP_VARIANT) {
    name = "PK-" + process.env.APP_VARIANT;
  }

  //test ddd

  return {
    ...config,
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
    plugins,
  };
};
