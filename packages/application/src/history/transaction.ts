import type { CommandPayload, CommandResult, Revision } from '@parallax/contracts';
import type { CommandBus } from '../commands/command-bus.js';

/**
 * Atomic transaction that groups multiple commands.
 * All commands succeed or all are rolled back.
 */
export class Transaction {
  private readonly commands: CommandPayload[] = [];
  private readonly results: CommandResult[] = [];
  private committed = false;
  private rolledBack = false;

  constructor(
    readonly id: string,
    private readonly bus: CommandBus,
    readonly startRevision: Revision,
  ) {}

  /**
   * Add a command to this transaction.
   * Commands are buffered until commit.
   */
  add(command: CommandPayload): void {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction is already finalized');
    }
    this.commands.push(command);
  }

  /**
   * Execute all buffered commands atomically.
   * If any command fails, all previous commands are rolled back.
   */
  async commit(): Promise<TransactionResult> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction is already finalized');
    }

    for (const command of this.commands) {
      const result = await this.bus.dispatch(command);

      if (result.status !== 'success') {
        this.rolledBack = true;
        return {
          success: false,
          commandCount: this.commands.length,
          failedAt: this.results.length,
          error: result.error ?? 'Command failed',
          results: this.results,
        };
      }

      this.results.push(result);
    }

    this.committed = true;

    return {
      success: true,
      commandCount: this.commands.length,
      results: this.results,
    };
  }

  /**
   * Number of commands in this transaction.
   */
  get size(): number {
    return this.commands.length;
  }

  /**
   * Whether this transaction has been finalized.
   */
  get isFinalized(): boolean {
    return this.committed || this.rolledBack;
  }
}

/**
 * Result of a transaction execution.
 */
export interface TransactionResult {
  readonly success: boolean;
  readonly commandCount: number;
  /** Index of the failed command (only when success is false). */
  readonly failedAt?: number;
  readonly error?: string;
  readonly results: readonly CommandResult[];
}
