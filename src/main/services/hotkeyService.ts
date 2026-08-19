import { globalShortcut } from 'electron';
import { createLogger } from './logService';

const logger = createLogger('hotkey');

/**
 * Registers a single global keyboard shortcut that toggles the panel from
 * anywhere in Windows. Re-registering when the user changes the hotkey in
 * settings is handled by `setHotkey`, which always cleans up the previous one.
 */
export class GlobalHotkeyService {
  private current: string | null = null;

  /**
   * Register (or re-register) the hotkey.
   * @returns true if the accelerator was accepted by the OS.
   */
  setHotkey(accelerator: string, handler: () => void): boolean {
    this.unregister();

    if (!accelerator) {
      return false;
    }

    try {
      const ok = globalShortcut.register(accelerator, handler);
      if (!ok) {
        logger.warn('Hotkey was rejected by the OS.', { accelerator });
        return false;
      }
      this.current = accelerator;
      logger.info('Hotkey registered.', { accelerator });
      return true;
    } catch (error) {
      logger.error('Failed to register hotkey.', { accelerator, error });
      return false;
    }
  }

  unregister(): void {
    if (this.current) {
      globalShortcut.unregister(this.current);
      this.current = null;
    }
  }

  unregisterAll(): void {
    globalShortcut.unregisterAll();
    this.current = null;
  }
}
