import { requireAuth } from '../lib/auth.js';
import { listProgress, type ProgressStatus } from '../lib/progress.js';
import { badRequest, ok, serverError, unauthorized } from '../lib/responses.js';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

const VALID_STATUSES: ProgressStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

function parseQueryParams(event: APIGatewayProxyEventV2): {
  status?: ProgressStatus;
  limit?: number;
  cursor?: string;
  sort?: 'asc' | 'desc';
} {
  const params = event.queryStringParameters ?? {};
  const result: {
    status?: ProgressStatus;
    limit?: number;
    cursor?: string;
    sort?: 'asc' | 'desc';
  } = {};

  if (params.status) {
    if (VALID_STATUSES.includes(params.status as ProgressStatus)) {
      result.status = params.status as ProgressStatus;
    }
  }

  if (params.limit) {
    const limit = parseInt(params.limit, 10);
    if (!isNaN(limit) && limit > 0) {
      result.limit = limit;
    }
  }

  if (params.cursor) {
    result.cursor = params.cursor;
  }

  if (params.sort === 'asc' || params.sort === 'desc') {
    result.sort = params.sort;
  }

  return result;
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const user = requireAuth(event);
    const options = parseQueryParams(event);

    // Validate limit bounds
    if (options.limit !== undefined && (options.limit < 1 || options.limit > 100)) {
      return badRequest('INVALID_INPUT', 'Limit must be between 1 and 100');
    }

    // Validate status if provided
    if (options.status !== undefined && !VALID_STATUSES.includes(options.status)) {
      return badRequest(
        'INVALID_INPUT',
        `Status must be one of: ${VALID_STATUSES.join(', ')}`
      );
    }

    const result = await listProgress(user.userId, options);

    return ok({
      items: result.items,
      nextCursor: result.nextCursor,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return unauthorized('Authentication required');
    }
    if (err instanceof Error && err.message === 'Invalid cursor') {
      return badRequest('INVALID_INPUT', 'Invalid cursor');
    }
    console.error('listProgress', err);
    return serverError('Failed to list progress');
  }
}
