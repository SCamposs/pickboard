# PickBoard

PickBoard is a local desktop application for tracking League of Legends drafts, organizing personal champion pools, and copying structured prompts for modern AI assistants. Version 0.2.1 can read confirmed picks and bans directly from the League Client without removing any manual workflow.

The application is built with Tauri 2, React, TypeScript, Vite, Tailwind CSS, and Rust. It has no external backend, account system, telemetry, analytics, or remote draft storage.

## Features

- Manual TOP, JG, MID, ADC, and SUP picks for both teams in any order.
- Optional local synchronization of confirmed picks and bans during champion select.
- Ally role placement only when the League Client provides a recognized position.
- Enemy picks always start unassigned; users can assign, change, or remove a likely position.
- Five independent ban slots per team with pick and duplicate validation.
- Draft prompts that include unassigned enemy picks without inferring role order.
- Accent-, space-, hyphen-, and apostrophe-insensitive champion search with common aliases.
- New match, team inversion, selective clearing, always-on-top mode, and compact mode.
- Champion pools by role and tier: Main, Good, Situational, and Avoid.
- Reusable context for starting conversations with any modern AI assistant.
- Local, versioned persistence with migration and safe corruption recovery.
- Bundled pt_BR snapshot with 173 champions and icons for offline use.
- Explicit Data Dragon updates with the bundled snapshot retained as an offline fallback.
- Silent application update checks on startup with an explicit download, install, and restart flow.

## League Client Synchronization

Enable or disable **Sincronizar com o League Client** under **Configurações**. Synchronization is enabled by default.

The Rust backend detects `LeagueClientUx.exe`, discovers temporary local credentials from process arguments or the League Client `lockfile`, and connects exclusively through a loopback address. Authentication uses the local `riot` user. The password, port, PID, process command line, and lockfile contents are never sent to React, persisted, or displayed.

Client events are used only as refresh triggers. After connecting, reconnecting, or receiving a relevant event, PickBoard reads a complete snapshot from `GET /lol-champ-select/v1/session`. Full-snapshot reconciliation prevents duplicate events from accumulating and ensures champion swaps converge to the latest confirmed state.

The integration is strictly read-only. It does not:

- accept matches;
- confirm picks or bans;
- modify runes or summoner spells;
- send chat messages;
- identify hidden players;
- inspect process memory, inject code, or perform actions inside the client.

No Riot API key is required, configured, embedded, or distributed. The LCU connection uses only temporary credentials created by the local League Client for its current process.

### Connection States

- **Sincronização desativada:** synchronization is disabled and the board remains manual.
- **Procurando League Client:** the client has not been detected yet.
- **League Client encontrado / Conectando:** the local connection is being prepared.
- **Aguardando seleção:** the client is open without an active champion select.
- **Draft sincronizado:** confirmed champion-select state is being synchronized.
- **Reconectando:** a transient interruption occurred; the latest draft remains visible.
- **Integração indisponível:** the connection or payload could not be used; manual mode remains available.

### Unassigned Enemy Picks

PickBoard never uses player order, cell ID, champion popularity, or team composition to infer enemy positions. A confirmed enemy appears under **Picks inimigos detectados** and is immediately included in the generated prompt as part of the enemy composition.

To record a likely role, select TOP, JG, MID, ADC, or SUP beside the champion. If the target role is occupied, the previous occupant returns to the unassigned area so no information is lost. Use **Retornar para sem posição** in a role slot to undo an assignment and select another role.

## Manual Mode and Session Lifecycle

All pick and ban slots remain editable with or without the League Client. Disabling synchronization preserves the current board. Re-enabling it reconciles the board with the active champion-select session, when one exists.

A confirmed new session clears only the previous session's picks and bans, exactly once. Champion pools, profile, preferences, and settings are preserved. Leaving champion select, dodging, or losing the connection does not erase the latest visible snapshot.

During a synchronized session, **Nova partida**, **Limpar**, and **Inverter times** remain available. PickBoard warns that the next confirmed snapshot may restore detected data. None of these actions writes to the League Client.

## Installation

Using the packaged application does not require Node.js, pnpm, Rust, or a copy of this repository.

- `PickBoard_0.2.1_x64-setup.exe` is the standard installer. It installs for the current Windows user through the regular NSIS flow.
- `PickBoard_0.2.1_x64-portable.zip` contains only `PickBoard.exe`. Extract it to a folder and run it without installation.
- The Git repository contains source code for development and remains separate from a normal application installation.

Microsoft Edge WebView2 Runtime must be available on Windows. Version 0.2.1 is not digitally signed, so Windows SmartScreen may display a warning.

PickBoard checks the latest GitHub release silently when it starts. If a newer signed update is available, the application asks before downloading or installing it. Users can also select **Verificar nova versão** under **Configurações**. The portable package can detect updates, but installing one switches to the standard per-user installation.

## Development Requirements

- Windows 10 or Windows 11 x64
- Node.js 22 or later
- pnpm 11
- Stable Rust with the MSVC target
- Microsoft Edge WebView2 Runtime
- Visual Studio Build Tools with Desktop development with C++

Install dependencies:

```powershell
pnpm install
```

Run the frontend in a browser without LCU integration:

```powershell
pnpm dev
```

Run the Tauri desktop application:

```powershell
pnpm tauri:dev
```

