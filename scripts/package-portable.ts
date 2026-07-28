import { copyFile, mkdir, rm, stat } from "node:fs/promises";
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
const portableName = `PickBoard_${packageJson.version}_x64-portable.zip`;
const portablePath = path.join(releasesDir, portableName);

async function main(): Promise<void> {
  await stat(executable).catch(() => {
    throw new Error(`Executável não encontrado em ${executable}. Execute o build Tauri primeiro.`);
  });
  await stat(installerSource).catch(() => {
    throw new Error(
      `Instalador não encontrado em ${installerSource}. Execute o build Tauri com NSIS primeiro.`,
    );
  });

  await mkdir(releasesDir, { recursive: true });
  await rm(stagingDir, { recursive: true, force: true });
  await rm(portablePath, { force: true });
  await mkdir(stagingDir);
  await copyFile(executable, path.join(stagingDir, "PickBoard.exe"));
  await copyFile(installerSource, installerPath);

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
    throw new Error(result.stderr || result.stdout || "Falha ao criar o arquivo ZIP.");
  }

  await rm(stagingDir, { recursive: true, force: true });
  console.log(`Instalador reunido em ${installerPath}`);
  console.log(`Pacote portátil criado em ${portablePath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
