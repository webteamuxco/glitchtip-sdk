'use client';

import { captureException, captureMessage, setUser } from '@sentry/nextjs';

export function ClientButtons() {
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
      <button
        onClick={() => {
          throw new Error('Demo: uncaught client error');
        }}
      >
        Throw uncaught error
      </button>
      <button
        onClick={() => {
          try {
            JSON.parse('{ nope');
          } catch (err) {
            captureException(err, { tags: { feature: 'demo-client' } });
          }
        }}
      >
        captureException
      </button>
      <button onClick={() => captureMessage('Demo: hello from Next.js client', 'info')}>
        captureMessage (info)
      </button>
      <button onClick={() => setUser({ id: 'demo-user-1', email: 'demo@example.com' })}>
        setUser
      </button>
    </div>
  );
}
