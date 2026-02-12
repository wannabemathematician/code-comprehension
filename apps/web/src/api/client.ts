import { getAccessToken } from '../lib/auth';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/$/, '') ?? '';

function getHeaders(): HeadersInit {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Thrown for 401 Unauthorized or 403 Forbidden. */
export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/** Thrown for other non-2xx responses (status + body snippet). */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function bodySnippet(body: unknown, maxLen = 200): string {
  if (body == null) return '';
  if (typeof body === 'string') return body.slice(0, maxLen);
  try {
    const s = JSON.stringify(body);
    return s.slice(0, maxLen);
  } catch {
    return String(body).slice(0, maxLen);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: getHeaders(),
  });

  let body: unknown;
  const ct = res.headers.get('content-type');
  if (ct?.includes('application/json')) {
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
  } else {
    body = await res.text();
  }

  if (import.meta.env.DEV) {
    console.debug('[api]', res.status, url);
  }

  if (!res.ok) {
    if (import.meta.env.DEV && body != null) {
      console.debug('[api] error body', bodySnippet(body));
    }
    const apiError =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : null;
    const msg =
      res.status === 401
        ? 'Unauthorized'
        : res.status === 403
          ? 'Forbidden'
          : apiError ?? res.statusText ?? `Request failed (${res.status})`;
    if (res.status === 401 || res.status === 403) {
      throw new AuthError(msg, res.status, body);
    }
    throw new ApiError(`${res.status}: ${msg}`, res.status, body);
  }

  return body as T;
}

// --- Response types (match apps/api) ---

export interface ListChallengeItem {
  challengeId: string;
  title?: string;
  difficulty?: string;
  tags?: string[];
}

export interface ListChallengesResponse {
  challenges: ListChallengeItem[];
}

export interface GetChallengeDownloadUrlResponse {
  url?: string;
  downloadUrl?: string;
  expiresInSeconds?: number;
}

// --- API functions ---

export function listChallenges(): Promise<ListChallengesResponse> {
  return request<ListChallengesResponse>('/challenges', { method: 'GET' });
}

export function getChallenge(id: string): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(`/challenges/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

export function getChallengeDownloadUrl(
  id: string
): Promise<GetChallengeDownloadUrlResponse> {
  return request<GetChallengeDownloadUrlResponse>(
    `/challenges/${encodeURIComponent(id)}/download`,
    { method: 'GET' }
  );
}

/** Fetch the challenge zip as binary from the API proxy (avoids S3 CORS). */
export async function getChallengeZipBlob(id: string): Promise<ArrayBuffer> {
  const url = `${BASE_URL}/challenges/${encodeURIComponent(id)}/zip`;
  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: 'application/zip,*/*' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) {
    const text = await res.text();
    let msg = `Download failed: ${res.status}`;
    try {
      const json = JSON.parse(text) as { error?: string; detail?: string };
      if (json.error) msg = json.detail ? `${json.error} — ${json.detail}` : json.error;
    } catch {
      if (text) msg = text.slice(0, 200);
    }
    if (res.status === 401 || res.status === 403) throw new AuthError(msg, res.status);
    throw new ApiError(msg, res.status);
  }
  return res.arrayBuffer();
}
