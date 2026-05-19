import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { UxcoLogger } from '@webteamuxco/glitchtip-sdk/nest';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(UxcoLogger));
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Demo NestJS app listening on http://localhost:${port}`);
}

bootstrap();
