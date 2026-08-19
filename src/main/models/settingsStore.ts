import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';
import { SETTINGS_FILE_NAME } from '../../shared/constants';
import { normalizeSettings, type Settings } from '../../shared/settings';
import { createLogger } from '../services/logService';

const logger = createLogger('settings-store');

/**
 * Low-level, atomic JSON file persistence for settings.
 *
 * Only this module touches the disk. It is intentionally dumb: it reads,
 * validates (via `normalizeSettings`) and writes. Higher-level behaviour
 * (change events, application of settings) lives in `SettingsService`.
 */
export class SettingsStore {
  private readonly filePath: string;

  constructor(userDataPath: string = app.getPath('userData')) {
    this.filePath = path.join(userDataPath, SETTINGS_FILE_NAME);
  }

  /** Read and normalise settings, falling back to defaults on any failure. */
  read(): Settings {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      // Tolerate a UTF-8 BOM (e.g. if a user hand-edits the file in an editor
      // that adds one) so parsing never fails on the first character.
      const parsed = JSON.parse(raw.replace(/^\uFEFF/, '')) as unknown;
      return normalizeSettings(parsed);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn('Could not read settings, using defaults.', error);
      }
      return normalizeSettings(undefined);
    }
  }

  /** Persist settings atomically (write to temp file, then rename). */
  write(settings: Settings): void {
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(settings, null, 2), 'utf-8');
    fs.renameSync(tmp, this.filePath);
  }
}
