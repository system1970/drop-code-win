import { contextBridge, ipcRenderer } from 'electron';
import type { AgentPreset } from '../shared/agents';
import { IpcChannel } from '../shared/ipc';
import type { DropCodeApi, TerminalDataEvent, TerminalExitEvent } from '../shared/ipc';
import type { Settings, SettingsPatch } from '../shared/settings';

/**
 * Preload script: the ONLY place the renderer is given access to IPC.
 *
 * It runs in an isolated context and exposes a narrow, typed `dropCode` object
 * via `contextBridge`. The renderer never receives `ipcRenderer` itself, so it
 * cannot send arbitrary messages or access Node primitives.
 */

function on<T>(channel: string, handler: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T): void => handler(payload);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const api: DropCodeApi = {
  getSettings(): Promise<Settings> {
    return ipcRenderer.invoke(IpcChannel.GetSettings);
  },
  updateSettings(patch: SettingsPatch): Promise<Settings> {
    return ipcRenderer.invoke(IpcChannel.UpdateSettings, patch);
  },
  resetSettings(): Promise<Settings> {
    return ipcRenderer.invoke(IpcChannel.ResetSettings);
  },
  listAgents(): Promise<AgentPreset[]> {
    return ipcRenderer.invoke(IpcChannel.ListAgents);
  },
  spawnTerminal(request): Promise<{ pid: number }> {
    return ipcRenderer.invoke(IpcChannel.SpawnTerminal, request);
  },
  writeTerminal(request): void {
    ipcRenderer.send(IpcChannel.WriteTerminal, request);
  },
  resizeTerminal(request): void {
    ipcRenderer.send(IpcChannel.ResizeTerminal, request);
  },
  killTerminal(): void {
    ipcRenderer.send(IpcChannel.KillTerminal);
  },
  hideWindow(): void {
    ipcRenderer.send(IpcChannel.HideWindow);
  },
  showWindow(): void {
    ipcRenderer.send(IpcChannel.ShowWindow);
  },
  toggleWindow(): void {
    ipcRenderer.send(IpcChannel.ToggleWindow);
  },
  onTerminalData(callback: (event: TerminalDataEvent) => void): () => void {
    return on<TerminalDataEvent>(IpcChannel.TerminalData, callback);
  },
  onTerminalExit(callback: (event: TerminalExitEvent) => void): () => void {
    return on<TerminalExitEvent>(IpcChannel.TerminalExit, callback);
  },
  onSettingsChanged(callback: (settings: Settings) => void): () => void {
    return on<Settings>(IpcChannel.SettingsChanged, callback);
  },
  onOpenSettings(callback: () => void): () => void {
    return on<void>(IpcChannel.OpenSettings, callback);
  },
};

contextBridge.exposeInMainWorld('dropCode', api);
