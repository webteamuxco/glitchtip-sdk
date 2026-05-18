import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { captureWithContext, setUser } from '@uxco/glitchtip';

@Controller()
export class AppController {
  @Get()
  index() {
    return {
      message: '@uxco/glitchtip NestJS demo',
      routes: [
        'GET /boom — uncaught Error (5xx, reported)',
        'GET /http-error — HttpException 400 (ignored by filter)',
        'GET /captured — manual captureWithContext',
        'GET /user — sets a Sentry user',
      ],
    };
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
