import type { APIGatewayProxyEventV2 } from 'aws-lambda';

export interface UserInfo {
  userId: string;
  username?: string;
  email?: string;
  claims: Record<string, unknown>;
}

/**
 * Extract user information from API Gateway JWT authorizer claims.
 * API Gateway HTTP API with JWT authorizer puts claims in requestContext.authorizer.jwt.claims
 */
export function getUserFromEvent(event: APIGatewayProxyEventV2): UserInfo | null {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (!claims || typeof claims !== 'object') {
    return null;
  }

  // 'sub' is the stable unique user identifier in Cognito
  const userId = claims.sub as string | undefined;
  if (!userId || typeof userId !== 'string') {
    return null;
  }

  return {
    userId,
    username: claims['cognito:username'] as string | undefined,
    email: claims.email as string | undefined,
    claims: claims as Record<string, unknown>,
  };
}

/**
 * Extract user info and return 401 if missing/invalid.
 */
export function requireAuth(event: APIGatewayProxyEventV2): UserInfo {
  const user = getUserFromEvent(event);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}
