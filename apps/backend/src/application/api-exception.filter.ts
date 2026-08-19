import { type ApiError, ErrorCodeSchema } from '@streamlet/contracts'
import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

import { ApiApplicationError } from './api-error'

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  public constructor(private readonly exposeInternalErrors = false) {}

  public catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp()
    const request = context.getRequest<FastifyRequest>()
    const reply = context.getResponse<FastifyReply>()
    const requestId = request.id

    const response = this.toErrorResponse(exception, requestId)
    void reply.status(response.statusCode).send(response.body)
  }

  private toErrorResponse(
    exception: unknown,
    requestId: string,
  ): { body: ApiError; statusCode: number } {
    if (exception instanceof ApiApplicationError) {
      return {
        body: {
          error: {
            code: exception.code,
            details: exception.details,
            message: exception.message,
            requestId,
          },
        },
        statusCode: exception.statusCode,
      }
    }

    if (exception instanceof ZodError) {
      return {
        body: {
          error: {
            code: 'VALIDATION_FAILED',
            details: exception.issues,
            message: 'Request validation failed',
            requestId,
          },
        },
        statusCode: 400,
      }
    }

    if (exception instanceof HttpException) {
      const parsedCode = ErrorCodeSchema.safeParse(`HTTP_${exception.getStatus()}`)
      return {
        body: {
          error: {
            code: parsedCode.success ? parsedCode.data : 'HTTP_500',
            details: null,
            message: exception.message,
            requestId,
          },
        },
        statusCode: exception.getStatus(),
      }
    }

    return {
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          details: this.exposeInternalErrors ? this.internalErrorDetails(exception) : null,
          message:
            this.exposeInternalErrors && exception instanceof Error
              ? exception.message
              : 'An unexpected error occurred',
          requestId,
        },
      },
      statusCode: 500,
    }
  }

  private internalErrorDetails(exception: unknown): unknown {
    if (!(exception instanceof Error)) return { thrown: String(exception) }
    return {
      cause: exception.cause instanceof Error ? exception.cause.message : exception.cause,
      name: exception.name,
      stack: exception.stack,
    }
  }
}
