import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/react-native', () => {
  const scope = {
    setLevel: vi.fn(),
    setTransactionName: vi.fn(),
    setFingerprint: vi.fn(),
    setTag: vi.fn(),
    setExtra: vi.fn(),
    setUser: vi.fn(),
  };
  return {
    withScope: vi.fn((cb: (s: typeof scope) => unknown) => cb(scope)),
    captureException: vi.fn(() => 'exception-id'),
    captureMessage: vi.fn(() => 'message-id'),
    setUser: vi.fn(),
    addBreadcrumb: vi.fn(),
    __mocks: { scope },
  };
});

import * as Sentry from '@sentry/react-native';
import { addBreadcrumb, captureMessage, captureWithContext, setUser } from '../../src/react-native/helpers.js';

const { scope } = (Sentry as unknown as { __mocks: { scope: Record<string, ReturnType<typeof vi.fn>> } }).__mocks;

describe('react-native/helpers', () => {
  beforeEach(() => {
    for (const fn of Object.values(scope)) fn.mockClear();
  });

  describe('setUser', () => {
    it('forwards the user to Sentry', () => {
      setUser({ id: 1, email: 'a@b.c' });
      expect(Sentry.setUser).toHaveBeenCalledWith({ id: 1, email: 'a@b.c' });
    });

    it('clears the user with null', () => {
      setUser(null);
      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });

  describe('addBreadcrumb', () => {
    it('adds an info breadcrumb with the app category by default', () => {
      addBreadcrumb('tap', { button: 'pay' });
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'tap',
        data: { button: 'pay' },
        category: 'app',
        level: 'info',
      });
    });

    it('honours a custom category', () => {
      addBreadcrumb('GET /me', undefined, 'http');
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ category: 'http' }));
    });
  });

  describe('captureWithContext', () => {
    it('captures inside an isolated scope and returns the event id', () => {
      const error = new Error('boom');
      expect(captureWithContext(error)).toBe('exception-id');
      expect(Sentry.withScope).toHaveBeenCalledOnce();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('applies the whole context to the scope', () => {
      captureWithContext(new Error('boom'), {
        level: 'warning',
        transaction: 'checkout/pay',
        fingerprint: ['checkout', 'pay'],
        tags: { request_id: 'r1', http_status: '502' },
        extra: { orderId: 42 },
        user: { id: 'u1' },
      });
      expect(scope.setLevel).toHaveBeenCalledWith('warning');
      expect(scope.setTransactionName).toHaveBeenCalledWith('checkout/pay');
      expect(scope.setFingerprint).toHaveBeenCalledWith(['checkout', 'pay']);
      expect(scope.setTag).toHaveBeenCalledWith('request_id', 'r1');
      expect(scope.setTag).toHaveBeenCalledWith('http_status', '502');
      expect(scope.setExtra).toHaveBeenCalledWith('orderId', 42);
      expect(scope.setUser).toHaveBeenCalledWith({ id: 'u1' });
    });

    it('passes non-Error values through untouched', () => {
      captureWithContext('plain string');
      expect(Sentry.captureException).toHaveBeenCalledWith('plain string');
    });
  });

  describe('captureMessage', () => {
    it('defaults the level to info', () => {
      expect(captureMessage('hello')).toBe('message-id');
      expect(Sentry.captureMessage).toHaveBeenCalledWith('hello', 'info');
    });

    it('uses the provided level and applies the context', () => {
      captureMessage('stock low', { level: 'warning', tags: { sku: '42' } });
      expect(Sentry.captureMessage).toHaveBeenCalledWith('stock low', 'warning');
      expect(scope.setLevel).toHaveBeenCalledWith('warning');
      expect(scope.setTag).toHaveBeenCalledWith('sku', '42');
    });
  });
});
