/**
 * Lexer for the Lambdawg language
 */

import { Position, Span, createPosition, createSpan } from '../source.js';
import { CompilerError, createError, ErrorCodes } from '../errors.js';
import { Token, TokenType, createToken, KEYWORDS } from './tokens.js';

export interface LexerResult {
  tokens: Token[];
  errors: CompilerError[];
}

export class Lexer {
  private source: string;
  private tokens: Token[] = [];
  private errors: CompilerError[] = [];
  
  private start = 0;
  private current = 0;
  private line = 1;
  private column = 1;
  private lineStart = 0;

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): LexerResult {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }

    this.tokens.push(createToken(
      TokenType.EOF,
      '',
      this.createSpan()
    ));

    return {
      tokens: this.tokens,
      errors: this.errors,
    };
  }

  private scanToken(): void {
    const c = this.advance();

    switch (c) {
      // Single character tokens
      case '(': this.addToken(TokenType.LPAREN); break;
      case ')': this.addToken(TokenType.RPAREN); break;
      case '{':
        if (this.match('-')) {
          this.blockComment();
        } else {
          this.addToken(TokenType.LBRACE);
        }
        break;
      case '}': this.addToken(TokenType.RBRACE); break;
      case '[': this.addToken(TokenType.LBRACKET); break;
      case ']': this.addToken(TokenType.RBRACKET); break;
      case ',': this.addToken(TokenType.COMMA); break;
      case ':': this.addToken(TokenType.COLON); break;
      case '+': this.addToken(TokenType.PLUS); break;
      case '*': this.addToken(TokenType.STAR); break;
      case '%': this.addToken(TokenType.PERCENT); break;
      case '?': this.addToken(TokenType.QUESTION); break;
      case '@': this.addToken(TokenType.AT); break;
      case '_': 
        if (this.isAlphaNumeric(this.peek())) {
          this.identifier();
        } else {
          this.addToken(TokenType.UNDERSCORE);
        }
        break;

      // Potential multi-character tokens
      case '-':
        if (this.match('-')) {
          this.lineComment();
        } else if (this.match('>')) {
          this.addToken(TokenType.ARROW);
        } else {
          this.addToken(TokenType.MINUS);
        }
        break;

      case '/':
        this.addToken(TokenType.SLASH);
        break;

      case '|':
        if (this.match('>')) {
          this.addToken(TokenType.PIPE);
        } else if (this.match('|')) {
          this.addToken(TokenType.OR);
        } else {
          // Single | is used in type definitions
          this.addToken(TokenType.PIPE);
        }
        break;

      case '&':
        if (this.match('&')) {
          this.addToken(TokenType.AND);
        } else {
          this.unexpectedCharacter(c);
        }
        break;

      case '=':
        if (this.match('=')) {
          this.addToken(TokenType.EQEQ);
        } else if (this.match('>')) {
          this.addToken(TokenType.FAT_ARROW);
        } else {
          this.addToken(TokenType.EQ);
        }
        break;

      case '!':
        if (this.match('=')) {
          this.addToken(TokenType.NEQ);
        } else {
          this.addToken(TokenType.BANG);
        }
        break;

      case '<':
        if (this.match('=')) {
          this.addToken(TokenType.LTE);
        } else {
          this.addToken(TokenType.LT);
        }
        break;

      case '>':
        if (this.match('=')) {
          this.addToken(TokenType.GTE);
        } else {
          this.addToken(TokenType.GT);
        }
        break;

      case '.':
        if (this.match('.') && this.match('.')) {
          this.addToken(TokenType.DOTDOTDOT);
        } else {
          this.addToken(TokenType.DOT);
        }
        break;


      // Whitespace
      case ' ':
      case '\r':
      case '\t':
        // Ignore whitespace
        break;

      case '\n':
        this.newline();
        break;

      // String literals
      case '"':
        this.string();
        break;

      case "'":
        this.char();
        break;

      default:
        if (this.isDigit(c)) {
          this.number();
        } else if (this.isAlpha(c)) {
          this.identifier();
        } else {
          this.unexpectedCharacter(c);
        }
        break;
    }
  }

  private lineComment(): void {
    // A line comment goes until the end of the line
    while (this.peek() !== '\n' && !this.isAtEnd()) {
      this.advance();
    }
  }

  private blockComment(): void {
    // Block comments can nest: {- {- -} -}
    let depth = 1;
    
    while (depth > 0 && !this.isAtEnd()) {
      if (this.peek() === '{' && this.peekNext() === '-') {
        this.advance();
        this.advance();
        depth++;
      } else if (this.peek() === '-' && this.peekNext() === '}') {
        this.advance();
        this.advance();
        depth--;
      } else {
        if (this.peek() === '\n') {
          this.newline();
        }
        this.advance();
      }
    }

    if (depth > 0) {
      this.errors.push(createError(
        ErrorCodes.UNTERMINATED_COMMENT,
        'Unterminated block comment',
        this.createSpan(),
        ['Block comments start with {- and end with -}']
      ));
    }
  }

  private string(): void {
    const startLine = this.line;
    const startColumn = this.column - 1;
    let value = '';

    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        this.newline();
      }
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.parseEscapeSequence();
        if (escaped !== null) {
          value += escaped;
        }
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      this.errors.push(createError(
        ErrorCodes.UNTERMINATED_STRING,
        'Unterminated string',
        this.createSpan(),
        ['Strings must be closed with a double quote (")']
      ));
      return;
    }

    // The closing "
    this.advance();
    this.addToken(TokenType.STRING, value);
  }

  private char(): void {
    if (this.isAtEnd()) {
      this.errors.push(createError(
        ErrorCodes.UNTERMINATED_STRING,
        'Unterminated character literal',
        this.createSpan()
      ));
      return;
    }

    let value: string;
    if (this.peek() === '\\') {
      this.advance();
      const escaped = this.parseEscapeSequence();
      value = escaped ?? '\\';
    } else {
      value = this.advance();
    }

    if (this.peek() !== "'") {
      this.errors.push(createError(
        ErrorCodes.UNTERMINATED_STRING,
        'Unterminated character literal',
        this.createSpan(),
        ["Character literals must contain exactly one character and end with '"]
      ));
      return;
    }

    this.advance();
    this.addToken(TokenType.CHAR, value);
  }

  private parseEscapeSequence(): string | null {
    const c = this.advance();
    switch (c) {
      case 'n': return '\n';
      case 't': return '\t';
      case 'r': return '\r';
      case '\\': return '\\';
      case '"': return '"';
      case "'": return "'";
      case '0': return '\0';
      default:
        this.errors.push(createError(
          ErrorCodes.INVALID_ESCAPE,
          `Invalid escape sequence: \\${c}`,
          this.createSpan(),
          ['Valid escape sequences: \\n, \\t, \\r, \\\\, \\", \\\'']
        ));
        return null;
    }
  }

  private number(): void {
    // Check for hex, binary, octal
    if (this.source[this.start] === '0') {
      const next = this.peek();
      if (next === 'x' || next === 'X') {
        this.advance();
        this.hexNumber();
        return;
      } else if (next === 'b' || next === 'B') {
        this.advance();
        this.binaryNumber();
        return;
      } else if (next === 'o' || next === 'O') {
        this.advance();
        this.octalNumber();
        return;
      }
    }

    // Decimal number
    while (this.isDigit(this.peek()) || this.peek() === '_') {
      this.advance();
    }

    // Check for float
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance(); // consume '.'
      while (this.isDigit(this.peek()) || this.peek() === '_') {
        this.advance();
      }

      // Scientific notation
      if (this.peek() === 'e' || this.peek() === 'E') {
        this.advance();
        if (this.peek() === '+' || this.peek() === '-') {
          this.advance();
        }
        while (this.isDigit(this.peek())) {
          this.advance();
        }
      }

      const lexeme = this.source.slice(this.start, this.current).replace(/_/g, '');
      this.addToken(TokenType.FLOAT, parseFloat(lexeme));
    } else {
      const lexeme = this.source.slice(this.start, this.current).replace(/_/g, '');
      this.addToken(TokenType.INT, parseInt(lexeme, 10));
    }
  }

  private hexNumber(): void {
    while (this.isHexDigit(this.peek()) || this.peek() === '_') {
      this.advance();
    }
    const lexeme = this.source.slice(this.start + 2, this.current).replace(/_/g, '');
    this.addToken(TokenType.INT, parseInt(lexeme, 16));
  }

  private binaryNumber(): void {
    while (this.peek() === '0' || this.peek() === '1' || this.peek() === '_') {
      this.advance();
    }
    const lexeme = this.source.slice(this.start + 2, this.current).replace(/_/g, '');
    this.addToken(TokenType.INT, parseInt(lexeme, 2));
  }

  private octalNumber(): void {
    while (this.isOctalDigit(this.peek()) || this.peek() === '_') {
      this.advance();
    }
    const lexeme = this.source.slice(this.start + 2, this.current).replace(/_/g, '');
    this.addToken(TokenType.INT, parseInt(lexeme, 8));
  }

  private identifier(): void {
    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }

    const text = this.source.slice(this.start, this.current);
    
    // Check if it's a keyword
    const keyword = KEYWORDS[text];
    if (keyword !== undefined) {
      this.addToken(keyword);
      return;
    }

    // Check if it's uppercase (type identifier) or lowercase (value identifier)
    const type = this.isUppercase(text[0]!) 
      ? TokenType.TYPE_IDENT 
      : TokenType.IDENT;
    
    this.addToken(type);
  }

  // Helper methods

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private advance(): string {
    const c = this.source[this.current]!;
    this.current++;
    this.column++;
    return c;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.current]!;
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) return '\0';
    return this.source[this.current + 1]!;
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source[this.current] !== expected) return false;
    this.current++;
    this.column++;
    return true;
  }

  private newline(): void {
    this.line++;
    this.column = 1;
    this.lineStart = this.current + 1;
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private isHexDigit(c: string): boolean {
    return this.isDigit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
  }

  private isOctalDigit(c: string): boolean {
    return c >= '0' && c <= '7';
  }

  private isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }

  private isUppercase(c: string): boolean {
    return c >= 'A' && c <= 'Z';
  }

  private createSpan(): Span {
    const startOffset = this.start;
    const endOffset = this.current;
    
    // Calculate start position
    let startLine = 1;
    let startCol = 1;
    for (let i = 0; i < startOffset; i++) {
      if (this.source[i] === '\n') {
        startLine++;
        startCol = 1;
      } else {
        startCol++;
      }
    }

    // Calculate end position  
    let endLine = startLine;
    let endCol = startCol;
    for (let i = startOffset; i < endOffset; i++) {
      if (this.source[i] === '\n') {
        endLine++;
        endCol = 1;
      } else {
        endCol++;
      }
    }

    return createSpan(
      createPosition(startLine, startCol, startOffset),
      createPosition(endLine, endCol, endOffset)
    );
  }

  private addToken(type: TokenType, value?: unknown): void {
    const lexeme = this.source.slice(this.start, this.current);
    this.tokens.push(createToken(type, lexeme, this.createSpan(), value));
  }

  private unexpectedCharacter(c: string): void {
    this.errors.push(createError(
      ErrorCodes.UNEXPECTED_CHARACTER,
      `Unexpected character: '${c}'`,
      this.createSpan()
    ));
  }
}

export function tokenize(source: string): LexerResult {
  const lexer = new Lexer(source);
  return lexer.tokenize();
}