## Tests and Validation

Rust tests use sanitized local fixtures and require no real token.

```powershell
pnpm test
pnpm lint
pnpm typecheck
pnpm build
cd src-tauri
cargo test
cargo check
```

Generate TypeScript coverage:

```powershell
pnpm test:coverage
```

## Manual League Client Test Plan

Use a custom match or another safe environment. Do not use a ranked queue for development testing.

1. Open PickBoard without League and confirm **Procurando League Client**.
2. Open the League Client and confirm automatic detection.
3. Start champion select in a custom match.
4. Hover a champion without confirming it and verify that it does not become a committed board entry.
5. Confirm ally picks and verify positions provided by the client.
6. Confirm enemy picks and verify that they appear without roles.
7. Assign an enemy role, change it, and return the champion to the unassigned area.
8. Confirm bans for both teams.
9. Complete a champion swap and verify snapshot convergence.
10. Copy a prompt containing both assigned and unassigned enemies.
11. Disable synchronization and verify that incoming changes stop.
12. Re-enable synchronization and verify reconciliation with the current session.
13. Close and reopen the client, verifying reconnection and manual availability during the interruption.
14. Test a dodge and verify that the latest snapshot remains visible.
15. Start another champion select and verify that previous picks and bans are cleared exactly once.

## Synchronization Limitations

- The League Client API has no official stability guarantee and may change without notice.
- Client updates may temporarily interrupt compatibility.
- Enemy roles are never inferred automatically.
- Some game modes may not provide reliable ally positions; synchronization is partial in those cases.
- Client discovery and integration target the installed Windows application.
- Manual mode always remains available.
- The integration never performs actions inside the client.

## Troubleshooting

- **Still searching:** open the full League Client and wait a few seconds; the launcher alone is not sufficient.
- **Integration unavailable:** restart League and PickBoard. Continue manually if a client update changed the LCU contract.
- **Unknown champion:** use **Verificar atualizações de campeões** under **Configurações**.
- **Draft returned after clearing or inversion:** the synchronized session remains active and the next confirmed snapshot was applied. Disable synchronization for unreconciled manual editing.
- **Missing ally position:** the current mode did not provide a recognized role; fill it manually.

## Champion Data

The bundled snapshot is stored in `src/data/champions.json`, `public/champions/`, and `src/data/champion-aliases.json`.

To query Data Dragon and download only missing icons:

```powershell
pnpm sync:champions
```

If the network request fails, the existing snapshot is preserved.

## Windows Build and Distribution

Run tests, lint, type checking, frontend build, release binary build, NSIS packaging, and portable packaging:

```powershell
pnpm release:windows
```

Updater artifacts must be signed. Local builds use the ignored `.tauri/pickboard.key` and `.tauri/pickboard.key.password` files when no signing environment variable is configured. Keep a secure backup of both: losing either prevents existing installations from accepting future updates. CI should provide `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` through secrets.

Or run the packaging stages separately:

```powershell
pnpm build:tauri
pnpm package:portable
```

Generated files:

```text
dist/releases/PickBoard_0.2.1_x64-setup.exe
dist/releases/PickBoard_0.2.1_x64-setup.exe.sig
dist/releases/PickBoard_0.2.1_x64-portable.zip
dist/releases/latest.json
```

The portable ZIP must contain only `PickBoard.exe`.

### Publishing a GitHub Release

Before publishing a version with LCU integration:

1. register or update the project in the Riot Developer Portal and request the applicable review;
2. generate both Windows artifacts and verify their SHA-256 checksums;
3. create a GitHub release for the approved version tag;
4. document synchronization, manual fallback, known limitations, and signing status;
5. attach the installer, its updater signature, the portable ZIP, and `latest.json`. GitHub's automatically generated source archives contain the repository, not the packaged application.

## Project Structure

```text
src/
  assets/        frontend-packaged visual assets
  components/    draft, layout, pools, settings, and reusable controls
  domain/        types, validation, migration, reconciliation, and prompts
  hooks/         frontend synchronization lifecycle
  services/      persistence, clipboard, champion catalog, and Tauri bridge
  store/         Zustand state and actions
src-tauri/
  src/lcu/       discovery, connection, models, normalization, and watcher
  capabilities/ minimal permissions
  icons/         executable and installer icons
scripts/         champion catalog synchronization and portable packaging
```

## Persistence and Privacy

State is stored in `pickboard-state.json` under the application local-data directory. The current draft, bans, role annotations, champion pools, profile, preferences, and settings are persisted.

LCU tokens, passwords, ports, PIDs, lockfile contents, authenticated URLs, internal reconnection state, and player identities are never persisted. Development logs are local, minimal, and sanitized. PickBoard has no telemetry.

## Riot Games Notice

PickBoard isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

Static data and icons come from Riot Data Dragon. The integration uses the local League Client API, which Riot describes as unsupported and subject to change. Before public distribution, the product owner must register or update PickBoard in the Riot Developer Portal, disclose the local endpoint, describe the read-only behavior, and request any review required by the current policy.

Primary references:

- [League Client API](https://developer.riotgames.com/docs/lol#league-client-api)
- [General Policies](https://developer.riotgames.com/policies/general)

PickBoard does not use a Riot API key and does not claim association with, approval by, or endorsement from Riot Games.

## License

MIT. See `LICENSE`.
