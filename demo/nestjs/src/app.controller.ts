import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { captureWithContext, log, setUser } from '@webteamuxco/glitchtip-sdk';

@Controller()
export class AppController {
  @Get()
  index() {
    return {
      message: '@webteamuxco/glitchtip-sdk NestJS demo',
      routes: [
        'GET /boom — uncaught Error (5xx, reported)',
        'GET /http-error — HttpException 400 (ignored by filter)',
        'GET /captured — manual captureWithContext',
        'GET /user — sets a Sentry user',
        'GET /logs — emits info / warn / error logs',
      ],
    };
  }

  @Get('logs')
  logs() {
    log.info('demo.logs.info', { feature: 'demo-nest', userId: 42 });
    log.warn('demo.logs.warn', { feature: 'demo-nest', remaining: 5 });
    log.error('demo.logs.error', { feature: 'demo-nest', reason: 'card_declined' });
    return { ok: true };
  }

  @Get('boom')
  boom() {
    throw new Error('Demo: uncaught error in controller');
  }

  @Get('http-error')
  httpError() {
    // 4xx HttpException — the default filter does NOT forward this.
    throw new HttpException('Bad request demo', HttpStatus.BAD_REQUEST);
  }

  @Get('captured')
  captured() {
    try {
      JSON.parse('{ nope');
    } catch (err) {
      captureWithContext(err, { tags: { feature: 'demo-nest' } });
    }
    return { ok: true };
  }

  @Get('user')
  user() {
    setUser({ id: 'demo-user-1', email: 'demo@example.com' });
    return { ok: true };
  }
}
