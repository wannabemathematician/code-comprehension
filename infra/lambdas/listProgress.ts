import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const PROGRESS_TABLE_NAME = process.env.USER_QUESTION_PROGRESS_TABLE_NAME!;
const GSI_NAME = 'GSI1_UserStatus_UpdatedAt';

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

  const queryParams = event.queryStringParameters || {};
  const status = queryParams.status as ProgressStatus | undefined;
  const limit = queryParams.limit ? Math.min(Math.max(1, parseInt(queryParams.limit, 10)), 100) : 25;
  const cursor = queryParams.cursor;
  const sort = queryParams.sort === 'asc' ? 'asc' : 'desc';

  // Validate limit
  if (limit < 1 || limit > 100) {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'INVALID_INPUT', message: 'Limit must be between 1 and 100' } }),
    };
  }

  // Validate status if provided
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        error: { code: 'INVALID_INPUT', message: `Status must be one of: ${VALID_STATUSES.join(', ')}` },
      }),
    };
  }

  // NOT_STARTED means no item exists - return empty list
  if (status === 'NOT_STARTED') {
    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ items: [], nextCursor: null }),
    };
  }

  let exclusiveStartKey: Record<string, any> | undefined;
  if (cursor) {
    try {
      exclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    } catch {
      return {
        statusCode: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: { code: 'INVALID_INPUT', message: 'Invalid cursor' } }),
      };
    }
  }

  try {
    let result: any;

    // If status is COMPLETED or IN_PROGRESS, use GSI
    if (status === 'COMPLETED' || status === 'IN_PROGRESS') {
      const userStatus = `${userId}#${status}`;
      const scanIndexForward = sort === 'asc';

      result = await docClient.send(
        new QueryCommand({
          TableName: PROGRESS_TABLE_NAME,
          IndexName: GSI_NAME,
          KeyConditionExpression: 'userStatus = :userStatus',
          ExpressionAttributeValues: {
            ':userStatus': userStatus,
          },
          Limit: limit,
          ExclusiveStartKey: exclusiveStartKey,
          ScanIndexForward: scanIndexForward,
        })
      );
    } else {
      // No status filter: query base table by userId
      result = await docClient.send(
        new QueryCommand({
          TableName: PROGRESS_TABLE_NAME,
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId,
          },
          Limit: limit,
          ExclusiveStartKey: exclusiveStartKey,
          ScanIndexForward: true, // Order by questionId ascending
        })
      );
    }

    const items = result.Items || [];
    const nextCursor = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null;

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        items,
        nextCursor,
      }),
    };
  } catch (err) {
    console.error('listProgress', err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list progress' } }),
    };
  }
};
