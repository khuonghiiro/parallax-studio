/**
 * @parallax/application — Command bus, project state, and undo/redo.
 *
 * The application layer is the single authority for state mutations.
 * Both UI and MCP call the same command bus with the same handlers.
 */

// Commands
export { CommandBus } from './commands/command-bus.js';
export type {
  CommandHandler,
  CommandMiddleware,
  CommandEvent,
  CommandListener,
} from './commands/command-bus.js';
export { CommandRegistry } from './commands/command-registry.js';
export type { HandlerRegistration } from './commands/command-registry.js';

// History
export { UndoRedoManager } from './history/undo-redo.js';
export type { HistoryEntry } from './history/undo-redo.js';
export { Transaction } from './history/transaction.js';
export type { TransactionResult } from './history/transaction.js';

// Projects
export { ProjectState } from './projects/project-state.js';
export type {
  ProjectSnapshot,
  ProjectStateListener,
} from './projects/project-state.js';

// Jobs
export { JobQueue } from './jobs/job-queue.js';
export type { JobListener } from './jobs/job-queue.js';

// Ports (interfaces for dependency inversion)
export type { StoragePort } from './ports/storage-port.js';
export type { RendererPort } from './ports/renderer-port.js';
export type {
  EncoderPort,
  EncoderSession,
  EncoderProgressCallback,
} from './ports/encoder-port.js';
