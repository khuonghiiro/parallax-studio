import http from 'node:http';
import {
  ApplicationService,
  getApplicationService,
} from './application-service.js';
import type { CommandPayload } from '@parallax/contracts';

export interface HttpServiceOptions {
  port?: number;
  host?: string;
  service?: ApplicationService;
}

export interface HttpServiceInstance {
  readonly server: http.Server;
  readonly port: number;
  readonly host: string;
  readonly close: () => Promise<void>;
}

/**
 * Starts the unified local HTTP Application Service.
 * Serves command dispatching, state snapshots, and real-time SSE streaming.
 */
export async function startApplicationService(
  options: HttpServiceOptions = {},
): Promise<HttpServiceInstance> {
  const service = options.service ?? getApplicationService();
  const host = options.host ?? '127.0.0.1';
  const requestedPort = options.port ?? 3100;

  const sseClients = new Set<http.ServerResponse>();

  // Broadcast state changes to all connected SSE clients
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

  const server = http.createServer(async (req, res) => {
    // CORS headers for local development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://${host}:${requestedPort}`);
    const pathname = url.pathname;

    try {
      // 1. Health check
      if (pathname === '/api/health' && req.method === 'GET') {
        const info = service.getSessionInfo(requestedPort, sseClients.size);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(info));
        return;
      }

      // 2. Full State snapshot
      if (pathname === '/api/state' && req.method === 'GET') {
        const snapshot = service.getSerializableSnapshot();
        res.writeHead(200, { 'Content-Type': 'application/json' });
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
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      // 4. Server-Sent Events (SSE) stream
      if (pathname === '/api/events' && req.method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });

        // Send initial snapshot
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

      // 404 for unknown routes
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found', pathname }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'internal_error',
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(requestedPort, host, () => {
      const address = server.address();
      const actualPort =
        typeof address === 'object' && address ? address.port : requestedPort;

      resolve({
        server,
        port: actualPort,
        host,
        close: () => {
          return new Promise<void>((resClose) => {
            for (const client of sseClients) {
              client.end();
            }
            sseClients.clear();
            server.close(() => resClose());
          });
        },
      });
    });
  });
}
