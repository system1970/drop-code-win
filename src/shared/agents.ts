/**
 * Agent presets and command resolution.
 *
 * A "preset" is a friendly, named way to launch a known AI coding agent (or a
 * plain shell). The terminal itself is shell-agnostic: it simply spawns the
 * resolved command and pipes a pseudo-console to xterm.js, so whatever colours
 * and theme the agent prints are preserved end to end.
 */

export type AgentId = 'opencode' | 'codex' | 'claude' | 'powershell' | 'cmd' | 'custom';

export interface AgentPreset {
  readonly id: AgentId;
  readonly label: string;
  readonly description: string;
  /** Executable name (resolved against PATH at spawn time). */
  readonly command: string;
  /** Default arguments passed to the command. */
  readonly args: readonly string[];
  /** Whether this preset needs an external CLI installed on the user's machine. */
  readonly requiresExternalCli: boolean;
}

export const AGENT_PRESETS: readonly AgentPreset[] = [
  {
    id: 'opencode',
    label: 'OpenCode',
    description: 'Open source AI coding agent (opencode).',
    command: 'opencode',
    args: [],
    requiresExternalCli: true,
  },
  {
    id: 'codex',
    label: 'Codex',
    description: 'OpenAI Codex CLI (codex).',
    command: 'codex',
    args: [],
    requiresExternalCli: true,
  },
  {
    id: 'claude',
    label: 'Claude',
    description: 'Anthropic Claude CLI (claude).',
    command: 'claude',
    args: [],
    requiresExternalCli: true,
  },
  {
    id: 'powershell',
    label: 'PowerShell',
    description: 'Windows PowerShell.',
    command: 'pwsh.exe',
    args: [],
    requiresExternalCli: false,
  },
  {
    id: 'cmd',
    label: 'Command Prompt',
    description: 'Classic Windows command prompt.',
    command: 'cmd.exe',
    args: [],
    requiresExternalCli: false,
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Run your own command.',
    command: '',
    args: [],
    requiresExternalCli: false,
  },
] as const;

const PRESET_BY_ID = new Map<AgentId, AgentPreset>(AGENT_PRESETS.map((p) => [p.id, p]));

export function getAgentPreset(id: AgentId): AgentPreset | undefined {
  return PRESET_BY_ID.get(id);
}

export interface ResolvedCommand {
  readonly command: string;
  readonly args: string[];
}

/**
 * Split a command line into tokens, honouring double quotes so that paths
 * containing spaces (e.g. `"C:\Program Files\foo\bar.exe" --port 8080`) are
 * kept intact.
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const regex = /[^\s"']+|(?:"[^"]*?"|'[^']*?')/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    const token = match[0].replace(/^["']|["']$/g, '');
    if (!token) {
      continue;
    }
    tokens.push(token);
  }
  return tokens;
}

/**
 * Resolve the executable + arguments to spawn for the given settings.
 *
 * For the `'custom'` preset, `customCommand` is tokenised (respecting quotes)
 * and the first token becomes the executable; the rest are arguments merged
 * with any explicitly supplied `customArgs`.
 */
export function resolveAgentCommand(
  agent: AgentId,
  customCommand: string,
  customArgs: string,
): ResolvedCommand {
  if (agent === 'custom') {
    const tokens = tokenize(customCommand.trim());
    const extra = tokenize(customArgs.trim());
    if (tokens.length === 0) {
      return { command: 'cmd.exe', args: [] };
    }
    const [command, ...baseArgs] = tokens;
    return { command: command ?? 'cmd.exe', args: [...baseArgs, ...extra] };
  }

  const preset = getAgentPreset(agent);
  if (!preset) {
    return { command: 'cmd.exe', args: [] };
  }
  return { command: preset.command, args: [...preset.args] };
}
