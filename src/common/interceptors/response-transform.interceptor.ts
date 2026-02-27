import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
export interface ApiResponse<T = unknown> {
  status: number;
  message: string;
  data: T;
}

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const res = context.switchToHttp().getResponse<{ statusCode?: number }>();
    const statusCode = res.statusCode ?? 200;

    return next.handle().pipe(
      map((result) => {
        const message =
          result != null &&
          typeof result === 'object' &&
          'message' in result &&
          typeof (result as { message?: string }).message === 'string'
            ? (result as { message: string }).message
            : 'Success';

        let data: T;
        if (
          result != null &&
          typeof result === 'object' &&
          'message' in result &&
          typeof (result as { message?: string }).message === 'string' &&
          (result as { data?: unknown }).data !== undefined
        ) {
          data = (result as { data: T }).data;
        } else if (
          result != null &&
          typeof result === 'object' &&
          'data' in result &&
          (result as { data?: unknown }).data !== undefined &&
          !('message' in result)
        ) {
          data = result as T;
        } else if (
          result != null &&
          typeof result === 'object' &&
          'message' in result
        ) {
          const { message: _m, ...rest } = result as { message: string } & Record<string, unknown>;
          data = rest as T;
        } else {
          data = result as T;
        }

        return {
          status: statusCode,
          message,
          data,
        };
      }),
    );
  }
}
