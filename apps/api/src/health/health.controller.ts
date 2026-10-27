import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../data/prisma.service';

@ApiTags('System Health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Liveness and readiness health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is degraded or unhealthy' })
  async checkRoot(@Res() res: Response) {
    return this.runHealthCheck(res);
  }

  @Get('api/v1/health')
  @ApiOperation({ summary: 'API v1 health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async checkApi(@Res() res: Response) {
    return this.runHealthCheck(res);
  }

  private async runHealthCheck(res: Response) {
    let dbStatus = 'healthy';
    let dbError: string | null = null;

    if (process.env.DATA_PROVIDER !== 'json') {
      try {
        await this.prisma.$queryRawUnsafe('SELECT 1');
      } catch (err: any) {
        dbStatus = 'unreachable';
        dbError = err.message;
      }
    } else {
      dbStatus = 'local-json-store';
    }

    const memoryUsage = process.memoryUsage();
    const isHealthy = dbStatus !== 'unreachable';

    const payload = {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      data_provider: process.env.DATA_PROVIDER || 'json',
      ai_provider: process.env.AI_PROVIDER || 'mock',
      ai_model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      database: {
        status: dbStatus,
        ...(dbError ? { error: dbError } : {}),
      },
      system: {
        node_version: process.version,
        heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss_mb: Math.round(memoryUsage.rss / 1024 / 1024),
      },
    };

    return res.status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(payload);
  }
}
