# DropCode for Windows

> A warm, drop-down AI coding terminal for Windows.

DropCode is a native-feeling Windows port of [R44VC0RP/drop-code](https://github.com/R44VC0RP/drop-code) (a macOS Swift app that embeds `libghostty`). It gives you a single, always-ready terminal panel that drops down from the top of the screen so your AI coding agent is one keystroke away.

- Press the **toggle hotkey** to slide the panel down from the top of the screen.
- Launch **OpenCode**, **Codex**, **Claude**, or any **custom** shell command.
- Adjust **panel height** and **window opacity** from the tray / settings.
- Your agent keeps its **own colours and theme** — DropCode renders true 24-bit colour via [xterm.js](https://xtermjs.org/) and a Windows ConPTY backend, so nothing is stripped out.

## How it works

| Layer            | Technology                                            |
| ---------------- | ----------------------------------------------------- |
| Shell / PTY      | [`node-pty`](https://github.com/microsoft/node-pty) (Windows ConPTY) |
| Terminal render  | [`xterm.js`](https://xtermjs.org/) + fit addon        |
| UI shell         | Electron (frameless, always-on-top, top-docked)       |
| Language         | TypeScript (strict)                                   |
| Build            | Vite (renderer) + `tsc` (main/preload) + electron-builder |

The architecture is strictly layered:

```
src/shared     Types, settings model, agent presets, IPC contract (framework-agnostic)
src/main       Electron main process: window, tray, hotkey, settings, PTY (Node)
src/preload    Secure context-bridge between main and renderer
src/renderer   xterm.js terminal UI + settings modal (browser)
test           Vitest unit tests for the pure logic in src/shared
```

The renderer never touches Node or `ipcRenderer` directly — all cross-boundary
communication funnels through a single, typed, sandboxed bridge (`src/preload`),
so the trust boundary is explicit and auditable.

## Requirements

- Windows 10 1809 (build 17763) or newer — required for ConPTY.
- The agent CLI you want to use (e.g. `opencode`, `codex`, `claude`) on your `PATH`.
- Node.js 20+ (only needed to **build**; end users get a packaged installer).

> **No C++ toolchain required.** `node-pty` ships prebuilt N-API binaries, so
> `npm install` just downloads them — see `.npmrc`.

## Download & install

Grab a build from [GitHub Releases](https://github.com/system1970/drop-code-win/releases), run the installer (or use the portable `.exe`), and launch **DropCode**.

## Build from source

```powershell
# 1. Install dependencies (fetches prebuilt node-pty binaries)
npm install

# 2. Generate the app icon (writes assets/icon.png + assets/icon.ico)
npm run icon

# 3. Type-check, lint and test
npm run typecheck
npm run lint
npm test

# 4. Package a Windows installer + portable build
npm run dist
```

The output lands in `dist/`.

### Development

```powershell
npm run dev
```

This runs the Vite dev server and Electron together with hot-reload for the
renderer.

## Configuration

Open **Settings** from the tray icon or the gear button in the panel. All options
are persisted to `settings.json` in your user-data directory and validated on
load, so a corrupted file can never crash the app.

| Setting            | Description                                              |
| ------------------ | -------------------------------------------------------- |
| Agent / Shell      | OpenCode, Codex, Claude, PowerShell, Command Prompt, Custom |
| Custom command     | Executable (quoted paths supported) + arguments          |
| Working directory  | Start directory (empty = home)                           |
| Toggle hotkey      | Electron accelerator, e.g. `Ctrl+Backquote`              |
| Panel height       | Pixels (200–1000)                                        |
| Window opacity     | 0.4–1.0                                                  |
| Font size / family | Terminal typography                                      |
| Colour theme       | Agent (keep CLI colours), Dark, or Light                 |
| Launch at login    | Register a Windows login item                            |
| Hide on blur       | Slide the panel away when it loses focus                 |

## Code standards

- **TypeScript strict** everywhere (`strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, …).
- **ESLint** (flat config, `typescript-eslint`) + **Prettier** with a shared `.editorconfig`.
- **Vitest** unit tests for the framework-agnostic logic.
- **Secure Electron**: `contextIsolation`, `nodeIntegration: false`, `sandbox: true`, and a minimal `contextBridge` surface.
- **CI**: GitHub Actions runs install → lint → type-check → test → build on every push/PR.
- Conventional, small, single-responsibility modules.

## License

[MIT](./LICENSE)
