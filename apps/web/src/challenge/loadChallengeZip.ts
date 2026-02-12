import { unzipSync } from 'fflate';
import { getChallenge, getChallengeZipBlob } from '../api/client';
import type { VirtualDirectory, VirtualFile } from '../mocks/virtualRepo';
import type { ComprehensionQuiz } from '../types/comprehension';

const CACHE_VERSION = 8;
const CACHE_PREFIX = `cc_challenge_v${CACHE_VERSION}_`;
const BINARY_NULL_THRESHOLD = 0.1; // treat as binary if >10% null bytes

export type LoadProgress = 'loading' | 'downloading' | 'unzipping' | 'done';

export type HydratedChallenge = {
  metadata: Record<string, unknown>;
  root: VirtualDirectory;
  /** Parsed slack.json from the zip, if present. When set, the Slack panel is shown and slack.json is hidden from the tree. */
  slack?: unknown;
  /** Parsed comprehension.json from the zip, if present. When set, the comprehension quiz is shown and comprehension.json is hidden from the tree. */
  comprehension?: ComprehensionQuiz;
};

type CachedFile = { path: string; content: string; binary?: boolean };

function getCacheKey(challengeId: string): string {
  return `${CACHE_PREFIX}${challengeId}`;
}

function getCachedFiles(challengeId: string): CachedFile[] | null {
  try {
    const raw = sessionStorage.getItem(getCacheKey(challengeId));
    if (!raw) return null;
    return JSON.parse(raw) as CachedFile[];
  } catch {
    return null;
  }
}

function setCachedFiles(challengeId: string, files: CachedFile[]): void {
  try {
    sessionStorage.setItem(getCacheKey(challengeId), JSON.stringify(files));
  } catch {
    // quota or disabled; ignore
  }
}

const EXT_TO_LANG: Record<string, VirtualFile['language']> = {
  tsx: 'tsx',
  ts: 'ts',
  js: 'js',
  jsx: 'js',
  json: 'json',
  py: 'py',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  html: 'html',
  htm: 'html',
  md: 'text',
  txt: 'text',
};

function pathToLanguage(path: string): VirtualFile['language'] {
  const ext = path.replace(/^.*\./, '').toLowerCase();
  return EXT_TO_LANG[ext] ?? 'text';
}

function isBinary(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;
  let nullCount = 0;
  const sample = Math.min(bytes.length, 8192);
  for (let i = 0; i < sample; i++) {
    if (bytes[i] === 0) nullCount++;
  }
  if (nullCount / sample > BINARY_NULL_THRESHOLD) return true;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return false;
  } catch {
    return true;
  }
}

function bytesToFile(path: string, bytes: Uint8Array): CachedFile {
  if (isBinary(bytes)) {
    return { path, content: 'Binary file not displayed.', binary: true };
  }
  const content = new TextDecoder('utf-8').decode(bytes);
  return { path, content };
}

/** ZIP files start with PK (0x50 0x4B). */
function isZipBuffer(buffer: ArrayBuffer): boolean {
  const u8 = new Uint8Array(buffer);
  return u8.length >= 2 && u8[0] === 0x50 && u8[1] === 0x4b;
}

/** Decode base64 string to ArrayBuffer (used when API returns base64-encoded zip). */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** If the response is not a zip, try treating it as base64-encoded zip (API Gateway may not decode). */
function ensureZipBuffer(arrayBuffer: ArrayBuffer): ArrayBuffer {
  if (isZipBuffer(arrayBuffer)) return arrayBuffer;
  try {
    const asText = new TextDecoder('utf-8').decode(arrayBuffer);
    const decoded = base64ToArrayBuffer(asText);
    if (isZipBuffer(decoded)) return decoded;
  } catch {
    // not valid base64 or still not a zip
  }
  return arrayBuffer;
}

