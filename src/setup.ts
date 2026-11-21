import { ValidationPipe, type INestApplication } from '@nestjs/common';

export function setup(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );
}
