/** @type {import('@expo/fingerprint').Config} */
const config = {
  sourceSkips: [
    'ExpoConfigRuntimeVersionIfString',
    'ExpoConfigVersions',
    'ExpoConfigNames',
    'PackageJsonAndroidAndIosScriptsIfNotContainRun',
    'ExpoConfigExtraSection',
  ],
};
module.exports = config;
