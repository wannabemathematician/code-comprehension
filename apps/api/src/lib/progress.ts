import { DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand, type QueryCommandOutput } from '@aws-sdk/lib-dynamodb';
import { docClient } from './dynamo.js';

export type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface ProgressItem {
  userId: string;
  questionId: string;
  status: ProgressStatus;
  updatedAt: number;
  userStatus: string; // `${userId}#${status}`
}

export interface ProgressListResult {
  items: ProgressItem[];
  nextCursor: string | null;
}

function getProgressTableName(): string | undefined {
  return process.env.USER_QUESTION_PROGRESS_TABLE_NAME;
}

function getGsiName(): string {
  return 'GSI1_UserStatus_UpdatedAt';
}

/**
 * Get a user's progress for a specific question.
 */
export async function getProgress(userId: string, questionId: string): Promise<ProgressItem | null> {
  const tableName = getProgressTableName();
  if (!tableName) {
    throw new Error('USER_QUESTION_PROGRESS_TABLE_NAME not set');
  }

  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        userId,
        questionId,
      },
    })
  );

  return (result.Item as ProgressItem | undefined) ?? null;
}

/**
 * Update or create progress for a user's question.
 */
export async function updateProgress(
  userId: string,
  questionId: string,
  status: ProgressStatus
): Promise<ProgressItem> {
  const tableName = getProgressTableName();
  if (!tableName) {
    throw new Error('USER_QUESTION_PROGRESS_TABLE_NAME not set');
  }

  const updatedAt = Date.now();
  const userStatus = `${userId}#${status}`;

  const result = await docClient.send(
    new UpdateCommand({
      TableName: tableName,
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
    throw new Error('Failed to update progress');
  }

  return result.Attributes as ProgressItem;
}

/**
 * List progress items for a user, optionally filtered by status.
 */
export async function listProgress(
  userId: string,
  options: {
    status?: ProgressStatus;
    limit?: number;
    cursor?: string;
    sort?: 'asc' | 'desc';
  }
): Promise<ProgressListResult> {
  const tableName = getProgressTableName();
  if (!tableName) {
    throw new Error('USER_QUESTION_PROGRESS_TABLE_NAME not set');
  }

  const limit = Math.min(Math.max(1, options.limit ?? 25), 100);
  const sort = options.sort ?? 'desc';

  // NOT_STARTED means no item exists - return empty list
  if (options.status === 'NOT_STARTED') {
    return { items: [], nextCursor: null };
  }

  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (options.cursor) {
    try {
      exclusiveStartKey = JSON.parse(Buffer.from(options.cursor, 'base64').toString('utf-8'));
    } catch {
      throw new Error('Invalid cursor');
    }
  }

  // If status is COMPLETED or IN_PROGRESS, use GSI
  if (options.status === 'COMPLETED' || options.status === 'IN_PROGRESS') {
    const userStatus = `${userId}#${options.status}`;
    const scanIndexForward = sort === 'asc';

    const result: QueryCommandOutput = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: getGsiName(),
        KeyConditionExpression: 'userStatus = :userStatus',
        ExpressionAttributeValues: {
          ':userStatus': userStatus,
        },
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
        ScanIndexForward: scanIndexForward,
      })
    );

    const items = (result.Items ?? []) as ProgressItem[];
    const nextCursor = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null;

    return { items, nextCursor };
  }

  // No status filter: query base table by userId
  const result: QueryCommandOutput = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
      ScanIndexForward: true, // Order by questionId ascending
    })
  );

  const items = (result.Items ?? []) as ProgressItem[];
  const nextCursor = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : null;

  return { items, nextCursor };
}
