import { useMemo } from 'react';
import { listCommands } from '../../chat/commands/registry.js';

interface CommandSuggestProps {
  input: string;
  onSelect: (usage: string) => void;
}

export default function CommandSuggest({ input, onSelect }: CommandSuggestProps) {
  const suggestions = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return [];
    const query = trimmed.slice(1).toLowerCase();
    return listCommands().filter(
      (cmd) =>
        cmd.name.toLowerCase().startsWith(query) ||
        cmd.aliases?.some((a) => a.toLowerCase().startsWith(query))
    );
  }, [input]);

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-cy border border-cy-coral/20 shadow-cy overflow-hidden max-h-40 overflow-y-auto z-20">
      {suggestions.map((cmd) => (
        <button
          key={cmd.name}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(`/${cmd.name} `);
          }}
          className="w-full text-left px-3 py-1.5 text-xs hover:bg-cy-cream transition-colors flex items-center gap-2"
        >
          <span className="font-bold text-cy-coral">/{cmd.name}</span>
          <span className="text-cy-warm-gray truncate">{cmd.description}</span>
        </button>
      ))}
    </div>
  );
}
