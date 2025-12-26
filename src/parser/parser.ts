/**
 * Parser for the Lambdawg language
 * 
 * Implements a recursive descent parser with Pratt parsing for expressions.
 */

import { Span, createSpan, mergeSpans } from '../source.js';
import { CompilerError, createError, ErrorCodes } from '../errors.js';
import { Token, TokenType } from '../lexer/tokens.js';
import * as ast from './ast.js';

export interface ParseResult {
  program: ast.Program;
  errors: CompilerError[];
}

export class Parser {
  private tokens: Token[];
  private current = 0;
  private errors: CompilerError[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ParseResult {
    const statements: ast.Statement[] = [];
    const modules: ast.Module[] = [];

    while (!this.isAtEnd()) {
      try {
        if (this.check(TokenType.MODULE)) {
          modules.push(this.parseModule());
        } else {
          const stmt = this.parseStatement();
          if (stmt) statements.push(stmt);
        }
      } catch (e) {
        this.synchronize();
      }
    }

    const span = statements.length > 0 || modules.length > 0
      ? mergeSpans(
          (modules[0] ?? statements[0])!.span,
          (statements[statements.length - 1] ?? modules[modules.length - 1])!.span
        )
      : this.peek().span;

    return {
      program: ast.createProgram(modules, statements, span),
      errors: this.errors,
    };
  }

  // ===========================================================================
  // Module Parsing
  // ===========================================================================

  private parseModule(): ast.Module {
    const start = this.consume(TokenType.MODULE, 'Expected "module"');
    const name = this.parseIdentifier();
    
    let providing: ast.ProvisionList | undefined;
    if (this.match(TokenType.PROVIDING)) {
      providing = this.parseProvisionList();
    }

    this.consume(TokenType.LBRACE, 'Expected "{" after module name');
    
    const body: ast.Statement[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
    }

    const end = this.consume(TokenType.RBRACE, 'Expected "}" to close module');

    return {
      kind: 'Module',
      name,
      providing,
      body,
      span: mergeSpans(start.span, end.span),
    };
  }

  private parseProvisionList(): ast.ProvisionList {
    const provisions: ast.Provision[] = [];
    const start = this.previous().span;

    do {
      provisions.push(this.parseProvision());
    } while (this.match(TokenType.COMMA));

    return {
      kind: 'ProvisionList',
      provisions,
      span: mergeSpans(start, this.previous().span),
    };
  }

  private parseProvision(): ast.Provision {
    const name = this.parseIdentifier();
    this.consume(TokenType.EQ, 'Expected "=" in provision');
    const value = this.parseExpression();

    return {
      kind: 'Provision',
      name,
      value,
      span: mergeSpans(name.span, value.span),
    };
  }

  // ===========================================================================
  // Statement Parsing
  // ===========================================================================

  private parseStatement(): ast.Statement | null {
    if (this.check(TokenType.LET) || this.check(TokenType.PRIVATE)) {
      return this.parseLetStatement();
    }
    if (this.check(TokenType.TYPE)) {
      return this.parseTypeDefinition();
    }
    if (this.check(TokenType.IMPORT)) {
      return this.parseImportStatement();
    }
    
    // Expression statement
    const expr = this.parseExpression();
    return {
      kind: 'ExpressionStatement',
      expression: expr,
      span: expr.span,
    };
  }

  private parseLetStatement(): ast.LetStatement {
    const isPrivate = this.match(TokenType.PRIVATE);
    const start = this.consume(TokenType.LET, 'Expected "let"');
    const name = this.parseIdentifier();

    let ambients: ast.AmbientList | undefined;
    if (this.match(TokenType.WITH)) {
      ambients = this.parseAmbientList();
    }

    let typeAnnotation: ast.TypeExpression | undefined;
    if (this.match(TokenType.COLON)) {
      typeAnnotation = this.parseTypeExpression();
    }

    this.consume(TokenType.EQ, 'Expected "=" after let binding name');
    const value = this.parseExpression();

    return {
      kind: 'LetStatement',
      isPrivate,
      name,
      typeAnnotation,
      ambients,
      value,
      span: mergeSpans(start.span, value.span),
    };
  }

  private parseAmbientList(): ast.AmbientList {
    const ambients: ast.AmbientDecl[] = [];
    const start = this.previous().span;

    do {
      ambients.push(this.parseAmbientDecl());
    } while (this.match(TokenType.COMMA));

    return {
      kind: 'AmbientList',
      ambients,
      span: mergeSpans(start, this.previous().span),
    };
  }

  private parseAmbientDecl(): ast.AmbientDecl {
    const name = this.parseIdentifier();
    let type: ast.TypeExpression | undefined;

    if (this.match(TokenType.COLON)) {
      type = this.parseTypeExpression();
    }

    return {
      kind: 'AmbientDecl',
      name,
      type,
      span: type ? mergeSpans(name.span, type.span) : name.span,
    };
  }

  private parseTypeDefinition(): ast.TypeDefinition {
    const start = this.consume(TokenType.TYPE, 'Expected "type"');
    const name = this.parseTypeIdentifier();

    const typeParams: ast.Identifier[] = [];
    while (this.check(TokenType.IDENT)) {
      typeParams.push(this.parseIdentifier());
    }

    this.consume(TokenType.EQ, 'Expected "=" after type name');
    const body = this.parseTypeBody();

    return {
      kind: 'TypeDefinition',
      name: { kind: 'Identifier', name: name.name, span: name.span },
      typeParams,
      body,
      span: mergeSpans(start.span, body.span),
    };
  }

  private parseTypeBody(): ast.TypeBody {
    if (this.check(TokenType.PIPE) || this.checkTypeIdent()) {
      return this.parseSumType();
    }
    
    const type = this.parseTypeExpression();
    return {
      kind: 'TypeAlias',
      type,
      span: type.span,
    };
  }

  private parseSumType(): ast.SumType {
    const variants: ast.Variant[] = [];
    const start = this.peek().span;

    // Optional leading pipe
    this.match(TokenType.PIPE);

    do {
      variants.push(this.parseVariant());
    } while (this.match(TokenType.PIPE));

    return {
      kind: 'SumType',
      variants,
      span: mergeSpans(start, this.previous().span),
    };
  }

  private parseVariant(): ast.Variant {
    const name = this.parseTypeIdentifier();
    let fields: ast.RecordTypeFields | undefined;

    if (this.match(TokenType.LBRACE)) {
      fields = this.parseRecordTypeFields();
      this.consume(TokenType.RBRACE, 'Expected "}" after variant fields');
    }

    return {
      kind: 'Variant',
      name: { kind: 'Identifier', name: name.name, span: name.span },
      fields,
      span: fields ? mergeSpans(name.span, this.previous().span) : name.span,
    };
  }

  private parseImportStatement(): ast.ImportStatement {
    const start = this.consume(TokenType.IMPORT, 'Expected "import"');
    const isJs = this.match(TokenType.JS);
    const moduleName = this.parseIdentifier();

    let imports: ast.ImportList | undefined;
    if (this.match(TokenType.LBRACE)) {
      imports = this.parseImportList();
      this.consume(TokenType.RBRACE, 'Expected "}" after import list');
    }

    return {
      kind: 'ImportStatement',
      isJs,
      moduleName,
      imports,
      span: mergeSpans(start.span, this.previous().span),
    };
  }

  private parseImportList(): ast.ImportList {
    const items: ast.ImportItem[] = [];
    const start = this.previous().span;
    let isWildcard = false;

    if (this.match(TokenType.STAR)) {
      isWildcard = true;
    } else {
      do {
        items.push(this.parseImportItem());
      } while (this.match(TokenType.COMMA));
    }

    return {
      kind: 'ImportList',
      items,
      isWildcard,
      span: mergeSpans(start, this.previous().span),
    };
  }

  private parseImportItem(): ast.ImportItem {
    const name = this.parseIdentifier();
    let alias: ast.Identifier | undefined;

    if (this.match(TokenType.AS)) {
      alias = this.parseIdentifier();
    }

    return {
      kind: 'ImportItem',
      name,
      alias,
      span: alias ? mergeSpans(name.span, alias.span) : name.span,
    };
  }

  // ===========================================================================
  // Expression Parsing (Pratt Parser)
  // ===========================================================================

  private parseExpression(): ast.Expression {
    return this.parsePrecedence(Precedence.LOWEST);
  }

  private parsePrecedence(precedence: Precedence): ast.Expression {
    let left = this.parsePrefixExpression();

    while (precedence < this.getInfixPrecedence()) {
      left = this.parseInfixExpression(left);
    }

    return left;
  }

  private parsePrefixExpression(): ast.Expression {
    const token = this.peek();

    switch (token.type) {
      case TokenType.INT:
      case TokenType.FLOAT:
      case TokenType.STRING:
      case TokenType.CHAR:
      case TokenType.TRUE:
      case TokenType.FALSE:
        return this.parseLiteral();

      case TokenType.IDENT:
        return this.parseIdentifier();

      case TokenType.TYPE_IDENT:
        return this.parseConstructorOrIdentifier();

      case TokenType.LPAREN:
        return this.parseParenthesizedOrFunction();

      case TokenType.LBRACKET:
        return this.parseListExpression();

      case TokenType.LBRACE:
        return this.parseRecordOrBlock();

      case TokenType.IF:
        return this.parseIfExpression();

      case TokenType.MATCH:
        return this.parseMatchExpression();

      case TokenType.DO:
        return this.parseDoExpression();

      case TokenType.PROVIDE:
        return this.parseProvideExpression();

      case TokenType.MINUS:
      case TokenType.NOT:
        return this.parseUnaryExpression();

      case TokenType.UNDERSCORE:
        return this.parsePlaceholder();

      case TokenType.DOTDOTDOT:
        return this.parseSpread();

      default:
        this.error(ErrorCodes.EXPECTED_EXPRESSION, `Expected expression, got ${token.type}`);
        this.advance();
        return ast.createIdentifier('_error_', token.span);
    }
  }

  private parseInfixExpression(left: ast.Expression): ast.Expression {
    const token = this.peek();

    switch (token.type) {
      case TokenType.PLUS:
      case TokenType.MINUS:
      case TokenType.STAR:
      case TokenType.SLASH:
      case TokenType.PERCENT:
      case TokenType.EQEQ:
      case TokenType.NEQ:
      case TokenType.LT:
      case TokenType.GT:
      case TokenType.LTE:
      case TokenType.GTE:
      case TokenType.AND:
      case TokenType.OR:
        return this.parseBinaryExpression(left);

      case TokenType.PIPE:
        return this.parsePipelineExpression(left);

      case TokenType.QUESTION:
        return this.parseErrorPropagation(left);

      case TokenType.LPAREN:
        return this.parseCallExpression(left);

      case TokenType.DOT:
        return this.parseMemberExpression(left);

      case TokenType.LBRACKET:
        return this.parseIndexExpression(left);

      default:
        return left;
    }
  }

  private getInfixPrecedence(): Precedence {
    const token = this.peek();

    switch (token.type) {
      case TokenType.OR:
        return Precedence.OR;
      case TokenType.AND:
        return Precedence.AND;
      case TokenType.EQEQ:
      case TokenType.NEQ:
        return Precedence.EQUALITY;
      case TokenType.LT:
      case TokenType.GT:
      case TokenType.LTE:
      case TokenType.GTE:
        return Precedence.COMPARISON;
      case TokenType.PLUS:
      case TokenType.MINUS:
        return Precedence.TERM;
      case TokenType.STAR:
      case TokenType.SLASH:
      case TokenType.PERCENT:
        return Precedence.FACTOR;
      case TokenType.PIPE:
        return Precedence.PIPELINE;
      case TokenType.QUESTION:
        return Precedence.ERROR_PROP;
      case TokenType.LPAREN:
      case TokenType.DOT:
      case TokenType.LBRACKET:
        return Precedence.CALL;
      default:
        return Precedence.LOWEST;
    }
  }

  // Individual expression parsers

  private parseLiteral(): ast.Literal {
    const token = this.advance();

    switch (token.type) {
      case TokenType.INT:
        return ast.createLiteral('int', token.value as number, token.span);
      case TokenType.FLOAT:
        return ast.createLiteral('float', token.value as number, token.span);
      case TokenType.STRING:
        return ast.createLiteral('string', token.value as string, token.span);
      case TokenType.CHAR:
        return ast.createLiteral('char', token.value as string, token.span);
      case TokenType.TRUE:
        return ast.createLiteral('bool', true, token.span);
      case TokenType.FALSE:
        return ast.createLiteral('bool', false, token.span);
      default:
        throw new Error(`Unexpected literal type: ${token.type}`);
    }
  }

  private parseIdentifier(): ast.Identifier {
    const token = this.consume(TokenType.IDENT, 'Expected identifier');
    return ast.createIdentifier(token.lexeme, token.span);
  }

  private parseTypeIdentifier(): ast.TypeIdentifier {
    const token = this.consume(TokenType.TYPE_IDENT, 'Expected type identifier');
    return { kind: 'TypeIdentifier', name: token.lexeme, span: token.span };
  }

  private parseConstructorOrIdentifier(): ast.Expression {
    const token = this.advance();
    const name = ast.createIdentifier(token.lexeme, token.span);

    // Check if it's a constructor call with fields
    if (this.check(TokenType.LBRACE)) {
      const record = this.parseRecordOrBlock();
      return {
        kind: 'CallExpression',
        callee: name,
        args: [record],
        span: mergeSpans(name.span, record.span),
      };
    }

    return name;
  }

  private parseParenthesizedOrFunction(): ast.Expression {
    const start = this.consume(TokenType.LPAREN, 'Expected "("');

    // Empty parens = unit literal
    if (this.match(TokenType.RPAREN)) {
      return ast.createLiteral('unit', null, mergeSpans(start.span, this.previous().span));
    }

    // Check if this is a function definition
    // Look ahead to see if we have patterns followed by ) =>
    const checkpoint = this.current;
    const params = this.tryParseParams();
    
    if (params && this.check(TokenType.RPAREN)) {
      this.advance(); // consume )
      if (this.match(TokenType.FAT_ARROW)) {
        const body = this.parseExpression();
        return {
          kind: 'FunctionExpression',
          params,
          body,
          span: mergeSpans(start.span, body.span),
        };
      }
    }

    // Reset and parse as parenthesized expression
    this.current = checkpoint;
    const expr = this.parseExpression();
    
    // Check for tuple/multiple expressions (which would be function params)
    if (this.match(TokenType.COMMA)) {
      // This is a function definition with multiple params
      const params: ast.Pattern[] = [this.exprToPattern(expr)];
      do {
        params.push(this.parsePattern());
      } while (this.match(TokenType.COMMA));
      
      this.consume(TokenType.RPAREN, 'Expected ")" after function parameters');
      this.consume(TokenType.FAT_ARROW, 'Expected "=>" after function parameters');
      const body = this.parseExpression();
      
      return {
        kind: 'FunctionExpression',
        params,
        body,
        span: mergeSpans(start.span, body.span),
      };
    }

    this.consume(TokenType.RPAREN, 'Expected ")" after expression');

    // Check if it's followed by =>
    if (this.match(TokenType.FAT_ARROW)) {
      const body = this.parseExpression();
      return {
        kind: 'FunctionExpression',
        params: [this.exprToPattern(expr)],
        body,
        span: mergeSpans(start.span, body.span),
      };
    }

    return expr;
  }

  private tryParseParams(): ast.Pattern[] | null {
    const params: ast.Pattern[] = [];
    
    try {
      if (this.check(TokenType.RPAREN)) {
        return params;
      }

      do {
        params.push(this.parsePattern());
      } while (this.match(TokenType.COMMA));

      return params;
    } catch {
      return null;
    }
  }

  private exprToPattern(expr: ast.Expression): ast.Pattern {
    switch (expr.kind) {
      case 'Identifier':
        return { kind: 'IdentifierPattern', name: expr.name, span: expr.span };
      case 'Literal':
        return { kind: 'LiteralPattern', value: expr.value as number | string | boolean, span: expr.span };
      case 'PlaceholderExpression':
        return { kind: 'WildcardPattern', span: expr.span };
      default:
        this.error(ErrorCodes.INVALID_PATTERN, 'Invalid pattern');
        return { kind: 'WildcardPattern', span: expr.span };
    }
  }

  private parseListExpression(): ast.ListExpression {
    const start = this.consume(TokenType.LBRACKET, 'Expected "["');
    const elements: ast.Expression[] = [];

    if (!this.check(TokenType.RBRACKET)) {
      do {
        elements.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }

    const end = this.consume(TokenType.RBRACKET, 'Expected "]" after list');

    return {
      kind: 'ListExpression',
      elements,
      span: mergeSpans(start.span, end.span),
    };
  }

  private parseRecordOrBlock(): ast.Expression {
    const start = this.consume(TokenType.LBRACE, 'Expected "{"');

    // Empty braces = empty record
    if (this.match(TokenType.RBRACE)) {
      return {
        kind: 'RecordExpression',
        fields: [],
        span: mergeSpans(start.span, this.previous().span),
      };
    }

    // Check if this is a record (name: value) or block (statements)
    if (this.check(TokenType.IDENT) && this.peekNext()?.type === TokenType.COLON) {
      return this.parseRecordExpression(start);
    }

    // Check for spread
    if (this.check(TokenType.DOTDOTDOT)) {
      return this.parseRecordExpression(start);
    }

    // It's a block expression
    return this.parseBlockExpression(start);
  }

  private parseRecordExpression(start: Token): ast.RecordExpression {
    const fields: ast.RecordField[] = [];
    let spread: ast.Expression | undefined;

    do {
      if (this.match(TokenType.DOTDOTDOT)) {
        spread = this.parseExpression();
      } else if (this.check(TokenType.IDENT)) {
        const name = this.parseIdentifier();
        this.consume(TokenType.COLON, 'Expected ":" after field name');
        const value = this.parseExpression();
        fields.push({
          kind: 'RecordField',
          name,
          value,
          span: mergeSpans(name.span, value.span),
        });
      }
    } while (this.match(TokenType.COMMA));

    const end = this.consume(TokenType.RBRACE, 'Expected "}" after record');

    return {
      kind: 'RecordExpression',
      fields,
      spread,
      span: mergeSpans(start.span, end.span),
    };
  }

  private parseBlockExpression(start: Token): ast.BlockExpression {
    const statements: ast.Statement[] = [];
    let result: ast.Expression | undefined;

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.LET)) {
        statements.push(this.parseLetStatement());
      } else {
        const expr = this.parseExpression();
        if (this.check(TokenType.RBRACE)) {
          result = expr;
        } else {
          statements.push({
            kind: 'ExpressionStatement',
            expression: expr,
            span: expr.span,
          });
        }
      }
    }

