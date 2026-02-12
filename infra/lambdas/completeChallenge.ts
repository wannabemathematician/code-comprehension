import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const PROGRESS_TABLE_NAME = process.env.USER_QUESTION_PROGRESS_TABLE_NAME!;

export const handler = async (event: {
  requestContext?: {
    authorizer?: {
      jwt?: {
        claims?: {
          sub?: string;
        };
      };
    };
  };
  pathParameters?: {
    challengeId?: string;
  };
}) => {
  if (!PROGRESS_TABLE_NAME) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'USER_QUESTION_PROGRESS_TABLE_NAME not set' } }),
    };
  }

  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!userId) {
    return {
      statusCode: 401,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }),
    };
  }

  const challengeId = event.pathParameters?.challengeId;
  if (!challengeId) {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'INVALID_INPUT', message: 'Missing challenge id' } }),
    };
  }

  try {
    const updatedAt = Date.now();
    const userStatus = `${userId}#COMPLETED`;

    // Use challengeId as the questionId in the progress table
    const result = await docClient.send(
      new UpdateCommand({
        TableName: PROGRESS_TABLE_NAME,
        Key: {
          userId,
          questionId: challengeId, // Using challengeId as questionId for challenge completion
        },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, userStatus = :userStatus',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'COMPLETED',
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
        body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to mark challenge as completed' } }),
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
        challengeId: result.Attributes.questionId,
        status: result.Attributes.status,
        updatedAt: result.Attributes.updatedAt,
      }),
    };
  } catch (err) {
    console.error('completeChallenge', err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to mark challenge as completed' } }),
    };
  }
};
