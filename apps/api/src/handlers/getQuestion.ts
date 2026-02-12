import { requireAuth } from '../lib/auth.js';
import { getQuestion } from '../lib/questions.js';
import { getProgress } from '../lib/progress.js';
import { badRequest, notFound, ok, serverError, unauthorized } from '../lib/responses.js';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

function parseQuestionId(event: APIGatewayProxyEventV2): string | null {
  const id = event.pathParameters?.questionId;
  if (id == null || id === '') return null;
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const user = requireAuth(event);
    const questionId = parseQuestionId(event);
    if (questionId === null) {
      return badRequest('INVALID_INPUT', 'Missing or invalid question id');
    }

    const question = await getQuestion(questionId);
    if (!question) {
      return notFound('Question not found');
    }

    const progress = await getProgress(user.userId, questionId);
    const progressData = progress
      ? {
          status: progress.status,
          updatedAt: progress.updatedAt,
        }
      : {
          status: 'NOT_STARTED' as const,
          updatedAt: null,
        };

    return ok({
      ...question,
      progress: progressData,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return unauthorized('Authentication required');
    }
    console.error('getQuestion', err);
    return serverError('Failed to get question');
  }
}
