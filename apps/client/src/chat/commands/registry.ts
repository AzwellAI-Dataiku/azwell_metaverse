import type { CommandDefinition } from './types.js';

// Module-level registry. Commands register themselves via registerCommands()
// at module load time (see index.ts).
const byName = new Map<string, CommandDefinition>();

export function registerCommands(defs: CommandDefinition[]): void {
  for (const def of defs) {
    byName.set(def.name.toLowerCase(), def);
    for (const alias of def.aliases ?? []) {
      byName.set(alias.toLowerCase(), def);
    }
  }
}

export function findCommand(name: string): CommandDefinition | undefined {
  return byName.get(name.toLowerCase());
}

/** Unique list of registered commands (primary names only). */
export function listCommands(): CommandDefinition[] {
  const seen = new Set<CommandDefinition>();
  const out: CommandDefinition[] = [];
  for (const def of byName.values()) {
    if (seen.has(def)) continue;
    seen.add(def);
    out.push(def);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
