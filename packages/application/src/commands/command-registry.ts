import type {
  CommandType,
  CommandDomain,
} from '@parallax/contracts';
import type { CommandHandler } from './command-bus.js';

/**
 * Metadata about a registered command handler.
 */
export interface HandlerRegistration {
  readonly type: CommandType;
  readonly domain: CommandDomain;
  readonly handler: CommandHandler;
  readonly description: string;
}

/**
 * Registry of all command handlers organized by domain.
 * Provides discovery and documentation for MCP tool catalogs.
 */
export class CommandRegistry {
  private readonly registrations = new Map<CommandType, HandlerRegistration>();

  /**
   * Register a handler with metadata.
   */
  register(registration: HandlerRegistration): void {
    if (this.registrations.has(registration.type)) {
      throw new Error(
        `Command type already registered: ${registration.type}`,
      );
    }
    this.registrations.set(registration.type, registration);
  }

  /**
   * Get registration for a specific command type.
   */
  get(type: CommandType): HandlerRegistration | undefined {
    return this.registrations.get(type);
  }

  /**
   * List all registered command types.
   */
  listAll(): readonly HandlerRegistration[] {
    return [...this.registrations.values()];
  }

  /**
   * List command types for a specific domain.
   */
  listByDomain(domain: CommandDomain): readonly HandlerRegistration[] {
    return [...this.registrations.values()].filter(
      (reg) => reg.domain === domain,
    );
  }

  /**
   * Get the number of registered handlers.
   */
  get size(): number {
    return this.registrations.size;
  }
}
