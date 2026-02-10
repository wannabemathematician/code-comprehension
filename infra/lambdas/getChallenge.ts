import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.CHALLENGES_TABLE_NAME!;

export const handler = async (
  event: { pathParameters?: { id?: string }; requestContext?: { http: { method: string } }; rawPath?: string }
) => {
  if (!TABLE_NAME) {
    return { statusCode: 500, body: JSON.stringify({ error: 'CHALLENGES_TABLE_NAME not set' }) };
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
    const result = await client.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { challengeId: { S: id } },
      })
    );
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Challenge not found' }),
      };
    }
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(unmarshall(result.Item)),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to get challenge' }),
    };
  }
};
