import { describe, expect, it } from 'vitest';
import { AGENT_PRESETS, resolveAgentCommand } from '../src/shared/agents';

describe('resolveAgentCommand', () => {
  it('maps known presets to their executable', () => {
    expect(resolveAgentCommand('opencode', '', '')).toEqual({ command: 'opencode', args: [] });
    expect(resolveAgentCommand('powershell', '', '')).toEqual({
      command: 'pwsh.exe',
      args: [],
    });
  });

  it('falls back to cmd.exe for unknown presets', () => {
    // @ts-expect-error - exercising the defensive default branch
    expect(resolveAgentCommand('does-not-exist', '', '')).toEqual({
      command: 'cmd.exe',
      args: [],
    });
  });

  it('splits the custom command and merges extra args', () => {
    const result = resolveAgentCommand('custom', 'mycli --flag', '--extra one');
    expect(result).toEqual({ command: 'mycli', args: ['--flag', '--extra', 'one'] });
  });

  it('falls back to cmd.exe when the custom command is empty', () => {
    expect(resolveAgentCommand('custom', '   ', '')).toEqual({ command: 'cmd.exe', args: [] });
  });

  it('exposes a stable, typed list of presets', () => {
    expect(AGENT_PRESETS.map((p) => p.id)).toContain('opencode');
    expect(AGENT_PRESETS.every((p) => p.label.length > 0)).toBe(true);
  });
});
