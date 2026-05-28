import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { notifyProductionError } from 'src/common/utils/error-email.helper';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse();
    const request = context.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    this.logger.error(
      `${request.method} ${request.url} failed`,
      exception instanceof Error ? exception.stack : undefined,
    );

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      void notifyProductionError({
        functionName: 'GlobalExceptionFilter.catch',
        error: exception,
        context: {
          statusCode: status,
          method: request.method,
          path: request.url,
          requestId: request.requestId,
          userId: request.user?.sub,
          tenantId: request.user?.tenantId,
          body: request.body,
          params: request.params,
          query: request.query,
        },
      });
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.requestId,
    });
  }
}
