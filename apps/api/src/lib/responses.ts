import type { APIGatewayProxyResultV2 } from 'aws-lambda';

/** CORS + JSON headers for API Gateway HTTP API responses. */
export const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

export function badRequest(message: string): APIGatewayProxyResultV2 {
  return response(400, { error: message });
}

export function notFound(message: string = 'Not found'): APIGatewayProxyResultV2 {
  return response(404, { error: message });
}

export function serverError(message: string = 'Internal server error'): APIGatewayProxyResultV2 {
  return response(500, { error: message });
}
