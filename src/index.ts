/**
 * Lambdawg Compiler
 * 
 * A functional programming language focused on clarity, parallelism, and honest effects.
 * 
 * @example
 * ```typescript
 * import { compile } from '@lambdawg/compiler';
 * 
 * const result = compile(`
 *   let main with console = () => do {
 *     do! console.print("Hello, Lambdawg!")
 *   }
 * `);
 * 
 * if (result.success) {
 *   console.log(result.code);
 * } else {
 *   console.error(formatCompilerErrors(result.errors));
 * }
 * ```
 */

// Main API
export {
  compile,
  check,
  formatCompilerError,
  formatCompilerErrors,
} from './compiler.js';

export type {
  CompileOptions,
  CompileResult,
} from './compiler.js';

// Low-level APIs for tooling
export {
  tokenize,
  parse,
  typeCheck,
  emit,
} from './compiler.js';

export type {
  LexerResult,
  ParseResult,
  TypeCheckResult,
  EmitResult,
  EmitOptions,
} from './compiler.js';

// Token types
export { TokenType } from './lexer/index.js';
export type { Token } from './lexer/index.js';

// AST types
export * as ast from './parser/ast.js';

// Type system
export {
  typeToString,
} from './types/index.js';

export type {
  Type,
  TypeVar,
  TypeConst,
  TypeFunc,
  TypeRecord,
  TypeList,
  TypeApp,
  TypeScheme,
} from './types/index.js';

// Error types
export {
  ErrorCodes,
  createError,
  createWarning,
  formatError,
  formatErrors,
} from './errors.js';

export type {
  CompilerError,
  ErrorSeverity,
} from './errors.js';

// Source utilities
export {
  createPosition,
  createSpan,
  formatPosition,
  getSourceLine,
} from './source.js';

export type {
  Position,
  Span,
  Source,
} from './source.js';
