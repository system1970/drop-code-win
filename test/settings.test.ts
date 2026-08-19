import { describe, expect, it } from 'vitest';
import { LIMITS } from '../src/shared/constants';
import { createDefaultSettings, normalizeSettings } from '../src/shared/settings';

describe('normalizeSettings', () => {
  it('returns sensible defaults for nullish input', () => {
    const result = normalizeSettings(undefined);
    expect(result).toEqual(createDefaultSettings());
  });

  it('clamps the height into the allowed range', () => {
    expect(normalizeSettings({ height: -50 }).height).toBe(LIMITS.height.min);
    expect(normalizeSettings({ height: 99999 }).height).toBe(LIMITS.height.max);
    expect(normalizeSettings({ height: NaN }).height).toBe(LIMITS.height.default);
  });

  it('clamps the opacity into the allowed range', () => {
    expect(normalizeSettings({ opacity: 0 }).opacity).toBe(LIMITS.opacity.min);
    expect(normalizeSettings({ opacity: 2 }).opacity).toBe(LIMITS.opacity.max);
  });

  it('coerces booleans and keeps strings', () => {
    const result = normalizeSettings({ startAtLogin: 1, hideOnBlur: 0, hotkey: 123 });
    expect(result.startAtLogin).toBe(true);
    expect(result.hideOnBlur).toBe(false);
    expect(result.hotkey).toBe(createDefaultSettings().hotkey);
  });

  it('falls back to the default theme for unknown values', () => {
    expect(normalizeSettings({ theme: 'neon' }).theme).toBe('agent');
    expect(normalizeSettings({ theme: 'light' }).theme).toBe('light');
  });

  it('always pins the schema version', () => {
    const result = normalizeSettings({ version: 99 });
    expect(result.version).toBe(createDefaultSettings().version);
  });
});
