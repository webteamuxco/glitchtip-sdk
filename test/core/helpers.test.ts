import { describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/node', () => {
  const setUser = vi.fn();
  const addBreadcrumb = vi.fn();
  const captureException = vi.fn(() => 'event-id-123');
  const flush = vi.fn(async () => true);
  const setTag = vi.fn();
  const setExtra = vi.fn();
  const scopeSetUser = vi.fn();
  const withScope = vi.fn((cb: (scope: unknown) => unknown) =>
    cb({ setTag, setExtra, setUser: scopeSetUser }),
  );
  return {
    setUser,
    addBreadcrumb,
    captureException,
    flush,
    withScope,
    __mocks: { setTag, setExtra, scopeSetUser },
  };
});

import * as Sentry from '@sentry/node';
import { addBreadcrumb, captureWithContext, flush, setUser } from '../../src/core/helpers.js';

const mocks = (Sentry as unknown as { __mocks: { setTag: ReturnType<typeof vi.fn>; setExtra: ReturnType<typeof vi.fn>; scopeSetUser: ReturnType<typeof vi.fn> } }).__mocks;

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
