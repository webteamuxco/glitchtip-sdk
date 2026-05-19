import { initServer } from '@webteamuxco/glitchtip-sdk/next/server';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    initServer({ release: 'demo-nextjs@0.0.0', enableLogs: true });
  }
}
