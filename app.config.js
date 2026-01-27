const { runtimeVersion } = require("expo-updates");

module.exports = ({ config }) => {
  let bundleIdSuffix = '';
  if (process.env.APP_VARIANT) {
    bundleIdSuffix += process.env.APP_VARIANT.toLowerCase();
  }

  const plugins = config.plugins || [];
  plugins.push([
    'expo-dev-client',
    {
      addGeneratedScheme: process.env.APP_VARIANT === 'DEV',
    },
  ]);

  let name = config.name;
  if (process.env.APP_VARIANT) {
    name = 'PK-' + process.env.APP_VARIANT;
  }

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
    },
    plugins,
  };
};
