import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';

// Load environment variables before module evaluation
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import { AppModule } from './app.module';
import { PrismaService } from './data/prisma.service';
import { PrismaSessionStore } from './auth/session/prisma-session-store';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Verify critical production configuration
  if (process.env.NODE_ENV === 'production') {
    const requiredEnv = ['SESSION_SECRET'];
    if (process.env.DATA_PROVIDER !== 'json') {
      requiredEnv.push('DATABASE_URL');
    }
    if (process.env.AI_PROVIDER === 'gemini') {
      requiredEnv.push('GEMINI_API_KEY');
    }
    const missing = requiredEnv.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      logger.error(`Missing critical environment variables: ${missing.join(', ')}`);
      process.exit(1);
    }
  }

  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown hooks (SIGTERM/SIGINT)
  app.enableShutdownHooks();

  // Trust proxy for secure cookies behind Render/Cloudflare reverse proxy
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // CORS
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  // Cookie parser
  app.use(cookieParser());

  // Session configuration with durable Postgres store when available
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieSecure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === 'true'
      : isProduction;

  let sessionStore: session.Store | undefined;
  if (process.env.DATA_PROVIDER !== 'json') {
    try {
      const prisma = app.get(PrismaService, { strict: false });
      if (prisma) {
        sessionStore = new PrismaSessionStore(prisma);
        logger.log('📦 Persistent PostgreSQL session store active');
      }
    } catch {
      logger.warn('PrismaService unavailable for session store; using memory fallback');
    }
  }

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'bookleaf-dev-secret',
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    }),
  );

  // Global exception filter for secure, consistent error envelopes
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global logging interceptor for latency and audit visibility
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix with health check route exclusion
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('BookLeaf Author Support Portal API')
    .setDescription('REST API for the BookLeaf Author Support & Communication Portal')
    .setVersion('1.0')
    .addCookieAuth('connect.sid')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Serve frontend SPA build if present
  const candidateWebPaths = [
    path.resolve(__dirname, '..', '..', 'web', 'dist'),
    path.resolve(process.cwd(), 'apps', 'web', 'dist'),
  ];
  const webDistPath = candidateWebPaths.find((p) => fs.existsSync(p));
  if (webDistPath) {
    app.use(express.static(webDistPath));
    app.use((req: any, res: any, next: any) => {
      if (
        req.method === 'GET' &&
        !req.path.startsWith('/api') &&
        req.path !== '/health'
      ) {
        return res.sendFile(path.join(webDistPath, 'index.html'));
      }
      next();
    });
    logger.log(`🌐 Serving frontend SPA from ${webDistPath}`);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🍃 BookLeaf API running on http://localhost:${port}`);
  logger.log(`📖 Swagger docs at http://localhost:${port}/api/docs`);
  logger.log(`🩺 Health check at http://localhost:${port}/health`);
}
bootstrap();
