#!/usr/bin/env node

const path = require("path");
const fs = require("fs/promises");
const { execSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const appJsonPath = path.join(projectRoot, "app.json");

const usage = () => {
  console.log(
    "Usage: node scripts/push-update.js --version <x.y.z> --message <msg> [--critical] [--channel <ch>] [--platform <ios|android>]",
  );
  console.log();
  console.log(
    "  --version, -v   (required) App version (e.g. 1.0.1). Patch must not be 0.",
  );
  console.log("  --message, -m   (required) Update message");
  console.log(
    "  --critical, -c  (optional) Mark this as a critical update",
  );
  console.log(
    "  --channel, -ch  (optional) Channel name (default: preview)",
  );
  console.log(
    "  --platform, -p  (optional) ios or android (default: all)",
  );
};

async function updateCriticalIndex(critical) {
  const raw = await fs.readFile(appJsonPath, "utf-8");
  const appJson = JSON.parse(raw);
  const current = appJson.expo.extra?.criticalIndex ?? 0;
  const updated = critical ? current + 1 : current;
  appJson.expo.extra = { ...appJson.expo.extra, criticalIndex: updated };
  await fs.writeFile(
    appJsonPath,
    JSON.stringify(appJson, null, 2) + "\n",
    "utf-8",
  );
  return updated;
}

function parseAndValidateVersion(versionStr) {
  const parts = versionStr.split(".");
  if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) {
    console.error(
      `Error: Invalid version format "${versionStr}". Expected x.y.z`,
    );
    process.exit(1);
  }
  const patch = parseInt(parts[2], 10);
  if (patch === 0) {
    console.error(
      `Error: Patch version must not be 0. Got "${versionStr}". OTA updates require a non-zero patch (e.g. 1.0.1).`,
    );
    process.exit(1);
  }
  return versionStr;
}

async function main() {
  const args = process.argv.slice(2);
  let message = "";
  let version = "";
  let critical = false;
  let channel = "preview";
  let platform = null;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--version":
      case "-v":
        version = args[++i];
        break;
      case "--message":
      case "-m":
        message = args[++i];
        break;
      case "--critical":
      case "-c":
        critical = true;
        break;
      case "--channel":
      case "-ch":
        channel = args[++i];
        break;
      case "--platform":
      case "-p":
        platform = args[++i];
        break;
    }
  }

  if (!message || !version) {
    usage();
    process.exit(1);
  }

  const validatedVersion = parseAndValidateVersion(version);

  console.log(`version: ${validatedVersion}`);
  console.log(`message: ${message}`);
  console.log(`critical: ${critical}`);
  console.log(`channel: ${channel}`);
  console.log(`platform: ${platform ?? "all"}`);

  const criticalIndex = await updateCriticalIndex(critical);
  console.log(`criticalIndex: ${criticalIndex}`);

  const easArgs = [
    "update",
    `--message=${message}`,
    `--channel=${channel}`,
  ];
  if (platform) {
    easArgs.push(`--platform=${platform}`);
  }

  console.log(
    `\nRunning: APP_VERSION=${validatedVersion} eas ${easArgs.join(" ")}\n`,
  );

  execSync(`eas ${easArgs.join(" ")}`, {
    cwd: projectRoot,
    stdio: "inherit",
    env: { ...process.env, APP_VERSION: validatedVersion },
  });

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
