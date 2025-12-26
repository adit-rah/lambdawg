/**
 * Token types for the Lambdawg lexer
 */

import { Span } from '../source.js';

export enum TokenType {
  // Literals
  INT = 'INT',
  FLOAT = 'FLOAT',
  STRING = 'STRING',
  CHAR = 'CHAR',
  
  // Identifiers
  IDENT = 'IDENT',           // lowercase identifier
  TYPE_IDENT = 'TYPE_IDENT', // uppercase identifier
  
  // Keywords
  LET = 'LET',
  TYPE = 'TYPE',
  MODULE = 'MODULE',
  IMPORT = 'IMPORT',
  PRIVATE = 'PRIVATE',
  IF = 'IF',
  THEN = 'THEN',
  ELSE = 'ELSE',
  MATCH = 'MATCH',
  WITH = 'WITH',
  DO = 'DO',
  IN = 'IN',
  PROVIDE = 'PROVIDE',
  PROVIDING = 'PROVIDING',
  SEQ = 'SEQ',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  JS = 'JS',
  AS = 'AS',
  
  // Operators
  PLUS = 'PLUS',             // +
  MINUS = 'MINUS',           // -
  STAR = 'STAR',             // *
  SLASH = 'SLASH',           // /
  PERCENT = 'PERCENT',       // %
  EQ = 'EQ',                 // =
  EQEQ = 'EQEQ',             // ==
  NEQ = 'NEQ',               // !=
  LT = 'LT',                 // <
  GT = 'GT',                 // >
  LTE = 'LTE',               // <=
  GTE = 'GTE',               // >=
  AND = 'AND',               // &&
  OR = 'OR',                 // ||
  NOT = 'NOT',               // !
  PIPE = 'PIPE',             // |>
  ARROW = 'ARROW',           // ->
  FAT_ARROW = 'FAT_ARROW',   // =>
  QUESTION = 'QUESTION',     // ?
  COLON = 'COLON',           // :
  COMMA = 'COMMA',           // ,
  DOT = 'DOT',               // .
  DOTDOTDOT = 'DOTDOTDOT',   // ...
  UNDERSCORE = 'UNDERSCORE', // _
  AT = 'AT',                 // @
  BANG = 'BANG',             // ! (for do!)
  
  // Delimiters
  LPAREN = 'LPAREN',         // (
  RPAREN = 'RPAREN',         // )
  LBRACE = 'LBRACE',         // {
  RBRACE = 'RBRACE',         // }
  LBRACKET = 'LBRACKET',     // [
  RBRACKET = 'RBRACKET',     // ]
  
  // Special
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  lexeme: string;
  span: Span;
  value?: unknown; // Parsed value for literals
}

export function createToken(
  type: TokenType,
  lexeme: string,
  span: Span,
  value?: unknown
): Token {
  return { type, lexeme, span, value };
}

export const KEYWORDS: Record<string, TokenType> = {
  'let': TokenType.LET,
  'type': TokenType.TYPE,
  'module': TokenType.MODULE,
  'import': TokenType.IMPORT,
  'private': TokenType.PRIVATE,
  'if': TokenType.IF,
  'then': TokenType.THEN,
  'else': TokenType.ELSE,
  'match': TokenType.MATCH,
  'with': TokenType.WITH,
  'do': TokenType.DO,
  'in': TokenType.IN,
  'provide': TokenType.PROVIDE,
  'providing': TokenType.PROVIDING,
  'seq': TokenType.SEQ,
  'true': TokenType.TRUE,
  'false': TokenType.FALSE,
  'js': TokenType.JS,
  'as': TokenType.AS,
};

export function isKeyword(lexeme: string): boolean {
  return lexeme in KEYWORDS;
}

export function getKeywordType(lexeme: string): TokenType | undefined {
  return KEYWORDS[lexeme];
}

