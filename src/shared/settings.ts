import type { AgentId } from './agents';
import { DEFAULT_HOTKEY, LIMITS, SETTINGS_SCHEMA_VERSION } from './constants';

/**
 * Serialisable application settings.
 *
 * This interface is the single source of truth for what the app persists. Both
 * the main process (which owns the file) and the renderer (which renders the
 * settings UI) import it, guaranteeing the two never drift apart.
 */
export interface Settings {
  /** Settings schema version, used for safe migrations. */
  readonly version: number;
  /** Electron accelerator string that toggles the drop-down panel. */
  hotkey: string;
  /** Which agent/preset to launch inside the terminal. */
  agent: AgentId;
  /** Raw command used when `agent` is `'custom'`. */
  customCommand: string;
  /** Extra arguments (space separated) for the custom command. */
  customArgs: string;
  /** Working directory the terminal starts in (empty = user home). */
  workingDirectory: string;
  /** Drop-down panel height in pixels. */
  height: number;
  /** Window opacity (0.4 - 1.0). */
  opacity: number;
  /** Launch DropCode when you log in to Windows. */
  startAtLogin: boolean;
  /** Hide the panel when it loses focus. */
  hideOnBlur: boolean;
  /** Terminal font size in pixels. */
  fontSize: number;
  /** Terminal font family (CSS font stack). */
  fontFamily: string;
  /**
   * Colour strategy:
   *  - `'agent'`:  let the launched CLI keep its own colours/theme.
   *  - `'dark'`:   use the bundled dark theme.
   *  - `'light'`:  use the bundled light theme.
   */
  theme: ThemeName;
}

export type ThemeName = 'agent' | 'dark' | 'light';

/** A partial update sent from the UI; everything optional. */
export type SettingsPatch = Partial<Omit<Settings, 'version'>>;

/** Factory for the default settings object. */
export function createDefaultSettings(): Settings {
  return {
    version: SETTINGS_SCHEMA_VERSION,
    hotkey: DEFAULT_HOTKEY,
    agent: 'opencode',
    customCommand: 'powershell.exe',
    customArgs: '',
    workingDirectory: '',
    height: LIMITS.height.default,
    opacity: LIMITS.opacity.default,
    startAtLogin: false,
    hideOnBlur: true,
    fontSize: LIMITS.fontSize.default,
    fontFamily: "'Cascadia Code', 'Cascadia Mono', Consolas, 'Courier New', monospace",
    theme: 'agent',
  };
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * Coerce an arbitrary (possibly untrusted / old) object into a valid Settings
 * object. Unknown fields are dropped and out-of-range values are clamped, so the
 * app can never end up in an invalid state even with a corrupted settings file.
 */
export function normalizeSettings(input: unknown): Settings {
  const source = (input ?? {}) as Record<string, unknown>;
  const defaults = createDefaultSettings();

  const theme = asString(source.theme, defaults.theme);
  const validTheme: ThemeName = theme === 'light' || theme === 'dark' ? theme : 'agent';

  const agent = asString(source.agent, defaults.agent);

  return {
    version: SETTINGS_SCHEMA_VERSION,
    hotkey: asString(source.hotkey, defaults.hotkey),
    agent: (agent as AgentId) ?? defaults.agent,
    customCommand: asString(source.customCommand, defaults.customCommand),
    customArgs: asString(source.customArgs, defaults.customArgs),
    workingDirectory: asString(source.workingDirectory, defaults.workingDirectory),
    height: clamp(Number(source.height), LIMITS.height.min, LIMITS.height.max, defaults.height),
    opacity: clamp(Number(source.opacity), LIMITS.opacity.min, LIMITS.opacity.max, defaults.opacity),
    startAtLogin:
      source.startAtLogin === undefined ? defaults.startAtLogin : Boolean(source.startAtLogin),
    hideOnBlur: source.hideOnBlur === undefined ? defaults.hideOnBlur : Boolean(source.hideOnBlur),
    fontSize: clamp(Number(source.fontSize), LIMITS.fontSize.min, LIMITS.fontSize.max, defaults.fontSize),
    fontFamily: asString(source.fontFamily, defaults.fontFamily),
    theme: validTheme,
  };
}
