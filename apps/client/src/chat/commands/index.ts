import { registerCommands } from './registry.js';
import { dmCommands } from './dm.js';
import { groupCommands } from './group.js';
import { navigationCommands } from './navigation.js';
import { expressionCommands } from './expression.js';
import { infoCommands } from './info.js';
import { presenceCommands } from './presence.js';
import { goCommands } from './go.js';

// Single point of registration — importing this module has the side effect
// of wiring all commands into the shared registry.
registerCommands([
  ...dmCommands,
  ...groupCommands,
  ...navigationCommands,
  ...expressionCommands,
  ...infoCommands,
  ...presenceCommands,
  ...goCommands,
]);

export { dispatchCommand, isCommand } from './dispatcher.js';
