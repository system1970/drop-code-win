import { app } from 'electron';
import { normalizeSettings, type Settings, type SettingsPatch } from '../../shared/settings';
import { SettingsStore } from '../models/settingsStore';
import { createLogger } from './logService';

const logger = createLogger('settings-service');

type SettingsListener = (settings: Settings) => void;

/**
 * Single owner of the live `Settings` object.
 *
 * Components subscribe through `onChange` and react to deltas (re-registering
 * hotkeys, updating the window, etc.). Persistence and validation are delegated
 * to `SettingsStore` / `normalizeSettings`, so callers always receive a valid
 * object.
 */
export class SettingsService {
  private current: Settings;
  private readonly listeners = new Set<SettingsListener>();

  constructor(private readonly store: SettingsStore) {
    this.current = store.read();
    logger.info('Settings loaded.', { agent: this.current.agent });
  }

  get(): Settings {
    return this.current;
  }

  /** Merge a patch, persist, and notify subscribers. Returns the new state. */
  update(patch: SettingsPatch): Settings {
    this.current = normalizeSettings({ ...this.current, ...patch });
    this.store.write(this.current);
    this.emit();
    return this.current;
  }

  /** Reset to defaults, persist, and notify. */
  reset(): Settings {
    this.current = normalizeSettings(undefined);
    this.store.write(this.current);
    this.emit();
    logger.info('Settings reset to defaults.');
    return this.current;
  }

  /** Subscribe to changes. Returns an unsubscribe function. */
  onChange(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.current);
      } catch (error) {
        logger.error('Settings listener threw.', error);
      }
    }
  }
}

/** Convenience factory. */
export function createSettingsService(): SettingsService {
  return new SettingsService(new SettingsStore(app.getPath('userData')));
}
