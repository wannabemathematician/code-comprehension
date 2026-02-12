import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const PROGRESS_TABLE_NAME = process.env.USER_QUESTION_PROGRESS_TABLE_NAME!;

const VALID_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const;
type ProgressStatus = typeof VALID_STATUSES[number];

export const handler = async (event: any) => {
  if (!PROGRESS_TABLE_NAME) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'USER_QUESTION_PROGRESS_TABLE_NAME not set' } }),
    };
  }

  // Extract user from JWT claims
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (!claims || !claims.sub) {
    return {
      statusCode: 401,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }),
    };
  }
  const userId = claims.sub as string;

  const questionId = event.pathParameters?.questionId;
  if (!questionId) {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'INVALID_INPUT', message: 'Missing or invalid question id' } }),
    };
  }

  let body: { status?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'INVALID_INPUT', message: 'Invalid request body' } }),
    };
  }

  if (!body.status || typeof body.status !== 'string') {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'INVALID_INPUT', message: 'Missing or invalid status in request body' } }),
    };
  }

  const status = body.status as ProgressStatus;
  if (!VALID_STATUSES.includes(status)) {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        error: { code: 'INVALID_INPUT', message: `Status must be one of: ${VALID_STATUSES.join(', ')}` },
      }),
    };
  }

  try {
    const updatedAt = Date.now();
    const userStatus = `${userId}#${status}`;

    const result = await docClient.send(
      new UpdateCommand({
        TableName: PROGRESS_TABLE_NAME,
        Key: {
          userId,
          questionId,
        },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, userStatus = :userStatus',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':updatedAt': updatedAt,
          ':userStatus': userStatus,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    if (!result.Attributes) {
      return {
        statusCode: 500,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update progress' } }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        userId: result.Attributes.userId,
        questionId: result.Attributes.questionId,
        status: result.Attributes.status,
        updatedAt: result.Attributes.updatedAt,
      }),
    };
  } catch (err) {
    console.error('updateProgress', err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update progress' } }),
    };
  }
};
