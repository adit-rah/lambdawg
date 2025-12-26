/**
 * JavaScript code emitter for Lambdawg
 */

import * as ast from '../parser/ast.js';

export interface EmitResult {
  code: string;
  sourceMap?: string;
}

export interface EmitOptions {
  minify?: boolean;
  sourceMap?: boolean;
  runtime?: 'browser' | 'node';
}

export class Emitter {
  private output: string[] = [];
  private indent = 0;
  private options: EmitOptions;

  constructor(options: EmitOptions = {}) {
    this.options = {
      minify: false,
      sourceMap: false,
      runtime: 'browser',
      ...options,
    };
  }

  emit(program: ast.Program): EmitResult {
    this.output = [];
    
    // Emit runtime helpers
    this.emitRuntimeHelpers();
    
    // Emit modules
    for (const module of program.modules) {
      this.emitModule(module);
    }
    
    // Emit top-level statements
    for (const stmt of program.statements) {
      this.emitStatement(stmt);
    }

    return {
      code: this.output.join(''),
    };
  }

  private emitRuntimeHelpers(): void {
    this.writeLine('// Lambdawg Runtime');
    this.writeLine('const __lw = {');
    this.indent++;
    
    // Result type constructors
    this.writeLine('Ok: (value) => ({ __tag: "Ok", value }),');
    this.writeLine('Error: (error) => ({ __tag: "Error", error }),');
    this.writeLine('Some: (value) => ({ __tag: "Some", value }),');
    this.writeLine('None: { __tag: "None" },');
    
    // isOk/isError helpers
    this.writeLine('isOk: (r) => r.__tag === "Ok",');
    this.writeLine('isError: (r) => r.__tag === "Error",');
    this.writeLine('isSome: (o) => o.__tag === "Some",');
    this.writeLine('isNone: (o) => o.__tag === "None",');
    
    // Unwrap with error propagation
    this.writeLine('unwrap: (r) => { if (r.__tag === "Error") throw r; return r.value; },');
    
    // Pattern matching helper
    this.writeLine('match: (value, cases) => {');
    this.indent++;
    this.writeLine('for (const [pattern, handler] of cases) {');
    this.indent++;
    this.writeLine('const result = pattern(value);');
    this.writeLine('if (result.matched) return handler(result.bindings);');
    this.indent--;
    this.writeLine('}');
    this.writeLine('throw new Error("Non-exhaustive pattern match");');
    this.indent--;
    this.writeLine('},');
    
    // List operations (parallel-ready)
    this.writeLine('map: (fn, list) => list.map(fn),');
    this.writeLine('filter: (fn, list) => list.filter(fn),');
    this.writeLine('fold: (fn, init, list) => list.reduce((acc, x) => fn(acc, x), init),');
    this.writeLine('sum: (list) => list.reduce((a, b) => a + b, 0),');
    this.writeLine('length: (list) => list.length,');
    this.writeLine('head: (list) => list.length > 0 ? __lw.Some(list[0]) : __lw.None,');
    this.writeLine('tail: (list) => list.length > 0 ? __lw.Some(list.slice(1)) : __lw.None,');
    
    // Utility functions
    this.writeLine('show: (x) => JSON.stringify(x),');
    this.writeLine('identity: (x) => x,');
    this.writeLine('tap: (fn, x) => { fn(x); return x; },');
    
    // Pipe helper
    this.writeLine('pipe: (value, fn) => fn(value),');
    
    this.indent--;
    this.writeLine('};');
    this.writeLine('');
    
    // Expose built-ins
    this.writeLine('const { Ok, Error, Some, None } = __lw;');
    this.writeLine('const { map, filter, fold, sum, length, head, tail, show, identity, tap } = __lw;');
    this.writeLine('');
  }

