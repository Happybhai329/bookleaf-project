import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';

// Load environment variables before module evaluation
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // Session
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieSecure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === 'true'
      : isProduction;

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'bookleaf-dev-secret',
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

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api/v1');

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
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(webDistPath, 'index.html'));
      }
      next();
    });
    console.log(`🌐 Serving frontend SPA from ${webDistPath}`);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🍃 BookLeaf API running on http://localhost:${port}`);
  console.log(`📖 Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
