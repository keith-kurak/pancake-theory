/** @type {import('@expo/fingerprint').Config} */
const config = {
  // "relaxed" is the loosest preset: on top of "balanced" it also ignores app
  // identity (icons, iOS bundleIdentifier, Android package, schemes), which is
  // what lets the DEV / PREVIEW / production variants of this app share a
  // fingerprint lane instead of each getting their own.
  preset: "relaxed",

  // An explicit sourceSkips REPLACES the preset's rather than adding to it, so
  // this is "relaxed" spelled out plus ExpoConfigExtraSection — `extra` carries
  // CRITICAL_INDEX, which is JS-only and must not move the fingerprint.
  sourceSkips: [
    // from the "relaxed" preset
    "PackageJsonAndroidAndIosScriptsIfNotContainRun",
    "ExpoConfigVersions",
    "ExpoConfigRuntimeVersionIfString",
    "EasJson",
    "Easignore",
    "AutolinkingConfigPaths",
    "ExpoConfigNames",
    "ExpoConfigAndroidPackage",
    "ExpoConfigIosBundleIdentifier",
    "ExpoConfigSchemes",
    "ExpoConfigAssets",
    // this project's own addition
    "ExpoConfigExtraSection",
  ],
};
module.exports = config;
