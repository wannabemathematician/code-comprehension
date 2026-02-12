import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const dynamo = new DynamoDBClient({});
const s3 = new S3Client({});
const TABLE_NAME = process.env.CHALLENGES_TABLE_NAME!;
const BUCKET_NAME = process.env.CHALLENGES_BUCKET_NAME!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export const handler = async (
  event: { pathParameters?: { id?: string }; requestContext?: { http: { method: string } }; rawPath?: string }
) => {
  if (!TABLE_NAME || !BUCKET_NAME) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ error: 'CHALLENGES_TABLE_NAME or CHALLENGES_BUCKET_NAME not set' }),
    };
  }
  const id = event.pathParameters?.id;
  if (!id) {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ error: 'Missing challenge id' }),
    };
  }
  let s3Key = `${id}.zip`;
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
        headers: { 'content-type': 'application/json', ...CORS_HEADERS },
        body: JSON.stringify({ error: 'Challenge not found' }),
      };
    }
    const item = unmarshall(itemResult.Item) as Record<string, unknown>;
    const zipKeyAttr = Object.keys(item).find((k) => k.toLowerCase() === 'zips3key');
    const zipKeyCandidate =
      (zipKeyAttr && item[zipKeyAttr]) ??
      item.zipS3Key ??
      item.ZipS3Key ??
      item.zip_s3_key;
    s3Key =
      typeof zipKeyCandidate === 'string' && zipKeyCandidate.trim() !== ''
        ? zipKeyCandidate.trim()
        : `${id}.zip`;

    console.log('getChallengeZip', { bucket: BUCKET_NAME, key: s3Key, challengeId: id });

    const getResult = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key })
    );
    if (!getResult.Body) {
      return {
        statusCode: 404,
        headers: { 'content-type': 'application/json', ...CORS_HEADERS },
        body: JSON.stringify({ error: 'Zip file not found in storage' }),
      };
    }
    const bytes = await getResult.Body.transformToByteArray();
    const base64 = Buffer.from(bytes).toString('base64');
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${s3Key}"`,
        ...CORS_HEADERS,
      },
      body: base64,
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('getChallengeZip', err);
    const errName = err instanceof Error ? err.name : '';
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errName === 'NoSuchKey' || errMsg.includes('NoSuchKey')) {
      return {
        statusCode: 404,
        headers: { 'content-type': 'application/json', ...CORS_HEADERS },
        body: JSON.stringify({
          error: 'Zip file not found in storage.',
          detail: `Bucket: ${BUCKET_NAME}, Key: ${s3Key}. Ensure the object exists and the challenge item has zipS3Key set (e.g. "v1.zip").`,
        }),
      };
    }
    const safeMsg = errMsg.slice(0, 200);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({
        error: 'Failed to get challenge zip',
        detail: safeMsg,
      }),
    };
  }
};
