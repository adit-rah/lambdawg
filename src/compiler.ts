/**
 * Main Lambdawg Compiler API
 */

import { Source } from './source.js';
import { CompilerError, formatError, formatErrors } from './errors.js';
import { tokenize, LexerResult } from './lexer/index.js';
import { parse, ParseResult, Program } from './parser/index.js';
import { typeCheck, TypeCheckResult } from './types/index.js';
import { emit, EmitResult, EmitOptions } from './codegen/index.js';

// ============================================================================
// Compiler Options
// ============================================================================

export interface CompileOptions {
  /** Filename for error reporting */
  filename?: string;
  /** Skip type checking */
  skipTypeCheck?: boolean;
  /** Code generation options */
  emit?: EmitOptions;
}

// ============================================================================
// Compiler Result
// ============================================================================

export interface CompileResult {
  /** Whether compilation succeeded without errors */
  success: boolean;
  /** Generated JavaScript code (if successful) */
  code?: string;
  /** Compilation errors */
  errors: CompilerError[];
  /** Compilation warnings */
  warnings: CompilerError[];
  /** AST (for tooling) */
  ast?: Program;
}

// ============================================================================
// Main Compiler Function
// ============================================================================

/**
 * Compile Lambdawg source code to JavaScript
 */
export function compile(source: string, options: CompileOptions = {}): CompileResult {
  const errors: CompilerError[] = [];
  const warnings: CompilerError[] = [];

  // Attach source and filename to errors
  const attachSource = (errs: CompilerError[]) => {
    for (const err of errs) {
      err.source = source;
      err.filename = options.filename;
      if (err.severity === 'warning') {
        warnings.push(err);
      } else {
        errors.push(err);
      }
    }
  };

  // Phase 1: Lexical Analysis
  const lexerResult = tokenize(source);
  attachSource(lexerResult.errors);

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  // Phase 2: Parsing
  const parseResult = parse(lexerResult.tokens);
  attachSource(parseResult.errors);

  if (errors.length > 0) {
    return { success: false, errors, warnings, ast: parseResult.program };
  }

  // Phase 3: Type Checking
  if (!options.skipTypeCheck) {
    const typeResult = typeCheck(parseResult.program);
    attachSource(typeResult.errors);

    if (errors.length > 0) {
      return { success: false, errors, warnings, ast: parseResult.program };
    }
  }

  // Phase 4: Code Generation
  const emitResult = emit(parseResult.program, options.emit);

  return {
    success: true,
    code: emitResult.code,
    errors,
    warnings,
    ast: parseResult.program,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check source code without generating output
 */
export function check(source: string, options: CompileOptions = {}): CompileResult {
  const errors: CompilerError[] = [];
  const warnings: CompilerError[] = [];

  const attachSource = (errs: CompilerError[]) => {
    for (const err of errs) {
      err.source = source;
      err.filename = options.filename;
      if (err.severity === 'warning') {
        warnings.push(err);
      } else {
        errors.push(err);
      }
    }
  };

  const lexerResult = tokenize(source);
  attachSource(lexerResult.errors);

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  const parseResult = parse(lexerResult.tokens);
  attachSource(parseResult.errors);

  if (errors.length > 0) {
    return { success: false, errors, warnings, ast: parseResult.program };
  }

  const typeResult = typeCheck(parseResult.program);
  attachSource(typeResult.errors);

  return {
    success: errors.length === 0,
    errors,
    warnings,
    ast: parseResult.program,
  };
}

/**
 * Format compiler errors for display
 */
export function formatCompilerErrors(errors: CompilerError[]): string {
  return formatErrors(errors);
}

/**
 * Format a single compiler error
 */
export function formatCompilerError(error: CompilerError): string {
  return formatError(error);
}

// ============================================================================
// Low-level API (for tooling)
// ============================================================================

export { tokenize, type LexerResult } from './lexer/index.js';
export { parse, type ParseResult } from './parser/index.js';
export { typeCheck, type TypeCheckResult } from './types/index.js';
export { emit, type EmitResult, type EmitOptions } from './codegen/index.js';

