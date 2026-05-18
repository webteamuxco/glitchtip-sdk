import { useState } from 'react';
import {
  ErrorBoundary,
  captureException,
  captureMessage,
  setUser,
} from '@uxco/glitchtip/react';

function BrokenChild({ shouldExplode }: { shouldExplode: boolean }) {
  if (shouldExplode) {
    throw new Error('Demo: render-time error from <BrokenChild />');
  }
  return <p>BrokenChild is healthy.</p>;
}

export function App() {
  const [explode, setExplode] = useState(false);

  return (
    <main style={{ fontFamily: 'system-ui', padding: 32, maxWidth: 720 }}>
      <h1>@uxco/glitchtip — React demo</h1>
      <p>
        Set <code>VITE_GLITCHTIP_DSN</code> in <code>.env.local</code>, then click any
        button below — the event should land in your GlitchTip project.
      </p>

      <section style={{ display: 'grid', gap: 12, marginTop: 24 }}>
        <button
          onClick={() => {
            throw new Error('Demo: uncaught error from button onClick');
          }}
        >
          Throw uncaught error
        </button>

        <button
          onClick={() => {
            try {
              JSON.parse('{ not json');
            } catch (err) {
              captureException(err, { tags: { feature: 'demo-button' } });
            }
          }}
        >
          captureException with tag
        </button>

        <button onClick={() => captureMessage('Demo: hello from React', 'info')}>
          captureMessage (info)
        </button>

        <button
          onClick={() =>
            setUser({ id: 'demo-user-1', email: 'demo@example.com' })
          }
        >
          setUser
        </button>

        <button onClick={() => setExplode(true)}>
          Trigger ErrorBoundary
        </button>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>ErrorBoundary</h2>
        <ErrorBoundary fallback={<p style={{ color: 'crimson' }}>Boundary caught the error.</p>}>
          <BrokenChild shouldExplode={explode} />
        </ErrorBoundary>
      </section>
    </main>
  );
}
