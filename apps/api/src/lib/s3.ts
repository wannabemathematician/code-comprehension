import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const client = new S3Client({});

export function getBucketName(): string | undefined {
  return process.env.CHALLENGES_BUCKET_NAME;
}

/**
 * Returns a presigned GET URL for the object at the given key.
 * @param bucket - S3 bucket name
 * @param key - Object key (e.g. `${challengeId}.zip`)
 * @param expiresInSeconds - URL validity in seconds
 */
export async function getPresignedDownloadUrl(
  bucket: string,
  key: string,
  expiresInSeconds: number
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
