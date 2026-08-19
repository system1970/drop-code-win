import type { AgentPreset } from './agents';
import type { Settings, SettingsPatch } from './settings';

/**
 * IPC contract shared by the main process, the preload bridge and the renderer.
 *
 * Every channel name lives here so a typo on either side of the boundary is a
 * compile-time error rather than a silent runtime no-op.
 */
export const IpcChannel = {
  GetSettings: 'settings:get',
  UpdateSettings: 'settings:update',
  ResetSettings: 'settings:reset',
  ListAgents: 'agents:list',
  SpawnTerminal: 'terminal:spawn',
  WriteTerminal: 'terminal:write',
  ResizeTerminal: 'terminal:resize',
  KillTerminal: 'terminal:kill',
  HideWindow: 'window:hide',
  ShowWindow: 'window:show',
  ToggleWindow: 'window:toggle',
  OpenSettings: 'ui:open-settings',
  TerminalData: 'terminal:data',
  TerminalExit: 'terminal:exit',
  SettingsChanged: 'settings:changed',
} as const;

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel];

/* ---- Request / response payloads ---- */

export interface SpawnTerminalRequest {
  readonly cols: number;
  readonly rows: number;
}

export interface SpawnTerminalResponse {
  readonly pid: number;
}

export interface WriteTerminalRequest {
  readonly data: string;
}

export interface ResizeTerminalRequest {
  readonly cols: number;
  readonly rows: number;
}

export interface TerminalDataEvent {
  readonly data: string;
}

export interface TerminalExitEvent {
  readonly exitCode: number | null;
}

/* ---- Renderer-facing API (exposed by the preload bridge) ---- */

/**
 * The surface the renderer is allowed to touch. Exposed on `window.dropCode`
 * via a `contextBridge`. No Node APIs or raw `ipcRenderer` access are leaked.
 */
export interface DropCodeApi {
  getSettings(): Promise<Settings>;
  updateSettings(patch: SettingsPatch): Promise<Settings>;
  resetSettings(): Promise<Settings>;
  listAgents(): Promise<AgentPreset[]>;
  spawnTerminal(request: SpawnTerminalRequest): Promise<SpawnTerminalResponse>;
  writeTerminal(request: WriteTerminalRequest): void;
  resizeTerminal(request: ResizeTerminalRequest): void;
  killTerminal(): void;
  hideWindow(): void;
  showWindow(): void;
  toggleWindow(): void;
  /** Subscribe to terminal output. Returns an unsubscribe function. */
  onTerminalData(callback: (event: TerminalDataEvent) => void): () => void;
  /** Subscribe to terminal exit. Returns an unsubscribe function. */
  onTerminalExit(callback: (event: TerminalExitEvent) => void): () => void;
  /** Subscribe to settings changes made outside the renderer. */
  onSettingsChanged(callback: (settings: Settings) => void): () => void;
  /** Subscribe to a request (e.g. from the tray) to open the settings modal. */
  onOpenSettings(callback: () => void): () => void;
}

declare global {
  interface Window {
    readonly dropCode: DropCodeApi;
  }
}
