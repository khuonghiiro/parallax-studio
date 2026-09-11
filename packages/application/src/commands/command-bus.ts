import type {
  CommandPayload,
  CommandResult,
  CommandType,
} from '@parallax/contracts';

/**
 * Handler function for a specific command type.
 * Receives the command payload and returns a result.
 */
export type CommandHandler = (
  payload: CommandPayload,
) => Promise<CommandResult> | CommandResult;

/**
 * Middleware function that wraps command execution.
 * Can inspect, modify, or short-circuit command processing.
 */
export type CommandMiddleware = (
  payload: CommandPayload,
  next: () => Promise<CommandResult>,
) => Promise<CommandResult>;

/**
 * Event emitted after a command is processed.
 */
export interface CommandEvent {
  readonly payload: CommandPayload;
  readonly result: CommandResult;
  readonly timestamp: string;
}

/**
 * Listener for command events.
 */
export type CommandListener = (event: CommandEvent) => void;

/**
 * Central command bus — the single entry point for all
 * state-mutating operations in Parallax Studio.
 *
 * Both UI and MCP call the same bus with the same handlers.
 * Handlers are registered by command type.
 */
export class CommandBus {
  private readonly handlers = new Map<CommandType, CommandHandler>();
  private readonly middleware: CommandMiddleware[] = [];
  private readonly listeners: CommandListener[] = [];

  /**
   * Register a handler for a specific command type.
   * Each command type may have exactly one handler.
   */
  registerHandler(type: CommandType, handler: CommandHandler): void {
    if (this.handlers.has(type)) {
      throw new Error(`Handler already registered for command type: ${type}`);
    }
    this.handlers.set(type, handler);
  }

  /**
   * Add middleware to the processing pipeline.
   * Middleware executes in registration order (first in, first out).
   */
  use(middleware: CommandMiddleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Subscribe to command completion events.
   * Returns an unsubscribe function.
   */
  onCommand(listener: CommandListener): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Dispatch a command through the middleware chain to its handler.
   *
   * @throws Error if no handler is registered for the command type.
   */
  async dispatch(payload: CommandPayload): Promise<CommandResult> {
    const handler = this.handlers.get(payload.type);

    if (!handler) {
      return {
        status: 'internal_error',
        error: `No handler registered for command type: ${payload.type}`,
      };
    }

    // Build middleware chain
    const execute = async (): Promise<CommandResult> => {
      return handler(payload);
    };

    const chain = this.middleware.reduceRight<() => Promise<CommandResult>>(
      (next, mw) => () => mw(payload, next),
      execute,
    );

    const result = await chain();

    // Notify listeners
    const event: CommandEvent = {
      payload,
      result,
      timestamp: new Date().toISOString(),
    };

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Listener errors must not break the command flow
      }
    }

    return result;
  }

  /**
   * Check if a handler is registered for a given command type.
   */
  hasHandler(type: CommandType): boolean {
    return this.handlers.has(type);
  }
}
