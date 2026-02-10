import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  type GetCommandOutput,
  type ScanCommandOutput,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client);

export function getTableName(): string | undefined {
  return process.env.CHALLENGES_TABLE_NAME;
}

/** Challenge item as stored in DynamoDB (minimal shape used by handlers). */
export interface ChallengeItem {
  challengeId: string;
  title?: string;
  difficulty?: string;
  tags?: string[];
  status?: string;
  [key: string]: unknown;
}

export async function getChallenge(tableName: string, challengeId: string): Promise<ChallengeItem | null> {
  const out: GetCommandOutput = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { challengeId },
    })
  );
  return (out.Item as ChallengeItem | undefined) ?? null;
}

/**
 * List challenges with status = "published".
 * MVP: uses Scan + FilterExpression; no GSI on status yet. For production, add a GSI
 * (e.g. status as partition key or status-challengeId) and use Query instead.
 */
export async function listPublishedChallenges(tableName: string): Promise<ChallengeItem[]> {
  const out: ScanCommandOutput = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: '#s = :status',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': 'published' },
    })
  );
  return (out.Items ?? []) as ChallengeItem[];
}
