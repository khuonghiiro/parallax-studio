import { z } from 'zod';
import { EntityIdSchema, RevisionSchema } from '../common.js';

/**
 * Metadata attached to every command for tracking and undo/redo.
 */
export const RevisionMetaSchema = z.object({
  /** Revision number before this command. */
  previousRevision: RevisionSchema,

  /** Revision number after this command succeeds. */
  nextRevision: RevisionSchema,

  /** ISO 8601 timestamp when the command was issued. */
  timestamp: z.string().datetime(),
});
export type RevisionMeta = z.infer<typeof RevisionMetaSchema>;

/**
 * Transaction metadata for atomic command batches.
 * All commands in a transaction succeed or fail together.
 */
export const TransactionMetaSchema = z.object({
  /** Unique transaction identifier. */
  transactionId: EntityIdSchema,

  /** Number of commands in this transaction. */
  commandCount: z.number().int().positive(),

  /** Whether this is the final command in the transaction. */
  isCommit: z.boolean(),
});
export type TransactionMeta = z.infer<typeof TransactionMetaSchema>;
