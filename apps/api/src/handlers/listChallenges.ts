import { listPublishedChallenges, getTableName } from '../lib/dynamo.js';
import { ok, serverError } from '../lib/responses.js';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

/** List item: only published challenges, subset of fields. */
export interface ListChallengeItem {
  challengeId: string;
  title?: string;
  difficulty?: string;
  tags?: string[];
}

export async function handler(
  _event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const tableName = getTableName();
  if (!tableName) {
    return serverError('CHALLENGES_TABLE_NAME not set');
  }
  try {
    const items = await listPublishedChallenges(tableName);
    const list: ListChallengeItem[] = items.map((item) => ({
      challengeId: item.challengeId,
      title: item.title,
      difficulty: item.difficulty,
      tags: item.tags,
    }));
    return ok({ challenges: list });
  } catch (err) {
    console.error('listChallenges', err);
    return serverError('Failed to list challenges');
  }
}
