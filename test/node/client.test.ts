import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/node', () => {
  const clients: FakeNodeClient[] = [];
  const scopes: FakeScope[] = [];

  class FakeNodeClient {
    options: Record<string, unknown>;
    init = vi.fn();
    flush = vi.fn(async (_timeout?: number) => true);
    close = vi.fn(async (_timeout?: number) => true);
    constructor(options: Record<string, unknown>) {
      this.options = options;
      clients.push(this);
    }
  }

  class FakeScope {
    setClient = vi.fn();
    setUser = vi.fn();
    addBreadcrumb = vi.fn();
    setLevel = vi.fn();
    setTag = vi.fn();
    setExtra = vi.fn();
    setTransactionName = vi.fn();
    setFingerprint = vi.fn();
    captureException = vi.fn(() => 'exception-id');
    captureMessage = vi.fn(() => 'message-id');
    constructor() {
      scopes.push(this);
    }
  }

  return {
    NodeClient: FakeNodeClient,
    Scope: FakeScope,
    defaultStackParser: () => [],
    makeNodeTransport: () => ({}),
    getDefaultIntegrationsWithoutPerformance: vi.fn(() => [
      { name: 'InboundFilters' },
      { name: 'FunctionToString' },
      { name: 'LinkedErrors' },
      { name: 'Dedupe' },
      { name: 'ContextLines' },
      { name: 'Context' },
      { name: 'Modules' },
      { name: 'OnUncaughtException' },
      { name: 'OnUnhandledRejection' },
      { name: 'Http' },
      { name: 'NodeFetch' },
      { name: 'ProcessSession' },
      { name: 'LocalVariables' },
    ]),
    __mocks: { clients, scopes },
  };
});

import * as Sentry from '@sentry/node';
import { createClient } from '../../src/node/client.js';

type FakeClient = {
  options: Record<string, unknown>;
  init: ReturnType<typeof vi.fn>;
  flush: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};
type FakeScope = {
  setClient: ReturnType<typeof vi.fn>;
  setUser: ReturnType<typeof vi.fn>;
  addBreadcrumb: ReturnType<typeof vi.fn>;
  setLevel: ReturnType<typeof vi.fn>;
  setTag: ReturnType<typeof vi.fn>;
  setExtra: ReturnType<typeof vi.fn>;
  setTransactionName: ReturnType<typeof vi.fn>;
  setFingerprint: ReturnType<typeof vi.fn>;
  captureException: ReturnType<typeof vi.fn>;
  captureMessage: ReturnType<typeof vi.fn>;
};

const { __mocks } = Sentry as unknown as {
  __mocks: { clients: FakeClient[]; scopes: FakeScope[] };
};

const ENV_KEYS = ['SENTRY_DSN', 'GLITCHTIP_DSN', 'NODE_ENV'] as const;

function lastClient(): FakeClient {
  return __mocks.clients[__mocks.clients.length - 1]!;
}

function lastScope(): FakeScope {
  return __mocks.scopes[__mocks.scopes.length - 1]!;
}

