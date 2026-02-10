import { getChallenge, getTableName } from '../lib/dynamo.js';
import { badRequest, notFound, ok, serverError } from '../lib/responses.js';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

function parseChallengeId(event: APIGatewayProxyEventV2): string | null {
  const id = event.pathParameters?.id;
  if (id == null || id === '') return null;
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const challengeId = parseChallengeId(event);
  if (challengeId === null) {
    return badRequest('Missing or invalid challenge id');
  }
  const tableName = getTableName();
  if (!tableName) {
    return serverError('CHALLENGES_TABLE_NAME not set');
  }
  try {
    const item = await getChallenge(tableName, challengeId);
    if (!item) {
      return notFound('Challenge not found');
    }
    return ok(item);
  } catch (err) {
    console.error('getChallenge', err);
    return serverError('Failed to get challenge');
  }
}
