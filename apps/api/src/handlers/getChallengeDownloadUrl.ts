import { getChallenge, getTableName } from '../lib/dynamo.js';
import { getPresignedDownloadUrl, getBucketName } from '../lib/s3.js';
import { badRequest, notFound, ok, serverError } from '../lib/responses.js';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

const EXPIRES_IN_SECONDS = 60;

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
  const bucketName = getBucketName();
  if (!tableName || !bucketName) {
    return serverError('CHALLENGES_TABLE_NAME or CHALLENGES_BUCKET_NAME not set');
  }
  try {
    const item = await getChallenge(tableName, challengeId);
    if (!item) {
      return notFound('Challenge not found');
    }
    const key =
      typeof item.zipS3Key === 'string' && item.zipS3Key.trim() !== ''
        ? item.zipS3Key.trim()
        : `${challengeId}.zip`;
    console.log('key', key);
    const url = await getPresignedDownloadUrl(bucketName, key, EXPIRES_IN_SECONDS);
    return ok({ url, expiresInSeconds: EXPIRES_IN_SECONDS });
  } catch (err) {
    console.error('getChallengeDownloadUrl', err);
    return serverError('Failed to generate download URL');
  }
}
