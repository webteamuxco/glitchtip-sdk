import { Module } from '@nestjs/common';
import { GlitchtipModule } from '@uxco/glitchtip/nest';
import { AppController } from './app.controller';

@Module({
  imports: [
    GlitchtipModule.forRoot({
      release: 'demo-nestjs@0.0.0',
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
