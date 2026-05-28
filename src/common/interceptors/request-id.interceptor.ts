import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const headerValue = request.headers['x-request-id'];
    const requestId = Array.isArray(headerValue)
      ? headerValue[0]
      : (headerValue ?? randomUUID());

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    return next.handle();
  }
}
