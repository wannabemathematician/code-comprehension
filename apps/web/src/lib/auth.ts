/**
 * Cognito Hosted UI auth: Authorization Code flow with PKCE.
 * Uses VITE_COGNITO_DOMAIN, VITE_COGNITO_CLIENT_ID, VITE_COGNITO_REDIRECT_URI,
 * and optionally VITE_COGNITO_LOGOUT_REDIRECT (default /).
 */

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'cc_access_token',
  ID_TOKEN: 'cc_id_token',
  REFRESH_TOKEN: 'cc_refresh_token',
  EXPIRES_AT: 'cc_expires_at',
  PKCE_VERIFIER: 'cc_pkce_verifier',
} as const;

function getConfig() {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN?.replace(/\/$/, '');
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_COGNITO_REDIRECT_URI;
  const logoutRedirect = import.meta.env.VITE_COGNITO_LOGOUT_REDIRECT ?? '/';
  if (!domain || !clientId || !redirectUri) {
    throw new Error(
      'Missing Cognito env: VITE_COGNITO_DOMAIN, VITE_COGNITO_CLIENT_ID, VITE_COGNITO_REDIRECT_URI'
    );
  }
  return { domain, clientId, redirectUri, logoutRedirect };
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(plain));
}

/** Generate PKCE code_verifier and code_challenge (S256). */
export async function generatePkce(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const codeVerifier = randomString(64);
  const codeChallenge = base64UrlEncode(await sha256(codeVerifier));
  return { codeVerifier, codeChallenge };
}

/** Redirect to Cognito Hosted UI to start login (Authorization Code + PKCE). */
export async function login(): Promise<void> {
  const { domain, clientId, redirectUri } = getConfig();
  const { codeVerifier, codeChallenge } = await generatePkce();
  sessionStorage.setItem(STORAGE_KEYS.PKCE_VERIFIER, codeVerifier);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  window.location.href = `${domain}/oauth2/authorize?${params.toString()}`;
}

/** Exchange authorization code for tokens. */
export async function exchangeCodeForTokens(code: string): Promise<void> {
  const { domain, clientId, redirectUri } = getConfig();
  const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.PKCE_VERIFIER);
  if (!codeVerifier) {
    throw new Error('Missing PKCE code_verifier; try starting login again.');
  }
  sessionStorage.removeItem(STORAGE_KEYS.PKCE_VERIFIER);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  const res = await fetch(`${domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    let errMsg = `Token exchange failed (${res.status})`;
    try {
      const json = JSON.parse(text) as { error?: string; error_description?: string };
      if (json.error_description) errMsg = json.error_description;
      else if (json.error) errMsg = json.error;
    } catch {
      if (text) errMsg = text.slice(0, 200);
    }
    throw new Error(errMsg);
  }

  const data = (await res.json()) as {
    access_token: string;
    id_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
  localStorage.setItem(STORAGE_KEYS.ID_TOKEN, data.id_token);
  if (data.refresh_token) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
  }
  const expiresAt = Date.now() + data.expires_in * 1000;
  localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, String(expiresAt));
}

/** Return current access token or null. */
export function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

/** True if we have a stored access token (optionally not expired). */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
  if (expiresAt && Number(expiresAt) < Date.now()) return false;
  return true;
}

/** Clear tokens and redirect to Cognito logout, then to logout redirect URI. */
export function logout(): void {
  const { domain, clientId, logoutRedirect } = getConfig();
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.ID_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
  sessionStorage.removeItem(STORAGE_KEYS.PKCE_VERIFIER);
  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: logoutRedirect,
  });
  window.location.href = `${domain}/logout?${params.toString()}`;
}

/** Optional: decode JWT payload (no verify, for display only). */
export function getIdTokenEmail(): string | null {
  const idToken = localStorage.getItem(STORAGE_KEYS.ID_TOKEN);
  if (!idToken) return null;
  try {
    const payload = JSON.parse(atob(idToken.split('.')[1] ?? ''));
    return (payload.email as string) ?? null;
  } catch {
    return null;
  }
}
