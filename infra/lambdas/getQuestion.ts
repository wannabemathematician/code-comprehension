import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const PROGRESS_TABLE_NAME = process.env.USER_QUESTION_PROGRESS_TABLE_NAME!;

// Placeholder questions - TODO: Replace with actual data source
const questions: Record<string, any> = {
  q1: {
    questionId: 'q1',
    title: 'What is the bug in the `if __name__ == "__main__":` block?',
    difficulty: 'easy',
    tags: ['python', 'debugging'],
  },
  q2: {
    questionId: 'q2',
    title: 'If you run this file as-is with `python main.py`, what output will you see?',
    difficulty: 'easy',
    tags: ['python', 'execution'],
  },
  q3: {
    questionId: 'q3',
    title: 'What does `if __name__ == "__main__":` do in Python?',
    difficulty: 'easy',
    tags: ['python', 'concepts'],
  },
  q4: {
    questionId: 'q4',
    title: 'Pros/Cons: What are the pros and cons of wrapping `say_hello()` in an `if __name__ == "__main__":` guard?',
    difficulty: 'medium',
    tags: ['python', 'best-practices'],
  },
};

export const handler = async (event: any) => {
  if (!PROGRESS_TABLE_NAME) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'USER_QUESTION_PROGRESS_TABLE_NAME not set' } }),
    };
  }

  // Extract user from JWT claims (API Gateway HTTP API puts claims in requestContext.authorizer.jwt.claims)
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

  const question = questions[questionId];
  if (!question) {
    return {
      statusCode: 404,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Question not found' } }),
    };
  }

  try {
    // Get progress from DynamoDB
    const progressResult = await docClient.send(
      new GetCommand({
        TableName: PROGRESS_TABLE_NAME,
        Key: {
          userId,
          questionId,
        },
      })
    );

    const progress = progressResult.Item
      ? {
          status: progressResult.Item.status,
          updatedAt: progressResult.Item.updatedAt,
        }
      : {
          status: 'NOT_STARTED',
          updatedAt: null,
        };

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        ...question,
        progress,
      }),
    };
  } catch (err) {
    console.error('getQuestion', err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get question' } }),
    };
  }
};
