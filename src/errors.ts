/**
 * Compiler error types and formatting
 */

import { Span, Position, formatPosition, getSourceLine, createPointer } from './source.js';

export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface CompilerError {
  severity: ErrorSeverity;
  code: string;
  message: string;
  span: Span;
  source?: string;
  filename?: string;
  hints?: string[];
}

export function createError(
  code: string,
  message: string,
  span: Span,
  hints?: string[]
): CompilerError {
  return {
    severity: 'error',
    code,
    message,
    span,
    hints,
  };
}

export function createWarning(
  code: string,
  message: string,
  span: Span,
  hints?: string[]
): CompilerError {
  return {
    severity: 'warning',
    code,
    message,
    span,
    hints,
  };
}

/**
 * Format an error for display
 */
export function formatError(error: CompilerError): string {
  const lines: string[] = [];
  
  // Header: error[E001]: message
  const severityLabel = error.severity.toUpperCase();
  lines.push(`${severityLabel}[${error.code}]: ${error.message}`);
  
  // Location
  const location = formatPosition(error.span.start, error.filename);
  lines.push(`  --> ${location}`);
  
  // Source context if available
  if (error.source) {
    const lineNum = error.span.start.line;
    const sourceLine = getSourceLine(error.source, lineNum);
    const lineNumStr = lineNum.toString();
    const padding = ' '.repeat(lineNumStr.length);
    
    lines.push(`${padding} |`);
    lines.push(`${lineNumStr} | ${sourceLine}`);
    
    // Pointer to error location
    const pointerLength = error.span.end.line === error.span.start.line
      ? error.span.end.column - error.span.start.column
      : 1;
    const pointer = createPointer(error.span.start.column, pointerLength);
    lines.push(`${padding} | ${pointer}`);
  }
  
  // Hints
  if (error.hints && error.hints.length > 0) {
    lines.push('');
    for (const hint of error.hints) {
      lines.push(`  = hint: ${hint}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Format multiple errors
 */
export function formatErrors(errors: CompilerError[]): string {
  return errors.map(formatError).join('\n\n');
}

// Error codes
export const ErrorCodes = {
  // Lexer errors (L)
  UNEXPECTED_CHARACTER: 'L001',
  UNTERMINATED_STRING: 'L002',
  UNTERMINATED_COMMENT: 'L003',
  INVALID_NUMBER: 'L004',
  INVALID_ESCAPE: 'L005',
  
  // Parser errors (P)
  UNEXPECTED_TOKEN: 'P001',
  EXPECTED_EXPRESSION: 'P002',
  EXPECTED_IDENTIFIER: 'P003',
  EXPECTED_TYPE: 'P004',
  UNCLOSED_PAREN: 'P005',
  UNCLOSED_BRACE: 'P006',
  UNCLOSED_BRACKET: 'P007',
  INVALID_PATTERN: 'P008',
  INVALID_ASSIGNMENT: 'P009',
  
  // Type errors (T)
  TYPE_MISMATCH: 'T001',
  UNDEFINED_VARIABLE: 'T002',
  UNDEFINED_TYPE: 'T003',
  NOT_A_FUNCTION: 'T004',
  WRONG_ARITY: 'T005',
  INFINITE_TYPE: 'T006',
  DUPLICATE_FIELD: 'T007',
  MISSING_FIELD: 'T008',
  NON_EXHAUSTIVE: 'T009',
  EFFECT_OUTSIDE_DO: 'T010',
  UNRESOLVED_AMBIENT: 'T011',
  
  // Module errors (M)
  MODULE_NOT_FOUND: 'M001',
  CIRCULAR_IMPORT: 'M002',
  DUPLICATE_EXPORT: 'M003',
} as const;