  private emitModule(module: ast.Module): void {
    this.writeLine(`// Module: ${module.name.name}`);
    this.writeLine(`const ${module.name.name} = (() => {`);
    this.indent++;
    
    const exports: string[] = [];
    
    for (const stmt of module.body) {
      if (stmt.kind === 'LetStatement' && !stmt.isPrivate) {
        exports.push(stmt.name.name);
      }
      this.emitStatement(stmt);
    }
    
    // Return exports
    this.writeLine(`return { ${exports.join(', ')} };`);
    
    this.indent--;
    this.writeLine('})();');
    this.writeLine('');
  }

  private emitStatement(stmt: ast.Statement): void {
    switch (stmt.kind) {
      case 'LetStatement':
        this.emitLetStatement(stmt);
        break;
      case 'TypeDefinition':
        // Types are erased at runtime
        this.writeLine(`// type ${stmt.name.name}`);
        break;
      case 'ImportStatement':
        this.emitImportStatement(stmt);
        break;
      case 'ExpressionStatement':
        this.write(this.getIndent());
        this.emitExpression(stmt.expression);
        this.write(';\n');
        break;
    }
  }

  private emitLetStatement(stmt: ast.LetStatement): void {
    this.write(this.getIndent());
    this.write(`const ${stmt.name.name} = `);
    
    if (stmt.ambients && stmt.ambients.ambients.length > 0) {
      // Function with ambients becomes a function that takes ambients
      const ambientNames = stmt.ambients.ambients.map(a => a.name.name);
      
      if (stmt.value.kind === 'FunctionExpression') {
        // Merge ambients with function params
        this.write(`(${ambientNames.join(', ')}) => `);
        this.emitExpression(stmt.value);
      } else {
        this.write(`(${ambientNames.join(', ')}) => `);
        this.emitExpression(stmt.value);
      }
    } else {
      this.emitExpression(stmt.value);
    }
    
    this.write(';\n');
  }

  private emitImportStatement(stmt: ast.ImportStatement): void {
    if (stmt.isJs) {
      // JavaScript import
      if (stmt.imports?.isWildcard) {
        this.writeLine(`// import js { * } - all JS globals available`);
      } else if (stmt.imports) {
        const names = stmt.imports.items.map(item => {
          if (item.alias) {
            return `${item.name.name}: ${item.alias.name}`;
          }
          return item.name.name;
        });
        this.writeLine(`const { ${names.join(', ')} } = globalThis;`);
      }
    } else {
      // Lambdawg module import
      if (stmt.imports) {
        const names = stmt.imports.items.map(item => {
          if (item.alias) {
            return `${item.name.name}: ${item.alias.name}`;
          }
          return item.name.name;
        });
        this.writeLine(`const { ${names.join(', ')} } = ${stmt.moduleName.name};`);
      }
      // Qualified import is already available via module name
    }
  }

  private emitExpression(expr: ast.Expression): void {
    switch (expr.kind) {
      case 'Literal':
        this.emitLiteral(expr);
        break;
      case 'Identifier':
        this.write(this.sanitizeIdentifier(expr.name));
        break;
      case 'ListExpression':
        this.emitListExpression(expr);
        break;
      case 'RecordExpression':
        this.emitRecordExpression(expr);
        break;
      case 'FunctionExpression':
        this.emitFunctionExpression(expr);
        break;
      case 'CallExpression':
        this.emitCallExpression(expr);
        break;
      case 'MemberExpression':
        this.emitMemberExpression(expr);
        break;
      case 'IndexExpression':
        this.emitIndexExpression(expr);
        break;
      case 'UnaryExpression':
        this.emitUnaryExpression(expr);
        break;
      case 'BinaryExpression':
        this.emitBinaryExpression(expr);
        break;
      case 'PipelineExpression':
        this.emitPipelineExpression(expr);
        break;
      case 'IfExpression':
        this.emitIfExpression(expr);
        break;
      case 'MatchExpression':
        this.emitMatchExpression(expr);
        break;
      case 'DoExpression':
        this.emitDoExpression(expr);
        break;
      case 'DoEffectExpression':
        this.write('await ');
        this.emitExpression(expr.expression);
        break;
      case 'BlockExpression':
        this.emitBlockExpression(expr);
        break;
      case 'ProvideExpression':
        this.emitProvideExpression(expr);
        break;
      case 'PlaceholderExpression':
        this.write('__placeholder__');
        break;
      case 'SpreadExpression':
        this.write('...');
        this.emitExpression(expr.expression);
        break;
    }
  }