    const end = this.consume(TokenType.RBRACE, 'Expected "}" after block');

    return {
      kind: 'BlockExpression',
      statements,
      result,
      span: mergeSpans(start.span, end.span),
    };
  }

  private parseIfExpression(): ast.IfExpression {
    const start = this.consume(TokenType.IF, 'Expected "if"');
    const condition = this.parseExpression();
    this.consume(TokenType.THEN, 'Expected "then" after if condition');
    const thenBranch = this.parseExpression();
    this.consume(TokenType.ELSE, 'Expected "else" after then branch');
    const elseBranch = this.parseExpression();

    return {
      kind: 'IfExpression',
      condition,
      thenBranch,
      elseBranch,
      span: mergeSpans(start.span, elseBranch.span),
    };
  }

  private parseMatchExpression(): ast.MatchExpression {
    const start = this.consume(TokenType.MATCH, 'Expected "match"');
    const subject = this.parseExpression();
    this.consume(TokenType.LBRACE, 'Expected "{" after match subject');

    const arms: ast.MatchArm[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      arms.push(this.parseMatchArm());
    }

    const end = this.consume(TokenType.RBRACE, 'Expected "}" after match arms');

    return {
      kind: 'MatchExpression',
      subject,
      arms,
      span: mergeSpans(start.span, end.span),
    };
  }

  private parseMatchArm(): ast.MatchArm {
    const pattern = this.parsePattern();
    
    let guard: ast.Expression | undefined;
    if (this.match(TokenType.IF)) {
      guard = this.parseExpression();
    }

    this.consume(TokenType.FAT_ARROW, 'Expected "=>" after pattern');
    const body = this.parseExpression();

    return {
      kind: 'MatchArm',
      pattern,
      guard,
      body,
      span: mergeSpans(pattern.span, body.span),
    };
  }

  private parseDoExpression(): ast.DoExpression {
    const start = this.consume(TokenType.DO, 'Expected "do"');
    const isResultContext = this.match(TokenType.QUESTION);
    this.consume(TokenType.LBRACE, 'Expected "{" after do');

    const body: ast.DoStatement[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      body.push(this.parseDoStatement());
    }

    const end = this.consume(TokenType.RBRACE, 'Expected "}" after do block');

    return {
      kind: 'DoExpression',
      isResultContext,
      body,
      span: mergeSpans(start.span, end.span),
    };
  }

  private parseDoStatement(): ast.DoStatement {
    if (this.match(TokenType.LET)) {
      const pattern = this.parsePattern();
      this.consume(TokenType.EQ, 'Expected "=" after pattern');
      
      const isEffect = this.match(TokenType.DO) && this.match(TokenType.BANG);
      const value = this.parseExpression();

      return {
        kind: 'DoLetStatement',
        pattern,
        isEffect,
        value,
        span: mergeSpans(pattern.span, value.span),
      };
    }

    if (this.match(TokenType.DO) && this.match(TokenType.BANG)) {
      const expression = this.parseExpression();
      return {
        kind: 'DoEffectStatement',
        expression,
        span: expression.span,
      };
    }

    const expression = this.parseExpression();
    return {
      kind: 'DoExprStatement',
      expression,
      span: expression.span,
    };
  }

  private parseProvideExpression(): ast.ProvideExpression {
    const start = this.consume(TokenType.PROVIDE, 'Expected "provide"');
    const provisions: ast.Provision[] = [];

    do {
      provisions.push(this.parseProvision());
    } while (this.match(TokenType.COMMA));

    this.consume(TokenType.IN, 'Expected "in" after provisions');
    this.consume(TokenType.LBRACE, 'Expected "{" after "in"');
    
    const bodyStatements: ast.Statement[] = [];
    let bodyResult: ast.Expression | undefined;

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const expr = this.parseExpression();
      if (this.check(TokenType.RBRACE)) {
        bodyResult = expr;
      } else {
        bodyStatements.push({
          kind: 'ExpressionStatement',
          expression: expr,
          span: expr.span,
        });
      }
    }

    const end = this.consume(TokenType.RBRACE, 'Expected "}" after provide body');

    const body: ast.BlockExpression = {
      kind: 'BlockExpression',
      statements: bodyStatements,
      result: bodyResult,
      span: mergeSpans(start.span, end.span),
    };

    return {
      kind: 'ProvideExpression',
      provisions,
      body,
      span: mergeSpans(start.span, end.span),
    };
  }

  private parseUnaryExpression(): ast.UnaryExpression {
    const op = this.advance();
    const operand = this.parsePrecedence(Precedence.UNARY);

    return {
      kind: 'UnaryExpression',
      operator: op.lexeme as ast.UnaryOperator,
      operand,
      span: mergeSpans(op.span, operand.span),
    };
  }

  private parseBinaryExpression(left: ast.Expression): ast.BinaryExpression {
    const op = this.advance();
    const precedence = this.getOperatorPrecedence(op.type);
    const right = this.parsePrecedence(precedence + 1);

    return {
      kind: 'BinaryExpression',
      operator: op.lexeme as ast.BinaryOperator,
      left,
      right,
      span: mergeSpans(left.span, right.span),
    };
  }

  private parsePipelineExpression(left: ast.Expression): ast.PipelineExpression {
    this.advance(); // consume |>
    
    const isSeq = this.match(TokenType.SEQ);
    let parallelHint: ast.ParallelHint | undefined;
    
    if (this.match(TokenType.AT)) {
      parallelHint = this.parseParallelHint();
    }

    const right = this.parsePrecedence(Precedence.PIPELINE + 1);

    return {
      kind: 'PipelineExpression',
      left,
      right,
      isSeq,
      parallelHint,
      span: mergeSpans(left.span, right.span),
    };
  }

  private parseParallelHint(): ast.ParallelHint {
    const start = this.previous().span;
    const name = this.parseIdentifier();
    
    if (name.name !== 'parallel') {
      this.error(ErrorCodes.UNEXPECTED_TOKEN, 'Expected @parallel hint');
    }

    this.consume(TokenType.LPAREN, 'Expected "(" after @parallel');
    
    const options: Record<string, ast.Expression> = {};
    if (!this.check(TokenType.RPAREN)) {
      do {
        const key = this.parseIdentifier();
        this.consume(TokenType.COLON, 'Expected ":" after hint key');
        const value = this.parseExpression();
        options[key.name] = value;
      } while (this.match(TokenType.COMMA));
    }

    const end = this.consume(TokenType.RPAREN, 'Expected ")" after hint options');

    return {
      kind: 'ParallelHint',
      options,
      span: mergeSpans(start, end.span),
    };
  }

  private parseErrorPropagation(left: ast.Expression): ast.BinaryExpression {
    const op = this.advance();
    
    return {
      kind: 'BinaryExpression',
      operator: '?',
      left,
      right: ast.createLiteral('unit', null, op.span), // placeholder
      span: mergeSpans(left.span, op.span),
    };
  }

  private parseCallExpression(callee: ast.Expression): ast.CallExpression {
    this.advance(); // consume (
    const args: ast.Expression[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }

    const end = this.consume(TokenType.RPAREN, 'Expected ")" after arguments');

    return {
      kind: 'CallExpression',
      callee,
      args,
      span: mergeSpans(callee.span, end.span),
    };
  }

  private parseMemberExpression(object: ast.Expression): ast.MemberExpression {
    this.advance(); // consume .
    const property = this.parseIdentifier();

    return {
      kind: 'MemberExpression',
      object,
      property,
      span: mergeSpans(object.span, property.span),
    };
  }

  private parseIndexExpression(object: ast.Expression): ast.IndexExpression {
    this.advance(); // consume [
    const index = this.parseExpression();
    const end = this.consume(TokenType.RBRACKET, 'Expected "]" after index');

    return {
      kind: 'IndexExpression',
      object,
      index,
      span: mergeSpans(object.span, end.span),
    };
  }

  private parsePlaceholder(): ast.PlaceholderExpression {
    const token = this.advance();
    return { kind: 'PlaceholderExpression', span: token.span };
  }

  private parseSpread(): ast.SpreadExpression {
    const start = this.advance();
    const expression = this.parseExpression();
    return {
      kind: 'SpreadExpression',
      expression,
      span: mergeSpans(start.span, expression.span),
    };
  }

  // ===========================================================================
  // Pattern Parsing
  // ===========================================================================

  private parsePattern(): ast.Pattern {
    const token = this.peek();

    switch (token.type) {
      case TokenType.IDENT:
        return this.parseIdentifierPattern();
      
      case TokenType.TYPE_IDENT:
        return this.parseConstructorPattern();
      
      case TokenType.INT:
      case TokenType.FLOAT:
      case TokenType.STRING:
      case TokenType.TRUE:
      case TokenType.FALSE:
        return this.parseLiteralPattern();
      
      case TokenType.UNDERSCORE:
        return this.parseWildcardPattern();
      
      case TokenType.LBRACKET:
        return this.parseListPattern();
      
      case TokenType.LBRACE:
        return this.parseRecordPattern();
      
      case TokenType.DOTDOTDOT:
        return this.parseRestPattern();
      
      default:
        this.error(ErrorCodes.INVALID_PATTERN, `Invalid pattern: ${token.type}`);
        this.advance();
        return { kind: 'WildcardPattern', span: token.span };
    }
  }

  private parseIdentifierPattern(): ast.IdentifierPattern {
    const token = this.advance();
    return { kind: 'IdentifierPattern', name: token.lexeme, span: token.span };
  }

  private parseConstructorPattern(): ast.ConstructorPattern {
    const name = this.parseTypeIdentifier();
    let fields: ast.RecordPattern | ast.Pattern | undefined;

    if (this.match(TokenType.LBRACE)) {
      fields = this.parseRecordPattern();
    } else if (this.match(TokenType.LPAREN)) {
      fields = this.parsePattern();
      this.consume(TokenType.RPAREN, 'Expected ")" after constructor pattern');
    }

    return {
      kind: 'ConstructorPattern',
      name: { kind: 'Identifier', name: name.name, span: name.span },
      fields,
      span: fields ? mergeSpans(name.span, fields.span) : name.span,
    };
  }

  private parseLiteralPattern(): ast.LiteralPattern {
    const token = this.advance();
    let value: number | string | boolean;

    switch (token.type) {
      case TokenType.INT:
      case TokenType.FLOAT:
        value = token.value as number;
        break;
      case TokenType.STRING:
        value = token.value as string;
        break;
      case TokenType.TRUE:
        value = true;
        break;
      case TokenType.FALSE:
        value = false;
        break;
      default:
        throw new Error(`Unexpected literal pattern: ${token.type}`);
    }

    return { kind: 'LiteralPattern', value, span: token.span };
  }

  private parseWildcardPattern(): ast.WildcardPattern {
    const token = this.advance();
    return { kind: 'WildcardPattern', span: token.span };
  }

  private parseListPattern(): ast.ListPattern {
    const start = this.advance(); // consume [
    const elements: ast.Pattern[] = [];
    let rest: ast.IdentifierPattern | undefined;

    if (!this.check(TokenType.RBRACKET)) {
      do {
        if (this.check(TokenType.DOTDOTDOT)) {
          this.advance();
          if (this.check(TokenType.IDENT)) {
            const name = this.advance();
            rest = { kind: 'IdentifierPattern', name: name.lexeme, span: name.span };
          }
          break;
        }
        elements.push(this.parsePattern());
      } while (this.match(TokenType.COMMA));
    }

    const end = this.consume(TokenType.RBRACKET, 'Expected "]" after list pattern');

    return {
      kind: 'ListPattern',
      elements,
      rest,
      span: mergeSpans(start.span, end.span),
    };
  }

  private parseRecordPattern(): ast.RecordPattern {
    const start = this.check(TokenType.LBRACE) ? this.advance() : this.previous();
    const fields: ast.RecordPatternField[] = [];
    let rest = false;

    if (!this.check(TokenType.RBRACE)) {
      do {
        if (this.match(TokenType.DOTDOTDOT)) {
          rest = true;
          break;
        }
        
        const name = this.parseIdentifier();
        let pattern: ast.Pattern | undefined;
        
        if (this.match(TokenType.COLON)) {
          pattern = this.parsePattern();
        }

        fields.push({
          kind: 'RecordPatternField',
          name,
          pattern,
          span: pattern ? mergeSpans(name.span, pattern.span) : name.span,
        });
      } while (this.match(TokenType.COMMA));
    }

    const end = this.consume(TokenType.RBRACE, 'Expected "}" after record pattern');

    return {
      kind: 'RecordPattern',
      fields,
      rest,
      span: mergeSpans(start.span, end.span),
    };
  }

  private parseRestPattern(): ast.RestPattern {
    const start = this.advance(); // consume ...
    let name: ast.Identifier | undefined;

    if (this.check(TokenType.IDENT)) {
      name = this.parseIdentifier();
    }

    return {
      kind: 'RestPattern',
      name,
      span: name ? mergeSpans(start.span, name.span) : start.span,
    };
  }

  // ===========================================================================
  // Type Expression Parsing
  // ===========================================================================

  private parseTypeExpression(): ast.TypeExpression {
    return this.parseUnionType();
  }

  private parseUnionType(): ast.TypeExpression {
    let type = this.parseFunctionType();
    // Could extend for union types here
    return type;
  }

  private parseFunctionType(): ast.TypeExpression {
    // Check for (A, B) -> C function type
    if (this.check(TokenType.LPAREN)) {
      const checkpoint = this.current;
      this.advance();
      
      const params: ast.TypeExpression[] = [];
      
      if (!this.check(TokenType.RPAREN)) {
        do {
          params.push(this.parseTypeExpression());
        } while (this.match(TokenType.COMMA));
      }
      
      if (this.match(TokenType.RPAREN) && this.match(TokenType.ARROW)) {
        const returnType = this.parseTypeExpression();
        return {
          kind: 'FunctionType',
          params,
          returnType,
          span: mergeSpans(params[0]?.span ?? returnType.span, returnType.span),
        };
      }
      
      // Not a function type, backtrack
      this.current = checkpoint;
    }

    return this.parsePrimaryType();
  }

  private parsePrimaryType(): ast.TypeExpression {
    if (this.check(TokenType.LBRACE)) {
      return this.parseRecordType();
    }

    if (this.check(TokenType.LBRACKET)) {
      return this.parseListType();
    }

    if (this.check(TokenType.LPAREN)) {
      const start = this.advance();
      const type = this.parseTypeExpression();
      this.consume(TokenType.RPAREN, 'Expected ")" after type');
      return {
        kind: 'ParenthesizedType',
        type,
        span: mergeSpans(start.span, this.previous().span),
      };
    }

    // Type identifier possibly with generic args
    const name = this.parseTypeIdentifier();

    // Check for generic type application
    const args: ast.TypeExpression[] = [];
    while (this.check(TokenType.TYPE_IDENT) || this.check(TokenType.IDENT) || this.check(TokenType.LPAREN)) {
      args.push(this.parsePrimaryType());
    }

    if (args.length > 0) {
      return {
        kind: 'GenericType',
        name,
        args,
        span: mergeSpans(name.span, args[args.length - 1]!.span),
      };
    }

    return name;
  }

  private parseRecordType(): ast.RecordType {
    const start = this.advance(); // consume {
    const fields = this.parseRecordTypeFields();
    const end = this.consume(TokenType.RBRACE, 'Expected "}" after record type');

    return {
      kind: 'RecordType',
      fields,
      span: mergeSpans(start.span, end.span),
    };
  }

  private parseRecordTypeFields(): ast.RecordTypeFields {
    const fields: ast.RecordTypeField[] = [];
    const start = this.previous().span;

    if (!this.check(TokenType.RBRACE)) {
      do {
        const name = this.parseIdentifier();
        this.consume(TokenType.COLON, 'Expected ":" after field name');
        const type = this.parseTypeExpression();
        
        fields.push({
          kind: 'RecordTypeField',
          name,
          type,
          span: mergeSpans(name.span, type.span),
        });
      } while (this.match(TokenType.COMMA));
    }

    return {
      kind: 'RecordTypeFields',
      fields,
      span: mergeSpans(start, this.peek().span),
    };
  }

  private parseListType(): ast.ListType {
    const start = this.advance(); // consume [
    const elementType = this.parseTypeExpression();
    const end = this.consume(TokenType.RBRACKET, 'Expected "]" after list type');

    return {
      kind: 'ListType',
      elementType,
      span: mergeSpans(start.span, end.span),
    };
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current]!;
  }

  private peekNext(): Token | undefined {
    return this.tokens[this.current + 1];
  }

  private previous(): Token {
    return this.tokens[this.current - 1]!;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkTypeIdent(): boolean {
    return this.check(TokenType.TYPE_IDENT);
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    
    this.error(ErrorCodes.UNEXPECTED_TOKEN, message);
    throw new Error(message);
  }

  private error(code: string, message: string): void {
    this.errors.push(createError(code, message, this.peek().span));
  }

  private synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.RBRACE) return;

      switch (this.peek().type) {
        case TokenType.LET:
        case TokenType.TYPE:
        case TokenType.MODULE:
        case TokenType.IMPORT:
          return;
      }

      this.advance();
    }
  }

  private getOperatorPrecedence(type: TokenType): Precedence {
    switch (type) {
      case TokenType.OR: return Precedence.OR;
      case TokenType.AND: return Precedence.AND;
      case TokenType.EQEQ:
      case TokenType.NEQ: return Precedence.EQUALITY;
      case TokenType.LT:
      case TokenType.GT:
      case TokenType.LTE:
      case TokenType.GTE: return Precedence.COMPARISON;
      case TokenType.PLUS:
      case TokenType.MINUS: return Precedence.TERM;
      case TokenType.STAR:
      case TokenType.SLASH:
      case TokenType.PERCENT: return Precedence.FACTOR;
      default: return Precedence.LOWEST;
    }
  }
}

enum Precedence {
  LOWEST = 0,
  OR = 1,
  AND = 2,
  EQUALITY = 3,
  COMPARISON = 4,
  TERM = 5,
  FACTOR = 6,
  UNARY = 7,
  PIPELINE = 8,
  ERROR_PROP = 9,
  CALL = 10,
}

export function parse(tokens: Token[]): ParseResult {
  const parser = new Parser(tokens);
  return parser.parse();
}

