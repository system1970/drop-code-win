import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import type { ThemeName } from '../../shared/settings';

export interface TerminalSize {
  readonly cols: number;
  readonly rows: number;
}

interface ThemePalette {
  readonly background: string;
  readonly foreground: string;
  readonly cursor: string;
}

const THEMES: Record<Exclude<ThemeName, 'agent'>, ThemePalette> = {
  dark: { background: '#0b0b12', foreground: '#e6e6f0', cursor: '#89b4fa' },
  light: { background: '#ffffff', foreground: '#1e1e2e', cursor: '#1e66f5' },
};

/**
 * Owns the xterm.js instance and keeps it sized to its container.
 *
 * The manager is deliberately dumb about IPC: it only knows how to render text
 * and report its size. All communication with the main process happens in
 * `main.ts`, which wires `onData`/`onResize` to the bridge.
 */
export class TerminalManager {
  private readonly terminal: Terminal;
  private readonly fit: FitAddon;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    private readonly host: HTMLElement,
    options: { fontFamily: string; fontSize: number; theme: ThemeName },
  ) {
    this.fit = new FitAddon();
    this.terminal = new Terminal({
      fontFamily: options.fontFamily,
      fontSize: options.fontSize,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      theme: options.theme === 'agent' ? undefined : THEMES[options.theme],
      allowProposedApi: true,
    });
    this.terminal.loadAddon(this.fit);
  }

  open(): void {
    this.terminal.open(this.host);
    this.terminal.focus();
  }

  /** Resize the terminal to the container and return the new dimensions. */
  fitToHost(): TerminalSize {
    this.fit.fit();
    return { cols: this.terminal.cols, rows: this.terminal.rows };
  }

  onData(callback: (data: string) => void): void {
    this.terminal.onData(callback);
  }

  write(data: string): void {
    this.terminal.write(data);
  }

  writeln(text: string): void {
    this.terminal.writeln(text);
  }

  setFontSize(size: number): void {
    this.terminal.options.fontSize = size;
  }

  setTheme(theme: ThemeName): void {
    this.terminal.options.theme = theme === 'agent' ? undefined : THEMES[theme];
  }

  onResize(callback: (size: TerminalSize) => void): void {
    this.resizeObserver = new ResizeObserver(() => {
      const size = this.fitToHost();
      callback(size);
    });
    this.resizeObserver.observe(this.host);
  }

  focus(): void {
    this.terminal.focus();
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.terminal.dispose();
  }
}
