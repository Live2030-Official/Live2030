import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as express from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const logger = new Logger('Live2030-Bootstrap');
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Serve uploaded assets statically
  const uploadsPath = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsPath)) {
    mkdirSync(uploadsPath, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsPath));

  // Trust the reverse proxy (nginx / load balancer) so rate limiting and
  // secure-cookie logic see the real client IP.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Standard security headers. `cross-origin` keeps uploaded media usable by
  // the mobile app and the admin dashboard on a different origin.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  // CORS: only the configured origins are allowed. Native mobile clients do not
  // send an Origin header and are therefore unaffected.
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.enableShutdownHooks();

  app.use((req: any, res: any, next: any) => {
    logger.log(`📥 [HTTP] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger / OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Live 2030 Platform API')
    .setDescription('High-Scale Live Streaming & Agora RTC Backend API for Live 2030')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 Live 2030 Backend running on: http://localhost:${port}`);
  logger.log(`📚 Swagger API Documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