function unzipToFiles(zipArrayBuffer: ArrayBuffer): CachedFile[] {
  if (!isZipBuffer(zipArrayBuffer)) {
    const u8 = new Uint8Array(zipArrayBuffer);
    const preview = new TextDecoder('utf-8', { fatal: false }).decode(u8.slice(0, 200));
    if (preview.trimStart().startsWith('<')) {
      throw new Error(
        'The server returned an error page instead of the zip file. The challenge archive may not exist in storage (upload it as challengeId.zip).'
      );
    }
    throw new Error(
      'Downloaded file is not a valid zip. The challenge archive may be missing or corrupted.'
    );
  }
  const u8 = new Uint8Array(zipArrayBuffer);
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(u8);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid zip data: ${msg}. The challenge archive may be corrupted.`);
  }
  const files: CachedFile[] = [];
  const byPath = new Map<string, CachedFile>();
  for (const [rawPath, data] of Object.entries(entries)) {
 
    if (!(data instanceof Uint8Array)) continue;
    const path = rawPath
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/$/, '');
    if (!path || path.endsWith('/')) continue; // directory entry
    const file = bytesToFile(path, data);
    const existing = byPath.get(path);
    if (!existing || file.content.length > existing.content.length) {
      byPath.set(path, file);
    }
  }
  return [...byPath.values()];
}

/**
 * If all paths share a single top-level segment (e.g. "v1"), return it so we can use it as root and avoid duplication.
 */
function getCommonTopLevelSegment(files: CachedFile[]): string | null {
  const firstSegments = new Set<string>();
  for (const f of files) {
    const path = f.path.replace(/^\/+/, '');
    const segs = path.split('/').filter(Boolean);
    if (segs.length > 0) firstSegments.add(segs[0]);
  }
  return firstSegments.size === 1 ? [...firstSegments][0]! : null;
}

function buildVirtualRoot(files: CachedFile[]): VirtualDirectory {
  const stripPrefix = getCommonTopLevelSegment(files);
  const rootName = stripPrefix ?? 'repo';
  const root: VirtualDirectory = {
    type: 'dir',
    name: rootName,
    path: '/',
    children: [],
  };

  const dirs = new Map<string, VirtualDirectory>();
  dirs.set('/', root);

  const normalizedPaths = files.map((f) => {
    let p = f.path.replace(/^\/+/, '');
    if (stripPrefix && p.startsWith(stripPrefix + '/')) p = p.slice(stripPrefix.length + 1);
    return p;
  });

  for (const f of files) {
    let path = f.path.replace(/^\/+/, '');
    if (stripPrefix && path.startsWith(stripPrefix + '/')) {
      path = path.slice(stripPrefix.length + 1);
    }
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) continue;

    if (stripPrefix && path === stripPrefix) continue;

    const isPrefixOfAnother = normalizedPaths.some(
      (other) => other !== path && (other === path + '/' || other.startsWith(path + '/'))
    );
    if (isPrefixOfAnother) continue;

    const fileName = segments[segments.length - 1];
    const parentSegments = segments.slice(0, -1);

    let parent = root;
    let acc = '';
    for (let i = 0; i < parentSegments.length; i++) {
      acc += (acc ? '/' : '') + parentSegments[i];
      const dirPath = '/' + acc;
      let dir = dirs.get(dirPath);
      if (!dir) {
        dir = {
          type: 'dir',
          name: parentSegments[i],
          path: dirPath,
          children: [],
        };
        parent.children.push(dir);
        dirs.set(dirPath, dir);
      }
      parent = dir;
    }

    const filePath = '/' + (stripPrefix ? stripPrefix + '/' + path : path);
    const lang = pathToLanguage(path);
    const file: VirtualFile = {
      type: 'file',
      name: fileName,
      path: filePath,
      language: lang,
      contents: f.content ?? '',
    };
    parent.children.push(file);
  }

  return root;
}

export type LoadChallengeOptions = {
  onProgress?: (phase: LoadProgress) => void;
};

/**
 * Load challenge metadata and hydrated virtual filesystem from API + zip.
 * Uses sessionStorage cache keyed by challengeId; if cached, skips download/unzip.
 */
export async function loadChallengeZip(
  challengeId: string,
  options: LoadChallengeOptions = {}
): Promise<HydratedChallenge> {
  const { onProgress } = options;

  onProgress?.('loading');
  const metadata = await getChallenge(challengeId);

  const cached = getCachedFiles(challengeId);
  let files: CachedFile[];
  if (cached && cached.length > 0) {
    onProgress?.('done');
    files = cached;
  } else {
    onProgress?.('downloading');
    let arrayBuffer = await getChallengeZipBlob(challengeId);
    arrayBuffer = ensureZipBuffer(arrayBuffer);
    onProgress?.('unzipping');
    try {
      files = unzipToFiles(arrayBuffer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const u8 = new Uint8Array(arrayBuffer);
      const preview =
        u8.length > 0
          ? Array.from(u8.slice(0, 4))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join(' ')
          : 'empty';
      throw new Error(
        `${msg} (${arrayBuffer.byteLength} bytes, first bytes: ${preview})`
      );
    }
    setCachedFiles(challengeId, files);
    onProgress?.('done');
  }

  const slackFile = files.find((f) => f.path.toLowerCase().endsWith('slack.json'));
  let slack: unknown;
  if (slackFile?.content) {
    try {
      slack = JSON.parse(slackFile.content);
    } catch {
      // ignore invalid JSON
    }
  }

  const comprehensionFile = files.find((f) => f.path.toLowerCase().endsWith('comprehension.json'));
  let comprehension: ComprehensionQuiz | undefined;
  if (comprehensionFile?.content) {
    try {
      const parsed = JSON.parse(comprehensionFile.content) as unknown;
      if (
        parsed &&
        typeof parsed === 'object' &&
        'title' in parsed &&
        typeof (parsed as { title: unknown }).title === 'string' &&
        'questions' in parsed &&
        Array.isArray((parsed as { questions: unknown }).questions) &&
        (parsed as { questions: unknown[] }).questions.length > 0
      ) {
        comprehension = parsed as ComprehensionQuiz;
        if (comprehension.shuffleQuestions) {
          comprehension = {
            ...comprehension,
            questions: [...comprehension.questions].sort(() => Math.random() - 0.5),
          };
        }
        const filteredQuestions = comprehension.questions
          .filter((q: unknown) => {
            // Filter out invalid questions
            if (!q || typeof q !== 'object' || !('type' in q)) {
              console.debug('[comprehension] Filtered out: not an object or missing type', q);
              return false;
            }
            const question = q as Record<string, unknown>;
            if (question.type === 'multipleChoice') {
              const isValid = Array.isArray(question.choices) && question.choices.length > 0;
              if (!isValid) {
                console.debug('[comprehension] Filtered out multipleChoice: invalid choices', question);
              }
              return isValid;
            }
            if (question.type === 'proConSort') {
              const hasStatements = Array.isArray(question.statements) && question.statements.length > 0;
              const hasPlacements = question.correctPlacements && typeof question.correctPlacements === 'object';
              const isValid = hasStatements && hasPlacements;
              if (!isValid) {
                console.warn('[comprehension] Filtered out proConSort: invalid structure', {
                  id: question.id,
                  hasStatements,
                  hasPlacements,
                  hasChoices: 'choices' in question,
                  question,
                });
              }
              return isValid;
            }
            console.debug('[comprehension] Filtered out: unknown type', question.type);
            return false;
          })
          .map((q: unknown) => {
            const question = q as Record<string, unknown>;
            if (question.type === 'multipleChoice' && Array.isArray(question.choices)) {
              let choices = [...question.choices];
              const shuffle =
                (question.shuffleChoices ?? comprehension!.shuffleChoices ?? false) as boolean;
              if (shuffle) choices = choices.sort(() => Math.random() - 0.5);
              return { ...question, choices, type: 'multipleChoice' } as unknown as ComprehensionQuiz['questions'][0];
            } else if (question.type === 'proConSort') {
              return { ...question, type: 'proConSort' } as unknown as ComprehensionQuiz['questions'][0];
            }
            // Fallback: preserve the question as-is if type doesn't match
            return question as unknown as ComprehensionQuiz['questions'][0];
          });
        
        console.debug('[comprehension] Processed questions', {
          original: comprehension.questions.length,
          filtered: filteredQuestions.length,
          filteredOut: comprehension.questions.length - filteredQuestions.length,
          questionTypes: filteredQuestions.map((q: unknown) => (q as { type?: string }).type),
        });
        
        if (filteredQuestions.length === 0 && comprehension.questions.length > 0) {
          console.error('[comprehension] All questions were filtered out! Check the validation logic above.');
        }
        
        comprehension = {
          ...comprehension,
          questions: filteredQuestions,
        };
      }
    } catch {
      // ignore invalid JSON or schema
    }
  }

  const hiddenFromTree = (path: string) => {
    const lower = path.toLowerCase();
    return lower.endsWith('slack.json') || lower.endsWith('comprehension.json');
  };
  const filesForTree = files.filter((f) => !hiddenFromTree(f.path));
  const root = buildVirtualRoot(filesForTree);
  return {
    metadata,
    root,
    ...(slack !== undefined && { slack }),
    ...(comprehension !== undefined && { comprehension }),
  };
}
