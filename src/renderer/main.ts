import '@xterm/xterm/css/xterm.css';
import './styles.css';

import type { Settings, SettingsPatch } from '../shared/settings';
import { getApi } from './ipc/api';
import { SettingsView } from './settings/settingsView';
import { TerminalManager } from './terminal/terminalManager';

const TERMINAL_AFFECTING_KEYS = ['agent', 'customCommand', 'customArgs', 'workingDirectory'] as const;

async function main(): Promise<void> {
  const api = getApi();

  const host = document.getElementById('terminal-host') as HTMLElement;
  const overlay = document.getElementById('settings-overlay') as HTMLElement;
  const settingsButton = document.getElementById('settings-button') as HTMLButtonElement;
  const hideButton = document.getElementById('hide-button') as HTMLButtonElement;

  const initialSettings = await api.getSettings();
  const agents = await api.listAgents();

  const terminal = new TerminalManager(host, {
    fontFamily: initialSettings.fontFamily,
    fontSize: initialSettings.fontSize,
    theme: initialSettings.theme,
  });
  terminal.open();
  terminal.onData((data) => api.writeTerminal({ data }));

  let spawned = false;
  const spawnAgent = async (): Promise<void> => {
    const size = terminal.fitToHost();
    try {
      await api.spawnTerminal({ cols: size.cols, rows: size.rows });
      spawned = true;
    } catch (error) {
      terminal.writeln(`\x1b[31mFailed to start terminal: ${String(error)}\x1b[0m`);
    }
  };

  terminal.onResize((size) => {
    api.resizeTerminal({ cols: size.cols, rows: size.rows });
  });

  api.onTerminalData((event) => terminal.write(event.data));
  api.onTerminalExit((event) => {
    if (event.exitCode !== null) {
      terminal.writeln(`\x1b[90m[process exited with code ${event.exitCode}]\x1b[0m`);
    }
  });

  let previous = initialSettings;
  api.onSettingsChanged((next: Settings) => {
    terminal.setFontSize(next.fontSize);
    terminal.setTheme(next.theme);

    const changed = TERMINAL_AFFECTING_KEYS.some(
      (key) =>
        (next as unknown as Record<string, unknown>)[key] !==
        (previous as unknown as Record<string, unknown>)[key],
    );
    if (changed && spawned) {
      api.killTerminal();
      void spawnAgent();
    }
    previous = next;
  });

  /* ---- Settings modal ---- */
  const settingsView = new SettingsView(overlay);
  const openSettings = (): void => {
    api.getSettings().then((current) => {
      settingsView.show(current, agents, {
        onApply: (patch: SettingsPatch) => {
          void api.updateSettings(patch);
        },
        onReset: () => {
          api.resetSettings().then((reset) => {
            settingsView.show(reset, agents, {
              onApply: (patch) => void api.updateSettings(patch),
              onReset: () => undefined,
            });
          });
        },
      });
    });
  };

  settingsButton.addEventListener('click', openSettings);
  api.onOpenSettings(openSettings);

  hideButton.addEventListener('click', () => api.hideWindow());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !settingsView.isOpen()) {
      api.hideWindow();
    }
  });

  await spawnAgent();
  terminal.focus();
}

void main();
