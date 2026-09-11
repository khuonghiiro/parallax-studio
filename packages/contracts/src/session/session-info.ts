import { z } from 'zod';
import { RevisionSchema } from '../common.js';

/**
 * Service connection status schema.
 */
export const SessionConnectionStatusSchema = z.enum([
  'connected',
  'disconnected',
  'syncing',
]);
export type SessionConnectionStatus = z.infer<
  typeof SessionConnectionStatusSchema
>;

/**
 * SessionInfo contract defining the shared application service connection state.
 */
export const SessionInfoSchema = z.object({
  sessionId: z.string(),
  status: SessionConnectionStatusSchema,
  servicePort: z.number(),
  revision: RevisionSchema,
  projectLoaded: z.boolean(),
  projectName: z.string().optional(),
  connectedClients: z.number(),
});
export type SessionInfo = z.infer<typeof SessionInfoSchema>;

/**
 * Real-time event transmitted across Server-Sent Events (SSE) stream.
 */
export const StateSyncEventSchema = z.object({
  type: z.enum(['init', 'state_changed', 'command_dispatched']),
  revision: RevisionSchema,
  timestamp: z.string(),
  data: z.record(z.unknown()),
});
export type StateSyncEvent = z.infer<typeof StateSyncEventSchema>;
