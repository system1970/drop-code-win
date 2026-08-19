import * as os from 'node:os';
import { ipcMain } from 'electron';
import { AGENT_PRESETS, resolveAgentCommand } from '../../shared/agents';
import { IpcChannel } from '../../shared/ipc';
import type { Settings } from '../../shared/settings';
import type { PtyManager } from '../pty/ptyManager';
import { createLogger } from '../services/logService';
import type { SettingsService } from '../services/settingsService';
import type { DropDownWindow } from '../services/windowService';

const logger = createLogger('ipc');

const SESSION_ID = 'main';

export interface IpcContext {
  readonly settings: SettingsService;
  readonly pty: PtyManager;
  readonly window: DropDownWindow;
}

/**
 * Wire every IPC handler. The renderer never touches Node or `ipcRenderer`
 * directly; all cross-boundary communication funnels through here, which keeps
 * the trust boundary explicit and auditable.
 */
export function registerIpcHandlers(context: IpcContext): void {
  const { settings, pty, window } = context;

  // Always forward to the renderer — the panel may be hidden while the agent is
  // already running, and we must not lose its output (the macOS app keeps the
  // session "ready" before the panel is shown).
  const sendToRenderer = (channel: string, payload: unknown): void => {
    if (!window.webContents.isDestroyed()) {
      window.webContents.send(channel, payload);
    }
  };

  /* ---------- Settings ---------- */

  ipcMain.handle(IpcChannel.GetSettings, () => settings.get());

  ipcMain.handle(IpcChannel.UpdateSettings, (_event, patch) => {
    const next = settings.update(patch as Partial<Settings>);
    // Notify any other listeners (e.g. the renderer itself updates optimistically,
    // but this keeps a single source of truth when changes come from elsewhere).
    sendToRenderer(IpcChannel.SettingsChanged, next);
    return next;
  });

  ipcMain.handle(IpcChannel.ResetSettings, () => {
    const next = settings.reset();
    sendToRenderer(IpcChannel.SettingsChanged, next);
    return next;
  });

  ipcMain.handle(IpcChannel.ListAgents, () => AGENT_PRESETS);

  /* ---------- Window control ---------- */

  ipcMain.on(IpcChannel.ShowWindow, () => window.show());
  ipcMain.on(IpcChannel.HideWindow, () => window.hide());
  ipcMain.on(IpcChannel.ToggleWindow, () => window.toggle());

  /* ---------- Terminal ---------- */

  ipcMain.handle(IpcChannel.SpawnTerminal, (_event, request) => {
    const config = settings.get();
    const resolved = resolveAgentCommand(config.agent, config.customCommand, config.customArgs);
    const cwd = config.workingDirectory.trim() || os.homedir();

    const pid = pty.spawn(
      SESSION_ID,
      {
        command: resolved.command,
        args: resolved.args,
        cwd,
        cols: request.cols,
        rows: request.rows,
        env: process.env,
      },
      {
        onData: (data) => sendToRenderer(IpcChannel.TerminalData, { data }),
        onExit: (exitCode) => sendToRenderer(IpcChannel.TerminalExit, { exitCode }),
      },
    );
    return { pid };
  });

  ipcMain.on(IpcChannel.WriteTerminal, (_event, request) => {
    pty.write(SESSION_ID, request.data);
  });

  ipcMain.on(IpcChannel.ResizeTerminal, (_event, request) => {
    pty.resize(SESSION_ID, request.cols, request.rows);
  });

  ipcMain.on(IpcChannel.KillTerminal, () => {
    pty.kill(SESSION_ID);
  });

  logger.info('IPC handlers registered.');
}
