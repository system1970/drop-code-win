import * as path from 'node:path';
import { app, Menu, Tray, nativeImage } from 'electron';
import { createLogger } from './logService';

const logger = createLogger('tray');

export interface TrayActions {
  readonly onShow: () => void;
  readonly onHide: () => void;
  readonly onToggle: () => void;
  readonly onSettings: () => void;
  readonly onQuit: () => void;
}

/**
 * System-tray presence with a context menu. The tray is the primary entry
 * point for a utility that lives in the background, so it must always offer a
 * way to show the panel, open settings, and quit.
 */
export class TrayService {
  private tray: Tray | null = null;

  constructor(private readonly actions: TrayActions) {}

  init(iconPath: string): void {
    let image = nativeImage.createFromPath(iconPath);
    if (image.isEmpty()) {
      // Fallback: a tiny generated icon so the app never ships without a tray.
      image = nativeImage.createFromDataURL(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
      );
    }
    image.setTemplateImage(true);

    this.tray = new Tray(image);
    this.tray.setToolTip('DropCode');
    this.tray.setContextMenu(this.buildMenu());
    this.tray.on('click', () => this.actions.onToggle());
    logger.info('Tray initialised.');
  }

  private buildMenu(): Menu {
    return Menu.buildFromTemplate([
      { label: 'Show / Hide Panel', click: () => this.actions.onToggle() },
      { label: 'Settings…', click: () => this.actions.onSettings() },
      { type: 'separator' },
      {
        label: 'Quit DropCode',
        click: () => this.actions.onQuit(),
      },
    ]);
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}

/** Resolve the tray icon path from the packaged/resources location. */
export function resolveTrayIconPath(): string {
  // In a packaged build, `process.resourcesPath` points at the resources dir.
  const base =
    process.resourcesPath && !process.resourcesPath.includes('node_modules')
      ? process.resourcesPath
      : path.join(app.getAppPath(), 'assets');
  return path.join(base, 'icon.png');
}
