import { Module } from '@nestjs/common';
import { GlitchtipModule } from '@webteamuxco/glitchtip-sdk/nest';
import { AppController } from './app.controller';

@Module({
  imports: [
    GlitchtipModule.forRoot({
      release: 'demo-nestjs@0.0.0',
      enableLogs: true,
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
