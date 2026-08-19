import { BrowserWindow, screen, type BrowserWindowConstructorOptions } from 'electron';
import type { Settings } from '../../shared/settings';
import { createLogger } from './logService';

const logger = createLogger('window');

const ANIMATION_DURATION_MS = 160;
const ANIMATION_FRAME_MS = 16;

/**
 * Wraps the single drop-down BrowserWindow.
 *
 * Responsibilities:
 *  - keep the panel docked to the top of the primary display at full width,
 *  - slide it in/out with a short easing animation,
 *  - apply persisted settings (height, opacity) reactively.
 */
export class DropDownWindow {
  private readonly window: BrowserWindow;
  private animationTimer: NodeJS.Timeout | null = null;
  private currentHeight: number;
  private visible = false;

  constructor(preloadPath: string) {
    const display = screen.getPrimaryDisplay();
    const width = display.workAreaSize.width;
    this.currentHeight = 420;

    const options: BrowserWindowConstructorOptions = {
      width,
      height: this.currentHeight,
      x: 0,
      y: -this.currentHeight,
      frame: false,
      show: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      transparent: false,
      backgroundColor: '#0b0b12',
      hasShadow: true,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    };

    this.window = new BrowserWindow(options);
    this.window.setAlwaysOnTop(true, 'screen-saver');
  }

  /** Load the renderer (dev server URL or packaged file). */
  load(url: string): void {
    void this.window.loadURL(url);
  }

  loadFile(filePath: string): void {
    void this.window.loadFile(filePath);
  }

  get webContents(): Electron.WebContents {
    return this.window.webContents;
  }

  applySettings(settings: Settings): void {
    this.currentHeight = settings.height;
    this.window.setOpacity(settings.opacity);

    if (this.visible) {
      const width = screen.getPrimaryDisplay().workAreaSize.width;
      this.window.setBounds({ width, height: this.currentHeight, y: 0 }, false);
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  show(): void {
    if (this.visible) {
      return;
    }
    this.visible = true;
    const width = screen.getPrimaryDisplay().workAreaSize.width;
    this.window.setBounds({ width, height: this.currentHeight, y: -this.currentHeight }, false);
    this.window.show();
    this.window.focus();
    this.animateTo(0);
    logger.debug('Panel shown.');
  }

  hide(): void {
    if (!this.visible) {
      return;
    }
    this.animateTo(-this.currentHeight, () => {
      this.window.hide();
      this.visible = false;
      logger.debug('Panel hidden.');
    });
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  private animateTo(targetY: number, onDone?: () => void): void {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
    }

    const startY = this.window.getBounds().y;
    const distance = targetY - startY;
    const steps = Math.max(1, Math.round(ANIMATION_DURATION_MS / ANIMATION_FRAME_MS));
    let step = 0;

    this.animationTimer = setInterval(() => {
      step += 1;
      const t = Math.min(1, step / steps);
      const eased = t * t * (3 - 2 * t); // smoothstep
      const y = Math.round(startY + distance * eased);
      this.window.setBounds({ y }, false);

      if (step >= steps) {
        if (this.animationTimer) {
          clearInterval(this.animationTimer);
          this.animationTimer = null;
        }
        this.window.setBounds({ y: targetY }, false);
        onDone?.();
      }
    }, ANIMATION_FRAME_MS);
  }

  onBlur(callback: () => void): void {
    this.window.on('blur', callback);
  }

  /** Hard-close the underlying window (used during app quit). */
  destroy(): void {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
    }
    this.window.destroy();
  }
}
