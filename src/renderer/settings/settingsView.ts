import type { AgentId, AgentPreset } from '../../shared/agents';
import type { Settings, SettingsPatch, ThemeName } from '../../shared/settings';

export interface SettingsViewCallbacks {
  /** Apply a (full) patch of the current form values. */
  onApply(patch: SettingsPatch): void;
  /** Reset to defaults; returns the new settings to render. */
  onReset(): void;
}

/**
 * Renders the settings modal inside the existing `#settings-overlay` element.
 *
 * The view is presentational: it reads the current form state, emits a patch
 * through `onApply`, and never talks to IPC directly. The caller (main) decides
 * what to persist and how to react.
 */
export class SettingsView {
  private open = false;

  constructor(private readonly overlay: HTMLElement) {}

  isOpen(): boolean {
    return this.open;
  }

  show(settings: Settings, agents: AgentPreset[], callbacks: SettingsViewCallbacks): void {
    this.open = true;
    this.overlay.classList.remove('hidden');
    this.overlay.innerHTML = this.render(settings, agents);

    const form = this.overlay.querySelector('form') as HTMLFormElement;
    const agentSelect = this.field<HTMLSelectElement>('agent');
    const customGroup = this.overlay.querySelector('#custom-group') as HTMLElement;
    const heightValue = this.overlay.querySelector('#height-value') as HTMLElement;
    const opacityValue = this.overlay.querySelector('#opacity-value') as HTMLElement;
    const fontSizeValue = this.overlay.querySelector('#fontsize-value') as HTMLElement;

    const syncCustom = (): void => {
      customGroup.style.display = agentSelect.value === 'custom' ? 'flex' : 'none';
    };
    const syncLabels = (): void => {
      heightValue.textContent = `${this.field<HTMLInputElement>('height').value} px`;
      opacityValue.textContent = `${Number(this.field<HTMLInputElement>('opacity').value).toFixed(2)}`;
      fontSizeValue.textContent = `${this.field<HTMLInputElement>('fontSize').value} px`;
    };

    agentSelect.addEventListener('change', syncCustom);
    this.overlay
      .querySelectorAll('input[type="range"]')
      .forEach((el) => el.addEventListener('input', syncLabels));

    this.overlay.querySelector('#close-button')?.addEventListener('click', () => this.hide());
    this.overlay.querySelector('#cancel-button')?.addEventListener('click', () => this.hide());
    this.overlay.querySelector('#reset-button')?.addEventListener('click', () => {
      callbacks.onReset();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      callbacks.onApply(this.collect(form));
      this.hide();
    });

    syncCustom();
    syncLabels();
  }

  hide(): void {
    this.open = false;
    this.overlay.classList.add('hidden');
    this.overlay.innerHTML = '';
  }

  private collect(form: HTMLFormElement): SettingsPatch {
    const data = new FormData(form);
    const get = (name: string): string => String(data.get(name) ?? '');
    return {
      agent: get('agent') as AgentId,
      customCommand: get('customCommand'),
      customArgs: get('customArgs'),
      workingDirectory: get('workingDirectory'),
      hotkey: get('hotkey'),
      height: Number(get('height')),
      opacity: Number(get('opacity')),
      fontSize: Number(get('fontSize')),
      fontFamily: get('fontFamily'),
      theme: get('theme') as ThemeName,
      startAtLogin: data.get('startAtLogin') === 'on',
      hideOnBlur: data.get('hideOnBlur') === 'on',
    };
  }

  private field<T extends HTMLElement>(name: string): T {
    return this.overlay.querySelector(`[name="${name}"]`) as T;
  }

  private render(settings: Settings, agents: AgentPreset[]): string {
    const agentOptions = agents
      .map(
        (a) =>
          `<option value="${a.id}" ${a.id === settings.agent ? 'selected' : ''}>${a.label}</option>`,
      )
      .join('');

    return `
      <form class="settings-panel" aria-label="Settings">
        <h2>Settings</h2>

        <div class="field">
          <label for="agent">Agent / Shell</label>
          <select name="agent" id="agent">${agentOptions}</select>
        </div>

        <div class="field" id="custom-group">
          <label for="customCommand">Custom command</label>
          <input type="text" name="customCommand" id="customCommand" value="${escapeHtml(settings.customCommand)}" placeholder="C:\\path\\to\\cli.exe" />
          <label for="customArgs">Custom arguments</label>
          <input type="text" name="customArgs" id="customArgs" value="${escapeHtml(settings.customArgs)}" placeholder="--flag value" />
        </div>

        <div class="field">
          <label for="workingDirectory">Working directory</label>
          <input type="text" name="workingDirectory" id="workingDirectory" value="${escapeHtml(settings.workingDirectory)}" placeholder="Leave empty for home" />
        </div>

        <div class="field">
          <label for="hotkey">Toggle hotkey (Electron accelerator)</label>
          <input type="text" name="hotkey" id="hotkey" value="${escapeHtml(settings.hotkey)}" />
          <span class="hint">e.g. CommandOrControl+Backquote, Ctrl+Shift+Space, Alt+Space</span>
        </div>

        <div class="field">
          <div class="row">
            <label for="height">Panel height</label>
            <span class="value" id="height-value">${settings.height} px</span>
          </div>
          <input type="range" name="height" id="height" min="200" max="1000" step="10" value="${settings.height}" />
        </div>

        <div class="field">
          <div class="row">
            <label for="opacity">Window opacity</label>
            <span class="value" id="opacity-value">${settings.opacity.toFixed(2)}</span>
          </div>
          <input type="range" name="opacity" id="opacity" min="0.4" max="1" step="0.01" value="${settings.opacity}" />
        </div>

        <div class="field">
          <div class="row">
            <label for="fontSize">Font size</label>
            <span class="value" id="fontsize-value">${settings.fontSize} px</span>
          </div>
          <input type="range" name="fontSize" id="fontSize" min="10" max="32" step="1" value="${settings.fontSize}" />
        </div>

        <div class="field">
          <label for="fontFamily">Font family</label>
          <input type="text" name="fontFamily" id="fontFamily" value="${escapeHtml(settings.fontFamily)}" />
        </div>

        <div class="field">
          <label for="theme">Colour theme</label>
          <select name="theme" id="theme">
            <option value="agent" ${settings.theme === 'agent' ? 'selected' : ''}>Agent (keep CLI colours)</option>
            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
          </select>
        </div>

        <div class="field checkbox">
          <input type="checkbox" name="startAtLogin" id="startAtLogin" ${settings.startAtLogin ? 'checked' : ''} />
          <label for="startAtLogin">Launch at Windows login</label>
        </div>

        <div class="field checkbox">
          <input type="checkbox" name="hideOnBlur" id="hideOnBlur" ${settings.hideOnBlur ? 'checked' : ''} />
          <label for="hideOnBlur">Hide when the panel loses focus</label>
        </div>

        <div class="actions">
          <button type="button" id="reset-button">Reset</button>
          <button type="button" id="cancel-button">Cancel</button>
          <button type="submit" class="primary" id="close-button">Save</button>
        </div>
      </form>
    `;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