  private emitLiteral(lit: ast.Literal): void {
    switch (lit.type) {
      case 'int':
      case 'float':
        this.write(String(lit.value));
        break;
      case 'string':
        this.write(JSON.stringify(lit.value));
        break;
      case 'char':
        this.write(JSON.stringify(lit.value));
        break;
      case 'bool':
        this.write(lit.value ? 'true' : 'false');
        break;
      case 'unit':
        this.write('undefined');
        break;
    }
  }

  private emitListExpression(list: ast.ListExpression): void {
    this.write('[');
    for (let i = 0; i < list.elements.length; i++) {
      if (i > 0) this.write(', ');
      this.emitExpression(list.elements[i]!);
    }
    this.write(']');
  }

  private emitRecordExpression(record: ast.RecordExpression): void {
    this.write('{ ');
    
    if (record.spread) {
      this.write('...');
      this.emitExpression(record.spread);
      if (record.fields.length > 0) this.write(', ');
    }
    
    for (let i = 0; i < record.fields.length; i++) {
      if (i > 0) this.write(', ');
      const field = record.fields[i]!;
      this.write(`${field.name.name}: `);
      this.emitExpression(field.value);
    }
    
    this.write(' }');
  }

  private emitFunctionExpression(func: ast.FunctionExpression): void {
    this.write('(');
    for (let i = 0; i < func.params.length; i++) {
      if (i > 0) this.write(', ');
      this.emitPattern(func.params[i]!);
    }
    this.write(') => ');
    this.emitExpression(func.body);
  }

  private emitCallExpression(call: ast.CallExpression): void {
    // Check for partial application
    const hasPlaceholders = call.args.some(arg => arg.kind === 'PlaceholderExpression');
    
    if (hasPlaceholders) {
      // Generate a wrapper function for partial application
      const placeholderIndices: number[] = [];
      call.args.forEach((arg, i) => {
        if (arg.kind === 'PlaceholderExpression') {
          placeholderIndices.push(i);
        }
      });
      
      const params = placeholderIndices.map((_, i) => `__p${i}`);
      this.write(`((${params.join(', ')}) => `);
      this.emitExpression(call.callee);
      this.write('(');
      
      let placeholderIndex = 0;
      for (let i = 0; i < call.args.length; i++) {
        if (i > 0) this.write(', ');
        if (call.args[i]!.kind === 'PlaceholderExpression') {
          this.write(`__p${placeholderIndex++}`);
        } else {
          this.emitExpression(call.args[i]!);
        }
      }
      
      this.write('))');
    } else {
      this.emitExpression(call.callee);
      this.write('(');
      for (let i = 0; i < call.args.length; i++) {
        if (i > 0) this.write(', ');
        this.emitExpression(call.args[i]!);
      }
      this.write(')');
    }
  }

  private emitMemberExpression(member: ast.MemberExpression): void {
    this.emitExpression(member.object);
    this.write('.');
    this.write(member.property.name);
  }

  private emitIndexExpression(index: ast.IndexExpression): void {
    this.emitExpression(index.object);
    this.write('[');
    this.emitExpression(index.index);
    this.write(']');
  }

  private emitUnaryExpression(unary: ast.UnaryExpression): void {
    this.write(unary.operator);
    this.emitExpression(unary.operand);
  }

  private emitBinaryExpression(binary: ast.BinaryExpression): void {
    if (binary.operator === '?') {
      // Error propagation
      this.write('__lw.unwrap(');
      this.emitExpression(binary.left);
      this.write(')');
    } else {
      this.write('(');
      this.emitExpression(binary.left);
      this.write(` ${binary.operator} `);
      this.emitExpression(binary.right);
      this.write(')');
    }
  }

