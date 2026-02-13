/**
 * Parses code with diff markers to identify insertions and deletions.
 * Supports:
 * - Lines starting with `\-` or `/-` (single-line deletion)
 * - Lines starting with `\+` or `/+` (single-line insertion)
 * - Multi-line blocks: `/-- --/` (deletion) and `/++ ++/` (insertion)
 */

export type DiffLineType = 'normal' | 'deletion' | 'insertion';

export interface DiffLine {
  content: string;
  type: DiffLineType;
  lineNumber: number;
  originalLineNumber: number | null; // null for insertions
}

export interface ParsedDiff {
  lines: DiffLine[];
  hasDiff: boolean;
}

/**
 * Parses code content and identifies diff markers.
 */
export function parseDiffMarkers(code: string): ParsedDiff {
  const lines = code.split('\n');
  const result: DiffLine[] = [];
  let inMultiLineDeletion = false;
  let inMultiLineInsertion = false;
  let lineNumber = 1;
  let originalLineNumber = 1;
  let hasDiff = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for multi-line block markers
    if (trimmed === '/--') {
      inMultiLineDeletion = true;
      hasDiff = true;
      continue; // Skip the marker line itself
    }
    if (trimmed === '--/') {
      inMultiLineDeletion = false;
      continue; // Skip the marker line itself
    }
    if (trimmed === '/++') {
      inMultiLineInsertion = true;
      hasDiff = true;
      continue; // Skip the marker line itself
    }
    if (trimmed === '++/') {
      inMultiLineInsertion = false;
      continue; // Skip the marker line itself
    }

    // Determine line type
    let type: DiffLineType = 'normal';
    let content = line;
    let currentOriginalLineNumber: number | null = originalLineNumber;

    if (inMultiLineDeletion) {
      type = 'deletion';
      hasDiff = true;
      currentOriginalLineNumber = originalLineNumber;
      originalLineNumber++;
    } else if (inMultiLineInsertion) {
      type = 'insertion';
      hasDiff = true;
      currentOriginalLineNumber = null;
      // Don't increment originalLineNumber for insertions
    } else if (line.startsWith('\\-') || line.startsWith('/-')) {
      type = 'deletion';
      // Remove the `\-` or `/-` prefix (2 characters), preserving any leading whitespace
      content = line.slice(2);
      hasDiff = true;
      currentOriginalLineNumber = originalLineNumber;
      originalLineNumber++;
    } else if (line.startsWith('\\+') || line.startsWith('/+')) {
      type = 'insertion';
      // Remove the `\+` or `/+` prefix (2 characters), preserving any leading whitespace
      content = line.slice(2);
      hasDiff = true;
      currentOriginalLineNumber = null;
      // Don't increment originalLineNumber for insertions
    } else {
      // Normal line
      originalLineNumber++;
    }

    result.push({
      content,
      type,
      lineNumber: lineNumber++,
      originalLineNumber: currentOriginalLineNumber,
    });
  }

  return {
    lines: result,
    hasDiff,
  };
}
