import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
declare global {
  interface String {
    capitalize(): string;
  }
}
// You just have to be a built in function

String.prototype.capitalize = function () {
  if (!this) return '';
  return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
};
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const frontendOrigin =
    process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
  const port = Number(process.env.PORT) || 3001;

  app.set('trust proxy', 1);
  app.use(cookieParser());
  app.enableCors({
    origin: frontendOrigin,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  await app.listen(port);
}
bootstrap();