  private emitPipelineExpression(pipe: ast.PipelineExpression): void {
    // Transform |> into function call
    // left |> right becomes right(left) or __lw.pipe(left, right)
    this.write('__lw.pipe(');
    this.emitExpression(pipe.left);
    this.write(', ');
    this.emitExpression(pipe.right);
    this.write(')');
  }

  private emitIfExpression(ifExpr: ast.IfExpression): void {
    this.write('(');
    this.emitExpression(ifExpr.condition);
    this.write(' ? ');
    this.emitExpression(ifExpr.thenBranch);
    this.write(' : ');
    this.emitExpression(ifExpr.elseBranch);
    this.write(')');
  }

  private emitMatchExpression(match: ast.MatchExpression): void {
    // Generate pattern matching code
    this.write('(() => {\n');
    this.indent++;
    
    this.write(this.getIndent());
    this.write('const __subject = ');
    this.emitExpression(match.subject);
    this.write(';\n');
    
    for (const arm of match.arms) {
      this.write(this.getIndent());
      this.write('if (');
      this.emitPatternCondition(arm.pattern, '__subject');
      
      if (arm.guard) {
        this.write(' && (');
        this.emitExpression(arm.guard);
        this.write(')');
      }
      
      this.write(') {\n');
      this.indent++;
      
      this.emitPatternBindings(arm.pattern, '__subject');
      
      this.write(this.getIndent());
      this.write('return ');
      this.emitExpression(arm.body);
      this.write(';\n');
      
      this.indent--;
      this.write(this.getIndent());
      this.write('}\n');
    }
    
    this.write(this.getIndent());
    this.write('throw new Error("Non-exhaustive pattern match");\n');
    
    this.indent--;
    this.write(this.getIndent());
    this.write('})()');
  }

  private emitPatternCondition(pattern: ast.Pattern, subject: string): void {
    switch (pattern.kind) {
      case 'IdentifierPattern':
      case 'WildcardPattern':
        this.write('true');
        break;
      
      case 'LiteralPattern':
        this.write(`(${subject} === ${JSON.stringify(pattern.value)})`);
        break;
      
      case 'ListPattern':
        if (pattern.elements.length === 0 && !pattern.rest) {
          this.write(`(${subject}.length === 0)`);
        } else if (pattern.rest) {
          this.write(`(${subject}.length >= ${pattern.elements.length})`);
        } else {
          this.write(`(${subject}.length === ${pattern.elements.length})`);
        }
        break;
      
      case 'RecordPattern':
        this.write('true'); // Records always match structurally
        break;
      
      case 'ConstructorPattern':
        this.write(`(${subject}.__tag === "${pattern.name.name}")`);
        break;
      
      case 'RestPattern':
        this.write('true');
        break;
    }
  }

  private emitPatternBindings(pattern: ast.Pattern, subject: string): void {
    switch (pattern.kind) {
      case 'IdentifierPattern':
        this.writeLine(`const ${pattern.name} = ${subject};`);
        break;
      
      case 'ListPattern':
        pattern.elements.forEach((elem, i) => {
          this.emitPatternBindings(elem, `${subject}[${i}]`);
        });
        if (pattern.rest) {
          this.writeLine(`const ${pattern.rest.name} = ${subject}.slice(${pattern.elements.length});`);
        }
        break;
      
      case 'RecordPattern':
        for (const field of pattern.fields) {
          if (field.pattern) {
            this.emitPatternBindings(field.pattern, `${subject}.${field.name.name}`);
          } else {
            this.writeLine(`const ${field.name.name} = ${subject}.${field.name.name};`);
          }
        }
        break;
      
      case 'ConstructorPattern':
        if (pattern.fields && pattern.fields.kind === 'RecordPattern') {
          this.emitPatternBindings(pattern.fields, `${subject}`);
        } else if (pattern.fields) {
          this.emitPatternBindings(pattern.fields, `${subject}.value`);
        }
        break;
    }
  }

