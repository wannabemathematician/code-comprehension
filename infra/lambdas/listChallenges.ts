import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.CHALLENGES_TABLE_NAME!;

export const handler = async (event: { requestContext: { http: { method: string } }; rawPath: string }) => {
  if (!TABLE_NAME) {
    return { statusCode: 500, body: JSON.stringify({ error: 'CHALLENGES_TABLE_NAME not set' }) };
  }
  try {
    const result = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
    const items = (result.Items ?? []).map((item) => unmarshall(item));
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ challenges: items }),
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
