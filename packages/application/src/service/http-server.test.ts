import { describe, it, expect, afterEach } from 'vitest';
import {
  startApplicationService,
  type HttpServiceInstance,
} from './http-server.js';
import { ApplicationService } from './application-service.js';
import { ApplicationServiceClient } from './service-client.js';

describe('ApplicationService HTTP Server & Sync', () => {
  let instance: HttpServiceInstance | null = null;

  afterEach(async () => {
    if (instance) {
      await instance.close();
      instance = null;
    }
  });

  it('serves health check and initial snapshot', async () => {
    const service = new ApplicationService();
    instance = await startApplicationService({ port: 0, service });

    const client = new ApplicationServiceClient(
      `http://127.0.0.1:${instance.port}`,
    );

    const health = await client.checkHealth();
    expect(health).not.toBeNull();
    expect(health?.status).toBe('connected');
    expect(health?.projectLoaded).toBe(true);

    const snapshot = await client.fetchSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.manifest.name).toBe('Parallax Studio Master');
  });

  it('dispatches commands over HTTP and mutates authoritative state', async () => {
    const service = new ApplicationService();
    instance = await startApplicationService({ port: 0, service });

    const client = new ApplicationServiceClient(
      `http://127.0.0.1:${instance.port}`,
    );

    // Dispatch create_project command
    const res = await client.dispatch({
      type: 'create_project',
      domain: 'project',
      data: { name: 'Shared Cinema Project' },
    });

    expect(res.status).toBe('success');

    // Fetch snapshot and verify the change
    const snap = await client.fetchSnapshot();
    expect(snap?.manifest.name).toBe('Shared Cinema Project');
    expect(service.getSnapshot()?.manifest.name).toBe('Shared Cinema Project');
  });
});
