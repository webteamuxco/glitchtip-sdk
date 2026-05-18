import Link from 'next/link';
import { ClientButtons } from './ClientButtons';
import { throwOnServer } from './actions';

export default function Home() {
  return (
    <main>
      <h1>@uxco/glitchtip — Next.js demo</h1>
      <p>
        Set <code>GLITCHTIP_DSN</code> and <code>NEXT_PUBLIC_GLITCHTIP_DSN</code> in
        <code> .env.local</code>, then trigger errors below.
      </p>

      <h2>Client-side</h2>
      <ClientButtons />

      <h2 style={{ marginTop: 32 }}>Server-side</h2>
      <form action={throwOnServer} style={{ display: 'inline' }}>
        <button type="submit">Throw inside a server action</button>
      </form>
      <p>
        <Link href="/api/boom">GET /api/boom (server route handler)</Link>
      </p>
    </main>
  );
}
