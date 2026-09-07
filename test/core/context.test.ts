import { describe, expect, it, vi } from 'vitest';

import { applyContext, type ScopeLike } from '../../src/core/context.js';

function buildScope() {
  return {
    setLevel: vi.fn(),
    setTransactionName: vi.fn(),
    setFingerprint: vi.fn(),
    setTag: vi.fn(),
    setExtra: vi.fn(),
    setUser: vi.fn(),
  } satisfies ScopeLike;
}

describe('applyContext', () => {
  it('does nothing for an empty context', () => {
    const scope = buildScope();
    applyContext(scope, {});
    for (const fn of Object.values(scope)) expect(fn).not.toHaveBeenCalled();
  });

  it('maps level, transaction and fingerprint', () => {
    const scope = buildScope();
    applyContext(scope, { level: 'warning', transaction: 'GET /x', fingerprint: ['a', 'b'] });
    expect(scope.setLevel).toHaveBeenCalledWith('warning');
    expect(scope.setTransactionName).toHaveBeenCalledWith('GET /x');
    expect(scope.setFingerprint).toHaveBeenCalledWith(['a', 'b']);
  });

  it('ignores an empty fingerprint array', () => {
    const scope = buildScope();
    applyContext(scope, { fingerprint: [] });
    expect(scope.setFingerprint).not.toHaveBeenCalled();
  });

  it('sets one tag and one extra per entry', () => {
    const scope = buildScope();
    applyContext(scope, { tags: { a: '1', b: '2' }, extra: { n: 1, o: { k: true } } });
    expect(scope.setTag).toHaveBeenCalledTimes(2);
    expect(scope.setTag).toHaveBeenCalledWith('a', '1');
    expect(scope.setTag).toHaveBeenCalledWith('b', '2');
    expect(scope.setExtra).toHaveBeenCalledTimes(2);
    expect(scope.setExtra).toHaveBeenCalledWith('o', { k: true });
  });

  it('forwards the user', () => {
    const scope = buildScope();
    applyContext(scope, { user: { id: 7, email: 'a@b.c' } });
    expect(scope.setUser).toHaveBeenCalledWith({ id: 7, email: 'a@b.c' });
  });
});
