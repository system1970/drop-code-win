import type { DropCodeApi } from '../../shared/ipc';

/**
 * Typed accessor for the bridge exposed by the preload script. Centralising the
 * access keeps the rest of the renderer free of `window` casts and gives a
 * single failure point if the context bridge is missing.
 */
export function getApi(): DropCodeApi {
  if (typeof window === 'undefined' || !window.dropCode) {
    throw new Error('DropCode IPC bridge is unavailable. Was the preload script loaded?');
  }
  return window.dropCode;
}
