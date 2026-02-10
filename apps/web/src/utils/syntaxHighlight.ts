import Prism from 'prismjs';

// Register only the Prism language components we need (avoids loading bugs).
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';

import type { VirtualFile } from '../mocks/virtualRepo';

/** Use the same language union as VirtualFile so one place to extend. */
export type CodeLanguage = VirtualFile['language'];

const PRISM_LANG_MAP: Record<CodeLanguage, string> = {
  tsx: 'typescript', // Prism uses typescript grammar for TSX too
  ts: 'typescript',
  js: 'javascript',
  json: 'json',
  text: 'plain',
  py: 'python',
  cpp: 'cpp',
  html: 'markup'
};

/**
 * Returns the Prism language id for our internal language.
 * Use 'plain' for unknown so Prism doesn't try to highlight.
 */
export function getPrismLanguageId(lang: CodeLanguage): string {
  return PRISM_LANG_MAP[lang] ?? 'plain';
}

/**
 * Highlights code string for the given language. Returns HTML string with Prism tokens.
 * Safe to pass through dangerouslySetInnerHTML when language and code are from our own data.
 */
export function highlightCode(code: string, language: CodeLanguage): string {
  const prismLang = getPrismLanguageId(language);
  if (prismLang === 'plain') {
    return escapeHtml(code);
  }
  const grammar = Prism.languages[prismLang];
  if (!grammar) {
    return escapeHtml(code);
  }
  try {
    return Prism.highlight(code, grammar, prismLang);
  } catch {
    return escapeHtml(code);
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
