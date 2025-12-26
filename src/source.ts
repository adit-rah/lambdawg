/**
 * Source location tracking for error reporting
 */

export interface Position {
  /** 1-based line number */
  line: number;
  /** 1-based column number */
  column: number;
  /** 0-based offset from start of file */
  offset: number;
}

export interface Span {
  start: Position;
  end: Position;
}

export interface Source {
  filename: string;
  content: string;
}

export function createPosition(line: number, column: number, offset: number): Position {
  return { line, column, offset };
}

export function createSpan(start: Position, end: Position): Span {
  return { start, end };
}

export function mergeSpans(a: Span, b: Span): Span {
  return {
    start: a.start.offset < b.start.offset ? a.start : b.start,
    end: a.end.offset > b.end.offset ? a.end : b.end,
  };
}

/**
 * Get a human-readable location string
 */
export function formatPosition(pos: Position, filename?: string): string {
  const prefix = filename ? `${filename}:` : '';
  return `${prefix}${pos.line}:${pos.column}`;
}

/**
 * Get the line of source code at a given position
 */
export function getSourceLine(source: string, line: number): string {
  const lines = source.split('\n');
  return lines[line - 1] ?? '';
}

/**
 * Create a pointer string showing the location in a line
 */
export function createPointer(column: number, length: number = 1): string {
  return ' '.repeat(column - 1) + '^'.repeat(Math.max(1, length));
}