  private emitDoExpression(doExpr: ast.DoExpression): void {
    this.write('(async () => {\n');
    this.indent++;
    
    for (let i = 0; i < doExpr.body.length; i++) {
      const stmt = doExpr.body[i]!;
      const isLast = i === doExpr.body.length - 1;
      
      switch (stmt.kind) {
        case 'DoLetStatement':
          this.write(this.getIndent());
          this.write('const ');
          this.emitPattern(stmt.pattern);
          this.write(' = ');
          if (stmt.isEffect) {
            this.write('await ');
          }
          this.emitExpression(stmt.value);
          this.write(';\n');
          break;
        
        case 'DoEffectStatement':
          this.write(this.getIndent());
          if (isLast) this.write('return ');
          this.write('await ');
          this.emitExpression(stmt.expression);
          this.write(';\n');
          break;
        
        case 'DoExprStatement':
          this.write(this.getIndent());
          if (isLast) this.write('return ');
          this.emitExpression(stmt.expression);
          this.write(';\n');
          break;
      }
    }
    
    this.indent--;
    this.write(this.getIndent());
    this.write('})()');
  }

  private emitBlockExpression(block: ast.BlockExpression): void {
    this.write('(() => {\n');
    this.indent++;
    
    for (const stmt of block.statements) {
      this.emitStatement(stmt);
    }
    
    if (block.result) {
      this.write(this.getIndent());
      this.write('return ');
      this.emitExpression(block.result);
      this.write(';\n');
    }
    
    this.indent--;
    this.write(this.getIndent());
    this.write('})()');
  }

  private emitProvideExpression(provide: ast.ProvideExpression): void {
    this.write('(() => {\n');
    this.indent++;
    
    for (const provision of provide.provisions) {
      this.write(this.getIndent());
      this.write(`const ${provision.name.name} = `);
      this.emitExpression(provision.value);
      this.write(';\n');
    }
    
    this.write(this.getIndent());
    this.write('return ');
    this.emitExpression(provide.body);
    this.write(';\n');
    
    this.indent--;
    this.write(this.getIndent());
    this.write('})()');
  }

  private emitPattern(pattern: ast.Pattern): void {
    switch (pattern.kind) {
      case 'IdentifierPattern':
        this.write(pattern.name);
        break;
      
      case 'WildcardPattern':
        this.write('_');
        break;
      
      case 'ListPattern':
        this.write('[');
        for (let i = 0; i < pattern.elements.length; i++) {
          if (i > 0) this.write(', ');
          this.emitPattern(pattern.elements[i]!);
        }
        if (pattern.rest) {
          if (pattern.elements.length > 0) this.write(', ');
          this.write('...');
          this.write(pattern.rest.name);
        }
        this.write(']');
        break;
      
      case 'RecordPattern':
        this.write('{ ');
        for (let i = 0; i < pattern.fields.length; i++) {
          if (i > 0) this.write(', ');
          const field = pattern.fields[i]!;
          this.write(field.name.name);
          if (field.pattern) {
            this.write(': ');
            this.emitPattern(field.pattern);
          }
        }
        if (pattern.rest) {
          if (pattern.fields.length > 0) this.write(', ');
          this.write('...rest');
        }
        this.write(' }');
        break;
      
      default:
        this.write('_');
    }
  }

  // Helpers

  private sanitizeIdentifier(name: string): string {
    // Handle reserved words
    const reserved = ['var', 'let', 'const', 'function', 'class', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'throw', 'try', 'catch', 'finally', 'new', 'delete', 'typeof', 'void', 'this', 'super', 'import', 'export', 'default', 'from', 'as', 'async', 'await', 'yield', 'static', 'get', 'set'];
    
    if (reserved.includes(name)) {
      return `_${name}`;
    }
    return name;
  }

  private write(text: string): void {
    this.output.push(text);
  }

  private writeLine(text: string): void {
    this.output.push(this.getIndent() + text + '\n');
  }

  private getIndent(): string {
    return '  '.repeat(this.indent);
  }
}

export function emit(program: ast.Program, options?: EmitOptions): EmitResult {
  const emitter = new Emitter(options);
  return emitter.emit(program);
}

