import { describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/core', () => {
  const setUser = vi.fn();
  const addBreadcrumb = vi.fn();
  const captureException = vi.fn(() => 'event-id-123');
  const captureMessage = vi.fn(() => 'event-id-456');
  const flush = vi.fn(async () => true);
  const setTag = vi.fn();
  const setExtra = vi.fn();
  const scopeSetUser = vi.fn();
  const setLevel = vi.fn();
  const setTransactionName = vi.fn();
  const setFingerprint = vi.fn();
  const withScope = vi.fn((cb: (scope: unknown) => unknown) =>
    cb({ setTag, setExtra, setUser: scopeSetUser, setLevel, setTransactionName, setFingerprint }),
  );
  return {
    setUser,
    addBreadcrumb,
    captureException,
    captureMessage,
    flush,
    withScope,
    __mocks: { setTag, setExtra, scopeSetUser, setLevel, setTransactionName, setFingerprint },
  };
});

import * as Sentry from '@sentry/core';
import {
  addBreadcrumb,
  captureMessage,
  captureWithContext,
  flush,
  setUser,
} from '../../src/core/helpers.js';

const mocks = (Sentry as unknown as {
  __mocks: {
    setTag: ReturnType<typeof vi.fn>;
    setExtra: ReturnType<typeof vi.fn>;
    scopeSetUser: ReturnType<typeof vi.fn>;
    setLevel: ReturnType<typeof vi.fn>;
    setTransactionName: ReturnType<typeof vi.fn>;
    setFingerprint: ReturnType<typeof vi.fn>;
  };
}).__mocks;

describe('setUser', () => {
  it('forwards user object to Sentry', () => {
    const user = { id: 1, email: 'a@b.com' };
    setUser(user);
    expect(Sentry.setUser).toHaveBeenCalledWith(user);
  });

  it('forwards null to clear user', () => {
    setUser(null);
    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });
});

describe('addBreadcrumb', () => {
  it('uses default category "app" and level "info"', () => {
    addBreadcrumb('hello');
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      message: 'hello',
      data: undefined,
      category: 'app',
      level: 'info',
    });
  });

  it('honors custom data and category', () => {
    addBreadcrumb('msg', { foo: 'bar' }, 'http');
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      message: 'msg',
      data: { foo: 'bar' },
      category: 'http',
      level: 'info',
    });
  });
});

describe('captureWithContext', () => {
  it('captures the exception and returns the event id', () => {
    const err = new Error('boom');
    const id = captureWithContext(err);
    expect(Sentry.captureException).toHaveBeenCalledWith(err);
    expect(id).toBe('event-id-123');
  });

  it('sets tags, extras, and user on the scope', () => {
    captureWithContext(new Error('x'), {
      tags: { route: '/api', method: 'GET' },
      extra: { body: { a: 1 } },
      user: { id: 7 },
    });
    expect(mocks.setTag).toHaveBeenCalledWith('route', '/api');
    expect(mocks.setTag).toHaveBeenCalledWith('method', 'GET');
    expect(mocks.setExtra).toHaveBeenCalledWith('body', { a: 1 });
    expect(mocks.scopeSetUser).toHaveBeenCalledWith({ id: 7 });
  });

  it('does not call scope setters when context is empty', () => {
    captureWithContext(new Error('x'));
    expect(mocks.setTag).not.toHaveBeenCalled();
    expect(mocks.setExtra).not.toHaveBeenCalled();
    expect(mocks.scopeSetUser).not.toHaveBeenCalled();
    expect(mocks.setLevel).not.toHaveBeenCalled();
    expect(mocks.setTransactionName).not.toHaveBeenCalled();
    expect(mocks.setFingerprint).not.toHaveBeenCalled();
  });

  it('forwards the level to the scope when provided', () => {
    captureWithContext(new Error('warn'), { level: 'warning' });
    expect(mocks.setLevel).toHaveBeenCalledWith('warning');
  });

  it('forwards the transaction to the scope, which GlitchTip renders as the culprit', () => {
    captureWithContext(new Error('x'), { transaction: 'ai-agent/sendMessage' });
    expect(mocks.setTransactionName).toHaveBeenCalledWith('ai-agent/sendMessage');
  });

  it('ignores an empty transaction rather than clearing the culprit', () => {
    captureWithContext(new Error('x'), { transaction: '' });
    expect(mocks.setTransactionName).not.toHaveBeenCalled();
  });

  it('forwards the fingerprint to the scope when provided', () => {
    captureWithContext(new Error('x'), { fingerprint: ['ai-agent', 'rate-limit'] });
    expect(mocks.setFingerprint).toHaveBeenCalledWith(['ai-agent', 'rate-limit']);
  });

  it('ignores an empty fingerprint array rather than wiping the default grouping', () => {
    captureWithContext(new Error('x'), { fingerprint: [] });
    expect(mocks.setFingerprint).not.toHaveBeenCalled();
  });
});

describe('captureMessage', () => {
  it('captures the message with the default info level and returns the event id', () => {
    const id = captureMessage('hello world');
    expect(Sentry.captureMessage).toHaveBeenCalledWith('hello world', 'info');
    expect(id).toBe('event-id-456');
  });

  it('forwards a custom level both to the scope and to captureMessage', () => {
    captureMessage('something off', { level: 'warning' });
    expect(mocks.setLevel).toHaveBeenCalledWith('warning');
    expect(Sentry.captureMessage).toHaveBeenCalledWith('something off', 'warning');
  });

  it('sets tags, extras, and user on the scope', () => {
    captureMessage('info notice', {
      level: 'info',
      tags: { feature: 'checkout' },
      extra: { orderId: '42' },
      user: { id: 9 },
    });
    expect(mocks.setTag).toHaveBeenCalledWith('feature', 'checkout');
    expect(mocks.setExtra).toHaveBeenCalledWith('orderId', '42');
    expect(mocks.scopeSetUser).toHaveBeenCalledWith({ id: 9 });
  });

  it('applies transaction and fingerprint before capturing the message', () => {
    captureMessage('Rate limited', {
      level: 'warning',
      transaction: 'ai-agent/sendMessage',
      fingerprint: ['ai-agent', 'rate-limit'],
    });
    expect(mocks.setTransactionName).toHaveBeenCalledWith('ai-agent/sendMessage');
    expect(mocks.setFingerprint).toHaveBeenCalledWith(['ai-agent', 'rate-limit']);
    expect(Sentry.captureMessage).toHaveBeenCalledWith('Rate limited', 'warning');
  });
});

describe('flush', () => {
  it('forwards the default timeout to Sentry.flush', async () => {
    await flush();
    expect(Sentry.flush).toHaveBeenCalledWith(2000);
  });

  it('forwards a custom timeout', async () => {
    await flush(500);
    expect(Sentry.flush).toHaveBeenCalledWith(500);
  });
});
