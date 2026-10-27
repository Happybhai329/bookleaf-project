import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { method, originalUrl } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const statusCode = res.statusCode;
          const user = (req.session as any)?.userName || (req.session as any)?.authorId || 'Anonymous';
          this.logger.log(
            `${method} ${originalUrl} ${statusCode} +${duration}ms - User: ${user}`,
          );
        },
        error: (err) => {
          const duration = Date.now() - start;
          const statusCode = err?.status || 500;
          this.logger.warn(
            `${method} ${originalUrl} ${statusCode} +${duration}ms - Error: ${err.message}`,
          );
        },
      }),
    );
  }
}
