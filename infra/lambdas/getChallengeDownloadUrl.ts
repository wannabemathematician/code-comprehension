import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const dynamo = new DynamoDBClient({});
const s3 = new S3Client({});
const TABLE_NAME = process.env.CHALLENGES_TABLE_NAME!;
const BUCKET_NAME = process.env.CHALLENGES_BUCKET_NAME!;

/** Presigned URL expiry in seconds (e.g. 5 min for download). */
const URL_EXPIRY_SECONDS = 300;

export const handler = async (
  event: { pathParameters?: { id?: string }; requestContext?: { http: { method: string } }; rawPath?: string }
) => {
  if (!TABLE_NAME || !BUCKET_NAME) {
    return { statusCode: 500, body: JSON.stringify({ error: 'CHALLENGES_TABLE_NAME or CHALLENGES_BUCKET_NAME not set' }) };
  }
  const id = event.pathParameters?.id;
  if (!id) {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Missing challenge id' }),
    };
  }
  try {
    const itemResult = await dynamo.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { challengeId: { S: id } },
      })
    );
    if (!itemResult.Item) {
      return {
        statusCode: 404,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Challenge not found' }),
      };
    }
    const item = unmarshall(itemResult.Item) as { zipS3Key?: string };
    const s3Key =
      typeof item.zipS3Key === 'string' && item.zipS3Key.trim() !== ''
        ? item.zipS3Key.trim()
        : `${id}.zip`;
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key });
    const url = await getSignedUrl(s3, command, { expiresIn: URL_EXPIRY_SECONDS });
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, expiresInSeconds: URL_EXPIRY_SECONDS }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to generate download URL' }),
    };
  }
};
