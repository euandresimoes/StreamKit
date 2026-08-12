import type { ApiError } from '@streamkit/contracts'
import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

import { ApiApplicationError } from './api-error'

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
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
      return {
        body: {
          error: {
            code: `HTTP_${exception.getStatus()}`,
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
          details: null,
          message: 'An unexpected error occurred',
          requestId,
        },
      },
      statusCode: 500,
    }
  }
}
