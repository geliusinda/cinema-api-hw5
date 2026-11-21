import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import type { Environment } from './database/config.js';
import { setup } from './setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setup(app);
  await app.listen(
    app.get(ConfigService<Environment, true>).get('PORT', { infer: true }),
  );
}
void bootstrap();
