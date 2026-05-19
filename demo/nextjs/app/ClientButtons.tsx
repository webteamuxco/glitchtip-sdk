'use client';

import { captureException, captureMessage, setUser } from '@sentry/nextjs';
import { log } from '@webteamuxco/glitchtip-sdk/next';

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
      <button
        onClick={() => {
          log.info('demo.client.log.info', { from: 'ClientButtons' });
          log.warn('demo.client.log.warn', { from: 'ClientButtons' });
          log.error('demo.client.log.error', { from: 'ClientButtons' });
        }}
      >
        Emit logs (info / warn / error)
      </button>
    </div>
  );
}
