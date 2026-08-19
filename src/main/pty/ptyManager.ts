import * as os from 'node:os';
import pty from 'node-pty';
import { createLogger } from '../services/logService';

const logger = createLogger('pty');

export interface SpawnOptions {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly cols: number;
  readonly rows: number;
  readonly env: NodeJS.ProcessEnv;
}

export interface PtySessionHandlers {
  readonly onData: (data: string) => void;
  readonly onExit: (exitCode: number | null) => void;
}

interface ActiveSession {
  readonly pty: pty.IPty;
  readonly command: string;
}

/**
 * Owns the pseudo-terminal sessions.
 *
 * One drop-down panel needs at most one live terminal, but the manager is
 * keyed by an id so the design scales to multiple sessions without changing
 * the call sites. All native `node-pty` access is isolated here.
 */
export class PtyManager {
  private readonly sessions = new Map<string, ActiveSession>();

  /** Spawn a command inside a fresh pseudo-console. Returns the child pid. */
  spawn(id: string, options: SpawnOptions, handlers: PtySessionHandlers): number {
    this.kill(id);

    const env: NodeJS.ProcessEnv = {
      ...options.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
    };

    const handle = pty.spawn(options.command, options.args as string[], {
      name: 'xterm-256color',
      cols: Math.max(1, options.cols),
      rows: Math.max(1, options.rows),
      cwd: options.cwd || os.homedir(),
      env,
    });

    handle.onData((data) => handlers.onData(data));
    handle.onExit(({ exitCode }) => {
      this.sessions.delete(id);
      handlers.onExit(exitCode ?? null);
    });

    this.sessions.set(id, { pty: handle, command: options.command });
    logger.info('Spawned PTY session.', { id, command: options.command, pid: handle.pid });
    return handle.pid;
  }

  write(id: string, data: string): void {
    this.sessions.get(id)?.pty.write(data);
  }

  resize(id: string, cols: number, rows: number): void {
    this.sessions.get(id)?.pty.resize(Math.max(1, cols), Math.max(1, rows));
  }

  kill(id: string): void {
    const session = this.sessions.get(id);
    if (!session) {
      return;
    }
    try {
      session.pty.kill();
    } catch (error) {
      logger.warn('Failed to kill PTY session.', { id, error });
    }
    this.sessions.delete(id);
  }

  killAll(): void {
    for (const id of [...this.sessions.keys()]) {
      this.kill(id);
    }
  }
}
