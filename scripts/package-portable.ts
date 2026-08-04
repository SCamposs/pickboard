import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import packageJson from "../package.json" with { type: "json" };

const root = process.cwd();
const releasesDir = path.join(root, "dist", "releases");
const stagingDir = path.join(releasesDir, "portable");
const executable = path.join(root, "src-tauri", "target", "release", "pickboard.exe");
const installerSource = path.join(
  root,
  "src-tauri",
  "target",
  "release",
  "bundle",
  "nsis",
  `PickBoard_${packageJson.version}_x64-setup.exe`,
);
const installerPath = path.join(
  releasesDir,
  `PickBoard_${packageJson.version}_x64-setup.exe`,
);
const installerSignatureSource = `${installerSource}.sig`;
const installerSignaturePath = `${installerPath}.sig`;
const portableName = `PickBoard_${packageJson.version}_x64-portable.zip`;
const portablePath = path.join(releasesDir, portableName);
const updateManifestPath = path.join(releasesDir, "latest.json");

async function main(): Promise<void> {
  await stat(executable).catch(() => {
    throw new Error(`Executable not found at ${executable}. Run the Tauri build first.`);
  });
  await stat(installerSource).catch(() => {
    throw new Error(`Installer not found at ${installerSource}. Run the Tauri NSIS build first.`);
  });
  await stat(installerSignatureSource).catch(() => {
    throw new Error(`Updater signature not found at ${installerSignatureSource}.`);
  });

  await mkdir(releasesDir, { recursive: true });
  await rm(stagingDir, { recursive: true, force: true });
  await rm(portablePath, { force: true });
  await mkdir(stagingDir);
  await copyFile(executable, path.join(stagingDir, "PickBoard.exe"));
  await copyFile(installerSource, installerPath);
  await copyFile(installerSignatureSource, installerSignaturePath);

  const escapedSource = stagingDir.replace(/'/g, "''");
  const escapedDestination = portablePath.replace(/'/g, "''");
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `Compress-Archive -Path '${escapedSource}\\*' -DestinationPath '${escapedDestination}' -CompressionLevel Optimal`,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Failed to create the portable ZIP.");
  }

  await rm(stagingDir, { recursive: true, force: true });
  const signature = (await readFile(installerSignatureSource, "utf8")).trim();
  const installerName = path.basename(installerPath);
  const updateManifest = {
    version: packageJson.version,
    notes: `PickBoard ${packageJson.version} is now available.`,
    pub_date: new Date().toISOString(),
    platforms: {
      "windows-x86_64": {
        signature,
        url: `https://github.com/SCamposs/pickboard/releases/download/v${packageJson.version}/${installerName}`,
      },
    },
  };
  await writeFile(updateManifestPath, `${JSON.stringify(updateManifest, null, 2)}\n`, "utf8");
  console.log(`Installer collected at ${installerPath}`);
  console.log(`Portable package created at ${portablePath}`);
  console.log(`Updater manifest created at ${updateManifestPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
