const fs = require("fs");
const path = require("path");

const pkgPath = path.join(__dirname, "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

// Only exclude expo-updates for App Store submission builds
const excludeUpdates = process.env.EXPO_PUBLIC_UPDATES_DISABLED === "1";

pkg.expo = pkg.expo || {};

if (excludeUpdates) {
  pkg.expo.autolinking = {
    ios: { exclude: ["expo-updates"] },
  };
  console.log(`✓ Excluded expo-updates`);
} else {
  // Ensure preview/dev builds get the full expo-updates integration
  if (pkg.expo.autolinking?.ios?.exclude?.includes("expo-updates")) {
    pkg.expo.autolinking.ios.exclude = pkg.expo.autolinking.ios.exclude.filter(
      (m) => m !== "expo-updates",
    );
    if (pkg.expo.autolinking.ios.exclude.length === 0) {
      delete pkg.expo.autolinking.ios.exclude;
    }
  }
  console.log(`✓ Kept expo-updates`);
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
