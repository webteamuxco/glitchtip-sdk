import { NextResponse } from 'next/server';
import { log } from '@webteamuxco/glitchtip-sdk/next';

export async function GET() {
  log.info('demo.server.log.info', { feature: 'demo-next', userId: 42 });
  log.warn('demo.server.log.warn', { feature: 'demo-next', remaining: 5 });
  log.error('demo.server.log.error', { feature: 'demo-next', reason: 'card_declined' });
  return NextResponse.json({ ok: true });
}
