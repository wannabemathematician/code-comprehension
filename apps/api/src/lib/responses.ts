import type { APIGatewayProxyResultV2 } from 'aws-lambda';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/** CORS + JSON headers for API Gateway HTTP API responses. */
export const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
} as const;

function body(obj: object): string {
  return JSON.stringify(obj);
}

function response(statusCode: number, data: object): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { ...jsonHeaders },
    body: body(data),
  };
}

export function ok<T>(data: T): APIGatewayProxyResultV2 {
  return response(200, data as object);
}

export function badRequest(code: string, message: string): APIGatewayProxyResultV2 {
  return response(400, { error: { code, message } } as ErrorResponse);
}

export function unauthorized(message: string = 'Unauthorized'): APIGatewayProxyResultV2 {
  return response(401, { error: { code: 'UNAUTHORIZED', message } } as ErrorResponse);
}

export function notFound(message: string = 'Not found'): APIGatewayProxyResultV2 {
  return response(404, { error: { code: 'NOT_FOUND', message } } as ErrorResponse);
}

export function serverError(message: string = 'Internal server error'): APIGatewayProxyResultV2 {
  return response(500, { error: { code: 'INTERNAL_ERROR', message } } as ErrorResponse);
}
