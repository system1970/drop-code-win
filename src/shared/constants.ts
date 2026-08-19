/**
 * Application-wide constants shared between the main and renderer processes.
 *
 * Keeping these in one place avoids magic numbers/strings scattered through the
 * codebase and makes behaviour easy to reason about and tune.
 */

/** Current settings schema version. Bump when the Settings shape changes. */
export const SETTINGS_SCHEMA_VERSION = 1;

/** Default global hotkey (Electron accelerator syntax). */
export const DEFAULT_HOTKEY = 'CommandOrControl+Backquote';

/** Clamp ranges for numeric settings. */
export const LIMITS = {
  height: { min: 200, max: 1000, default: 420 },
  opacity: { min: 0.4, max: 1.0, default: 0.96 },
  fontSize: { min: 10, max: 32, default: 14 },
} as const;

/** Minimum supported Windows build for ConPTY (Windows 10 1809 / build 17763). */
export const MIN_CONPTY_BUILD = 17763;

/** File name (inside the user-data directory) used to persist settings. */
export const SETTINGS_FILE_NAME = 'settings.json';
