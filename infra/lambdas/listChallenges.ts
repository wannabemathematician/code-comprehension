import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ScanCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.CHALLENGES_TABLE_NAME!;
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
  rawPath: string;
}) => {
  if (!TABLE_NAME) {
    return { statusCode: 500, body: JSON.stringify({ error: 'CHALLENGES_TABLE_NAME not set' }) };
  }
  try {
    const result = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
    const items = (result.Items ?? []).map((item) => unmarshall(item));
    
    // Filter to only published challenges
    const publishedChallenges = items.filter((item: any) => item.status === 'published');
    
    // If user is authenticated, check completion status for each challenge
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    const challengesWithCompletion = await Promise.all(
      publishedChallenges.map(async (challenge: any) => {
        let completed = false;
        if (userId && PROGRESS_TABLE_NAME) {
          try {
            // Check if there's a completion record for this challenge
            // We use challengeId as questionId in the progress table
            const progressResult = await docClient.send(
              new QueryCommand({
                TableName: PROGRESS_TABLE_NAME,
                KeyConditionExpression: 'userId = :userId AND questionId = :challengeId',
                ExpressionAttributeValues: {
                  ':userId': userId,
                  ':challengeId': challenge.challengeId,
                },
                Limit: 1,
              })
            );
            completed = progressResult.Items && progressResult.Items.length > 0 && 
                       progressResult.Items[0].status === 'COMPLETED';
          } catch (err) {
            console.error('Error checking completion for challenge', challenge.challengeId, err);
            // Continue without completion status if check fails
          }
        }
        
        return {
          challengeId: challenge.challengeId,
          title: challenge.title,
          difficulty: challenge.difficulty,
          tags: challenge.tags,
          completed,
        };
      })
    );
    
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ challenges: challengesWithCompletion }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to list challenges' }),
    };
  }
};
