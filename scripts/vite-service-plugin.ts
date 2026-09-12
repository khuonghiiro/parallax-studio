import type { Plugin, ViteDevServer } from 'vite';
import type { ServerResponse, IncomingMessage } from 'node:http';
import { getApplicationService } from '../packages/application/src/index.js';
import type { CommandPayload } from '@parallax/contracts';

/**
 * Vite plugin that mounts the Parallax Application Service directly
 * into the Vite dev server on port 5173.
 *
 * This ensures /api/health, /api/state, /api/commands, and /api/events (SSE)
 * are always live whenever Vite is running, without needing a separate port!
 */
export function parallaxServicePlugin(): Plugin {
  return {
    name: 'parallax-service-plugin',
    configureServer(server: ViteDevServer) {
      const service = getApplicationService();
      const sseClients = new Set<ServerResponse>();

      // Broadcast state changes to all connected SSE browser tabs
      service.subscribe(() => {
        const serializable = service.getSerializableSnapshot();
        const eventPayload = JSON.stringify({
          type: 'state_changed',
          revision: serializable?.revision ?? 0,
          timestamp: new Date().toISOString(),
          snapshot: serializable,
        });

        for (const client of sseClients) {
          try {
            client.write(`data: ${eventPayload}\n\n`);
          } catch {
            sseClients.delete(client);
          }
        }
      });

      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url || '';

        // Only intercept /api routes
        if (!url.startsWith('/api')) {
          return next();
        }

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        const pathname = url.split('?')[0];

        try {
          // 1. Health check
          if (pathname === '/api/health' && req.method === 'GET') {
            const info = service.getSessionInfo(5173, sseClients.size);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(info));
            return;
          }

          // 2. Full State snapshot
          if (pathname === '/api/state' && req.method === 'GET') {
            const snapshot = service.getSerializableSnapshot();
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ status: 'success', snapshot }));
            return;
          }

          // 3. Command Dispatch
          if (pathname === '/api/commands' && req.method === 'POST') {
            const bodyChunks: Buffer[] = [];
            for await (const chunk of req) {
              bodyChunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            const bodyText = Buffer.concat(bodyChunks).toString('utf-8');
            const payload = JSON.parse(bodyText) as CommandPayload;

            const result = await service.dispatch(payload);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(result));
            return;
          }

          // 4. Server-Sent Events (SSE) stream
          if (pathname === '/api/events' && req.method === 'GET') {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.statusCode = 200;

            const initData = JSON.stringify({
              type: 'init',
              timestamp: new Date().toISOString(),
              snapshot: service.getSerializableSnapshot(),
            });
            res.write(`data: ${initData}\n\n`);

            sseClients.add(res);

            req.on('close', () => {
              sseClients.delete(res);
            });
            return;
          }

          next();
        } catch (err) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              status: 'internal_error',
              error: err instanceof Error ? err.message : String(err),
            }),
          );
        }
      });
    },
  };
}