describe('node/createClient', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    __mocks.clients.length = 0;
    __mocks.scopes.length = 0;
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns null when no DSN is available', () => {
    expect(createClient()).toBeNull();
    expect(__mocks.clients).toHaveLength(0);
  });

  it('returns null when enabled=false even with a DSN', () => {
    expect(createClient({ dsn: 'd', enabled: false })).toBeNull();
    expect(__mocks.clients).toHaveLength(0);
  });

  it('builds a NodeClient with the resolved config', () => {
    createClient({ dsn: 'd', environment: 'staging', release: '2.0.0', serverName: 'agent-1' });

    expect(__mocks.clients).toHaveLength(1);
    expect(lastClient().options).toMatchObject({
      dsn: 'd',
      environment: 'staging',
      release: '2.0.0',
      serverName: 'agent-1',
    });
    expect(lastClient().options.transport).toBe(Sentry.makeNodeTransport);
    expect(lastClient().options.stackParser).toBe(Sentry.defaultStackParser);
  });

  it('falls back to GLITCHTIP_DSN from the environment', () => {
    process.env.GLITCHTIP_DSN = 'gt-dsn';
    createClient();
    expect(lastClient().options.dsn).toBe('gt-dsn');
  });

  it('keeps only process-safe integrations on the isolated client', () => {
    createClient({ dsn: 'd' });
    const names = (lastClient().options.integrations as { name: string }[]).map((i) => i.name);

    expect(names).toEqual([
      'InboundFilters',
      'FunctionToString',
      'LinkedErrors',
      'Dedupe',
      'ContextLines',
      'Context',
      'Modules',
    ]);
    expect(names).not.toContain('OnUncaughtException');
    expect(names).not.toContain('OnUnhandledRejection');
    expect(names).not.toContain('Http');
  });

  it('binds the client to a dedicated scope and initialises it', () => {
    createClient({ dsn: 'd' });

    expect(__mocks.scopes).toHaveLength(1);
    expect(lastScope().setClient).toHaveBeenCalledWith(lastClient());
    expect(lastClient().init).toHaveBeenCalledOnce();
  });

  it('captures exceptions on the isolated scope with context applied', () => {
    const client = createClient({ dsn: 'd' })!;
    const error = new Error('boom');

    const id = client.captureWithContext(error, {
      level: 'warning',
      tags: { feature: 'agent' },
      extra: { attempt: 2 },
      transaction: 'agent/run',
      fingerprint: ['agent', 'run'],
    });

    expect(id).toBe('exception-id');
    expect(lastScope().captureException).toHaveBeenCalledWith(error);
    expect(lastScope().setLevel).toHaveBeenCalledWith('warning');
    expect(lastScope().setTag).toHaveBeenCalledWith('feature', 'agent');
    expect(lastScope().setExtra).toHaveBeenCalledWith('attempt', 2);
    expect(lastScope().setTransactionName).toHaveBeenCalledWith('agent/run');
    expect(lastScope().setFingerprint).toHaveBeenCalledWith(['agent', 'run']);
  });

  it('captures messages on the isolated scope, defaulting to info', () => {
    const client = createClient({ dsn: 'd' })!;

    client.captureMessage('hello');
    expect(lastScope().captureMessage).toHaveBeenCalledWith('hello', 'info');

    client.captureMessage('careful', { level: 'warning' });
    expect(lastScope().captureMessage).toHaveBeenCalledWith('careful', 'warning');
  });

  it('forwards setUser to the isolated scope', () => {
    const client = createClient({ dsn: 'd' })!;
    client.setUser({ id: 42, email: 'a@b.c' });
    expect(lastScope().setUser).toHaveBeenCalledWith({ id: 42, email: 'a@b.c' });

    client.setUser(null);
    expect(lastScope().setUser).toHaveBeenCalledWith(null);
  });

  it('adds info breadcrumbs with the app category by default', () => {
    const client = createClient({ dsn: 'd' })!;
    client.addBreadcrumb('step', { n: 1 });
    expect(lastScope().addBreadcrumb).toHaveBeenCalledWith({
      message: 'step',
      data: { n: 1 },
      category: 'app',
      level: 'info',
    });

    client.addBreadcrumb('query', undefined, 'db');
    expect(lastScope().addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'query', category: 'db' }),
    );
  });

  it('forwards flush and close to the client with a 2s default timeout', async () => {
    const client = createClient({ dsn: 'd' })!;

    await expect(client.flush()).resolves.toBe(true);
    expect(lastClient().flush).toHaveBeenCalledWith(2000);

    await expect(client.close(500)).resolves.toBe(true);
    expect(lastClient().close).toHaveBeenCalledWith(500);
  });

  it('isolates two clients from each other', () => {
    const a = createClient({ dsn: 'dsn-a' })!;
    const b = createClient({ dsn: 'dsn-b' })!;

    expect(__mocks.clients.map((c) => c.options.dsn)).toEqual(['dsn-a', 'dsn-b']);

    a.captureMessage('from a');
    expect(__mocks.scopes[0]!.captureMessage).toHaveBeenCalledWith('from a', 'info');
    expect(__mocks.scopes[1]!.captureMessage).not.toHaveBeenCalled();

    b.captureMessage('from b');
    expect(__mocks.scopes[1]!.captureMessage).toHaveBeenCalledWith('from b', 'info');
  });
});
