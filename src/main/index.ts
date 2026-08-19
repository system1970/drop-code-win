import * as path from 'node:path';
import { app } from 'electron';
import { IpcChannel } from '../shared/ipc';
import { registerIpcHandlers } from './ipc';
import { PtyManager } from './pty/ptyManager';
import { GlobalHotkeyService } from './services/hotkeyService';
import { createLogger } from './services/logService';
import { createSettingsService } from './services/settingsService';
import { TrayService, resolveTrayIconPath } from './services/trayService';
import { DropDownWindow } from './services/windowService';

const logger = createLogger('main');

const PRELOAD_PATH = path.join(__dirname, '..', 'preload', 'preload.js');
const RENDERER_FILE = path.join(__dirname, '..', 'renderer', 'index.html');

/** Fields that, when changed, require the running terminal to be restarted. */
const TERMINAL_AFFECTING_KEYS = ['agent', 'customCommand', 'customArgs', 'workingDirectory'] as const;

function bootstrap(): void {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  const settings = createSettingsService();
  const pty = new PtyManager();
  const window = new DropDownWindow(PRELOAD_PATH);
  const hotkey = new GlobalHotkeyService();

  const initial = settings.get();

  /* ---- Tray ---- */
  const tray = new TrayService({
    onShow: () => window.show(),
    onHide: () => window.hide(),
    onToggle: () => window.toggle(),
    onSettings: () => {
      window.show();
      window.webContents.send(IpcChannel.OpenSettings);
    },
    onQuit: () => app.quit(),
  });
  tray.init(resolveTrayIconPath());

  /* ---- IPC ---- */
  registerIpcHandlers({ settings, pty, window });

  /* ---- Window content ---- */
  if (process.env.ELECTRON_RENDERER_URL) {
    window.load(process.env.ELECTRON_RENDERER_URL);
  } else {
    window.loadFile(RENDERER_FILE);
  }

  window.applySettings(initial);
  window.onBlur(() => {
    if (settings.get().hideOnBlur) {
      window.hide();
    }
  });

  /* ---- Global hotkey ---- */
  const registerHotkey = (): void => {
    hotkey.setHotkey(settings.get().hotkey, () => window.toggle());
  };
  registerHotkey();

  /* ---- Login item ---- */
  app.setLoginItemSettings({ openAtLogin: initial.startAtLogin, path: app.getPath('exe') });

  /* ---- React to settings changes ---- */
  let previous = settings.get();
  settings.onChange((next) => {
    window.applySettings(next);
    registerHotkey();
    app.setLoginItemSettings({ openAtLogin: next.startAtLogin, path: app.getPath('exe') });

    const requiresRestart = TERMINAL_AFFECTING_KEYS.some((key) => {
      return (
        (next as unknown as Record<string, unknown>)[key] !==
        (previous as unknown as Record<string, unknown>)[key]
      );
    });
    if (requiresRestart && window.isVisible()) {
      pty.kill('main');
    }
    previous = next;
  });

  /* ---- Lifecycle ---- */
  app.on('second-instance', () => window.show());

  app.on('before-quit', () => {
    pty.killAll();
    hotkey.unregisterAll();
    tray.destroy();
  });

  logger.info('DropCode initialised.');
}

if (require.main === module) {
  app.whenReady().then(bootstrap).catch((error) => {
    logger.error('Fatal during bootstrap.', error);
    app.quit();
  });
}
