import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';

/**
 * Minimal, dependency-free logger that writes both to the console and to a
 * rotating log file inside the user-data directory. Keeping a file log is
 * invaluable for a background-style app where the window may not be visible.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const CURRENT_LEVEL: LogLevel =
  process.env.NODE_ENV === 'development' ? 'debug' : 'info';

let logFile: fs.WriteStream | null = null;

function ensureLogFile(): fs.WriteStream | null {
  if (logFile) {
    return logFile;
  }
  try {
    const dir = app.getPath('logs');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `drop-code-${new Date().toISOString().slice(0, 10)}.log`);
    logFile = fs.createWriteStream(file, { flags: 'a' });
  } catch (error) {
    // Logging must never crash the app.
    console.error('Failed to open log file:', error);
  }
  return logFile;
}

function emit(level: LogLevel, scope: string, message: string, meta?: unknown): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[CURRENT_LEVEL]) {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${scope}]`;
  const line = meta !== undefined ? `${prefix} ${message} ${String(meta)}` : `${prefix} ${message}`;

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }

  const stream = ensureLogFile();
  if (stream) {
    stream.write(line + '\n');
  }
}

export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

/** Create a scoped logger. The scope shows up in every line for filtering. */
export function createLogger(scope: string): Logger {
  return {
    debug: (message, meta) => emit('debug', scope, message, meta),
    info: (message, meta) => emit('info', scope, message, meta),
    warn: (message, meta) => emit('warn', scope, message, meta),
    error: (message, meta) => emit('error', scope, message, meta),
  };
}
