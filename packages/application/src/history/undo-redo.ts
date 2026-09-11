import type { CommandPayload, Revision } from '@parallax/contracts';

/**
 * An entry in the undo/redo history stack.
 * Stores the command that was executed and data needed to undo it.
 */
export interface HistoryEntry {
  /** The command that was executed. */
  readonly command: CommandPayload;
  /** Project revision before this command. */
  readonly previousRevision: Revision;
  /** Project revision after this command. */
  readonly nextRevision: Revision;
  /** Timestamp of execution. */
  readonly timestamp: string;
  /** Serialized state snapshot for undo (the delta or full state). */
  readonly undoData: unknown;
}

/**
 * Undo/redo manager using a revision-based history stack.
 *
 * - Executing a command pushes to the undo stack and clears the redo stack.
 * - Undo pops from the undo stack and pushes to redo.
 * - Redo pops from redo and pushes to undo.
 * - History has a configurable maximum depth.
 */
export class UndoRedoManager {
  private readonly undoStack: HistoryEntry[] = [];
  private readonly redoStack: HistoryEntry[] = [];
  private readonly maxDepth: number;

  constructor(maxDepth: number = 100) {
    this.maxDepth = Math.max(1, maxDepth);
  }

  /**
   * Record a new command execution.
   * Clears the redo stack (branching history is discarded).
   */
  push(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    this.redoStack.length = 0;

    // Trim oldest entries if over max depth
    while (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
  }

  /**
   * Pop the most recent command for undo.
   * Returns the entry that should be reversed.
   */
  undo(): HistoryEntry | undefined {
    const entry = this.undoStack.pop();

    if (entry) {
      this.redoStack.push(entry);
    }

    return entry;
  }

  /**
   * Pop the most recently undone command for redo.
   * Returns the entry that should be re-applied.
   */
  redo(): HistoryEntry | undefined {
    const entry = this.redoStack.pop();

    if (entry) {
      this.undoStack.push(entry);
    }

    return entry;
  }

  /**
   * Whether there are entries available for undo.
   */
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Whether there are entries available for redo.
   */
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Number of entries in the undo stack.
   */
  get undoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Number of entries in the redo stack.
   */
  get redoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Clear all history.
   */
  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  /**
   * Get the most recent undo entry without removing it.
   */
  peekUndo(): HistoryEntry | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }

  /**
   * Get the most recent redo entry without removing it.
   */
  peekRedo(): HistoryEntry | undefined {
    return this.redoStack[this.redoStack.length - 1];
  }
}
