import { requireAuth } from '../lib/auth.js';
import { updateProgress, type ProgressStatus } from '../lib/progress.js';
import { badRequest, ok, serverError, unauthorized } from '../lib/responses.js';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

const VALID_STATUSES: ProgressStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

function parseQuestionId(event: APIGatewayProxyEventV2): string | null {
  const id = event.pathParameters?.questionId;
  if (id == null || id === '') return null;
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseBody(event: APIGatewayProxyEventV2): { status?: string } | null {
  if (!event.body) return null;
  try {
    return JSON.parse(event.body);
  } catch {
    return null;
  }
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const user = requireAuth(event);
    const questionId = parseQuestionId(event);
    if (questionId === null) {
      return badRequest('INVALID_INPUT', 'Missing or invalid question id');
    }

    const body = parseBody(event);
    if (!body || typeof body.status !== 'string') {
      return badRequest('INVALID_INPUT', 'Missing or invalid status in request body');
    }

    const status = body.status as ProgressStatus;
    if (!VALID_STATUSES.includes(status)) {
      return badRequest(
        'INVALID_INPUT',
        `Status must be one of: ${VALID_STATUSES.join(', ')}`
      );
    }

    const progress = await updateProgress(user.userId, questionId, status);

    return ok({
      userId: progress.userId,
      questionId: progress.questionId,
      status: progress.status,
      updatedAt: progress.updatedAt,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return unauthorized('Authentication required');
    }
    console.error('updateProgress', err);
    return serverError('Failed to update progress');
  }
}
