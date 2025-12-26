/**
 * Type checker for Lambdawg - implements Hindley-Milner type inference
 */

import { Span } from '../source.js';
import { CompilerError, createError, ErrorCodes } from '../errors.js';
import * as ast from '../parser/ast.js';
import {
  Type,
  TypeVar,
  TypeScheme,
  TYPE_INT,
  TYPE_FLOAT,
  TYPE_STRING,
  TYPE_CHAR,
  TYPE_BOOL,
  TYPE_UNIT,
  freshTypeVar,
  createFuncType,
  createRecordType,
  createListType,
  createTypeApp,
  prune,
  occursIn,
  typeToString,
  instantiate,
  generalize,
  freeTypeVars,
  createScheme,
  resetTypeVarCounter,
} from './types.js';

// ============================================================================
// Type Environment
// ============================================================================

export class TypeEnv {
  private bindings: Map<string, TypeScheme>;
  private parent: TypeEnv | null;

  constructor(parent: TypeEnv | null = null) {
    this.bindings = new Map();
    this.parent = parent;
  }

  define(name: string, scheme: TypeScheme): void {
    this.bindings.set(name, scheme);
  }

  lookup(name: string): TypeScheme | undefined {
    const scheme = this.bindings.get(name);
    if (scheme) return scheme;
    if (this.parent) return this.parent.lookup(name);
    return undefined;
  }

  extend(): TypeEnv {
    return new TypeEnv(this);
  }

  /**
   * Get all free type variables in the environment
   */
  freeTypeVars(): Set<number> {
    const vars = new Set<number>();
    for (const scheme of this.bindings.values()) {
      for (const v of freeTypeVars(scheme.type)) {
        if (!scheme.typeVars.includes(v)) {
          vars.add(v);
        }
      }
    }
    if (this.parent) {
      for (const v of this.parent.freeTypeVars()) {
        vars.add(v);
      }
    }
    return vars;
  }
}

// ============================================================================
// Type Checker
// ============================================================================

export interface TypeCheckResult {
  types: Map<ast.AstNode, Type>;
  errors: CompilerError[];
}

export class TypeChecker {
  private errors: CompilerError[] = [];
  private types: Map<ast.AstNode, Type> = new Map();
  private env: TypeEnv;

  constructor() {
    this.env = this.createGlobalEnv();
  }

  check(program: ast.Program): TypeCheckResult {
    resetTypeVarCounter();
    
    for (const stmt of program.statements) {
      this.checkStatement(stmt, this.env);
    }

    for (const module of program.modules) {
      this.checkModule(module);
    }

    return {
      types: this.types,
      errors: this.errors,
    };
  }

  private createGlobalEnv(): TypeEnv {
    const env = new TypeEnv();

    // Built-in functions
    // map: ((a) -> b, List a) -> List b
    const a = freshTypeVar();
    const b = freshTypeVar();
    env.define('map', createScheme(
      [a.id, b.id],
      createFuncType(
        [createFuncType([a], b), createListType(a)],
        createListType(b)
      )
    ));

    // filter: ((a) -> Bool, List a) -> List a
    const a2 = freshTypeVar();
    env.define('filter', createScheme(
      [a2.id],
      createFuncType(
        [createFuncType([a2], TYPE_BOOL), createListType(a2)],
        createListType(a2)
      )
    ));

    // fold: ((b, a) -> b, b, List a) -> b
    const a3 = freshTypeVar();
    const b3 = freshTypeVar();
    env.define('fold', createScheme(
      [a3.id, b3.id],
      createFuncType(
        [createFuncType([b3, a3], b3), b3, createListType(a3)],
        b3
      )
    ));

    // sum: List Int -> Int
    env.define('sum', createScheme(
      [],
      createFuncType([createListType(TYPE_INT)], TYPE_INT)
    ));

    // length: List a -> Int
    const a4 = freshTypeVar();
    env.define('length', createScheme(
      [a4.id],
      createFuncType([createListType(a4)], TYPE_INT)
    ));

    // show: a -> String
    const a5 = freshTypeVar();
    env.define('show', createScheme(
      [a5.id],
      createFuncType([a5], TYPE_STRING)
    ));

    // identity: a -> a
    const a6 = freshTypeVar();
    env.define('identity', createScheme(
      [a6.id],
      createFuncType([a6], a6)
    ));

    // head: List a -> Option a
    const a7 = freshTypeVar();
    env.define('head', createScheme(
      [a7.id],
      createFuncType([createListType(a7)], createTypeApp('Option', [a7]))
    ));

    // tail: List a -> Option (List a)
    const a8 = freshTypeVar();
    env.define('tail', createScheme(
      [a8.id],
      createFuncType([createListType(a8)], createTypeApp('Option', [createListType(a8)]))
    ));

    // tap: ((a) -> Unit, a) -> a
    const a9 = freshTypeVar();
    env.define('tap', createScheme(
      [a9.id],
      createFuncType(
        [createFuncType([a9], TYPE_UNIT), a9],
        a9
      )
    ));

    return env;
  }

  private checkModule(module: ast.Module): void {
    const moduleEnv = this.env.extend();

    for (const stmt of module.body) {
      this.checkStatement(stmt, moduleEnv);
    }
  }

  private checkStatement(stmt: ast.Statement, env: TypeEnv): void {
    switch (stmt.kind) {
      case 'LetStatement':
        this.checkLetStatement(stmt, env);
        break;
      case 'TypeDefinition':
        this.checkTypeDefinition(stmt, env);
        break;
      case 'ImportStatement':
        // Imports are handled during resolution phase
        break;
      case 'ExpressionStatement':
        this.inferExpr(stmt.expression, env);
        break;
    }
  }

  private checkLetStatement(stmt: ast.LetStatement, env: TypeEnv): void {
    // If there's a type annotation, use it
    let declaredType: Type | null = null;
    if (stmt.typeAnnotation) {
      declaredType = this.typeExprToType(stmt.typeAnnotation);
    }

    // Infer the type of the value
    const inferredType = this.inferExpr(stmt.value, env);

    // Unify with declared type if present
    if (declaredType) {
      this.unify(declaredType, inferredType, stmt.span);
    }

    // Generalize and add to environment
    const scheme = generalize(inferredType, env.freeTypeVars());
    env.define(stmt.name.name, scheme);
    this.types.set(stmt, inferredType);
  }

  private checkTypeDefinition(stmt: ast.TypeDefinition, env: TypeEnv): void {
    // For now, just register the type name
    // Full ADT checking would require more infrastructure
  }

  // ===========================================================================
  // Type Inference
  // ===========================================================================

  private inferExpr(expr: ast.Expression, env: TypeEnv): Type {
    let type: Type;

    switch (expr.kind) {
      case 'Literal':
        type = this.inferLiteral(expr);
        break;
      
      case 'Identifier':
        type = this.inferIdentifier(expr, env);
        break;
      
      case 'ListExpression':
        type = this.inferList(expr, env);
        break;
      
      case 'RecordExpression':
        type = this.inferRecord(expr, env);
        break;
      
      case 'FunctionExpression':
        type = this.inferFunction(expr, env);
        break;
      
      case 'CallExpression':
        type = this.inferCall(expr, env);
        break;
      
      case 'MemberExpression':
        type = this.inferMember(expr, env);
        break;
      
      case 'IndexExpression':
        type = this.inferIndex(expr, env);
        break;
      
      case 'UnaryExpression':
        type = this.inferUnary(expr, env);
        break;
      
      case 'BinaryExpression':
        type = this.inferBinary(expr, env);
        break;
      
      case 'PipelineExpression':
        type = this.inferPipeline(expr, env);
        break;
      
      case 'IfExpression':
        type = this.inferIf(expr, env);
        break;
      
      case 'MatchExpression':
        type = this.inferMatch(expr, env);
        break;
      
      case 'DoExpression':
        type = this.inferDo(expr, env);
        break;
      
      case 'DoEffectExpression':
        type = this.inferExpr(expr.expression, env);
        break;
      
      case 'BlockExpression':
        type = this.inferBlock(expr, env);
        break;
      
      case 'ProvideExpression':
        type = this.inferProvide(expr, env);
        break;
      
      case 'PlaceholderExpression':
        type = freshTypeVar();
        break;
      
      case 'SpreadExpression':
        type = this.inferExpr(expr.expression, env);
        break;
      
      default:
        type = freshTypeVar();
    }

    this.types.set(expr, type);
    return type;
  }

  private inferLiteral(lit: ast.Literal): Type {
    switch (lit.type) {
      case 'int': return TYPE_INT;
      case 'float': return TYPE_FLOAT;
      case 'string': return TYPE_STRING;
      case 'char': return TYPE_CHAR;
      case 'bool': return TYPE_BOOL;
      case 'unit': return TYPE_UNIT;
    }
  }

  private inferIdentifier(ident: ast.Identifier, env: TypeEnv): Type {
    const scheme = env.lookup(ident.name);
    if (!scheme) {
      this.error(
        ErrorCodes.UNDEFINED_VARIABLE,
        `Undefined variable: ${ident.name}`,
        ident.span
      );
      return freshTypeVar();
    }
    return instantiate(scheme);
  }

  private inferList(list: ast.ListExpression, env: TypeEnv): Type {
    if (list.elements.length === 0) {
      return createListType(freshTypeVar());
    }

    const elementType = this.inferExpr(list.elements[0]!, env);
    for (let i = 1; i < list.elements.length; i++) {
      const t = this.inferExpr(list.elements[i]!, env);
      this.unify(elementType, t, list.elements[i]!.span);
    }

    return createListType(elementType);
  }

  private inferRecord(record: ast.RecordExpression, env: TypeEnv): Type {
    const fields = new Map<string, Type>();

    // Handle spread first
    if (record.spread) {
      const spreadType = prune(this.inferExpr(record.spread, env));
      if (spreadType.kind === 'TypeRecord') {
        for (const [name, type] of spreadType.fields) {
          fields.set(name, type);
        }
      }
    }

    // Add explicit fields (may override spread)
    for (const field of record.fields) {
      const fieldType = this.inferExpr(field.value, env);
      fields.set(field.name.name, fieldType);
    }

    return createRecordType(fields);
  }

  private inferFunction(func: ast.FunctionExpression, env: TypeEnv): Type {
    const funcEnv = env.extend();
    const paramTypes: Type[] = [];

    for (const param of func.params) {
      const paramType = freshTypeVar();
      paramTypes.push(paramType);
      this.bindPattern(param, paramType, funcEnv);
    }

    const returnType = this.inferExpr(func.body, funcEnv);
    return createFuncType(paramTypes, returnType);
  }

  private inferCall(call: ast.CallExpression, env: TypeEnv): Type {
    const calleeType = prune(this.inferExpr(call.callee, env));
    const argTypes = call.args.map(arg => this.inferExpr(arg, env));
    const returnType = freshTypeVar();

    // Handle partial application (placeholder args)
    const hasPlaceholders = call.args.some(arg => arg.kind === 'PlaceholderExpression');
    
    if (hasPlaceholders) {
      // Create a function type for the remaining arguments
      const remainingParams: Type[] = [];
      const filledArgs: Type[] = [];
      
      for (let i = 0; i < call.args.length; i++) {
        if (call.args[i]!.kind === 'PlaceholderExpression') {
          const paramType = freshTypeVar();
          remainingParams.push(paramType);
          filledArgs.push(paramType);
        } else {
          filledArgs.push(argTypes[i]!);
        }
      }

      const expectedFunc = createFuncType(filledArgs, returnType);
      this.unify(calleeType, expectedFunc, call.span);
      
      return createFuncType(remainingParams, returnType);
    }

    const expectedFunc = createFuncType(argTypes, returnType);
    this.unify(calleeType, expectedFunc, call.span);

    return returnType;
  }

  private inferMember(member: ast.MemberExpression, env: TypeEnv): Type {
    const objectType = prune(this.inferExpr(member.object, env));
    const fieldName = member.property.name;

    if (objectType.kind === 'TypeRecord') {
      const fieldType = objectType.fields.get(fieldName);
      if (fieldType) {
        return fieldType;
      }
      if (!objectType.isOpen) {
        this.error(
          ErrorCodes.MISSING_FIELD,
          `Record does not have field: ${fieldName}`,
          member.span
        );
      }
    }

    // For open records or type variables, return a fresh type variable
    const resultType = freshTypeVar();
    
    // If it's a type variable, constrain it to have this field
    if (objectType.kind === 'TypeVar') {
      const recordType = createRecordType(new Map([[fieldName, resultType]]), true);
      this.unify(objectType, recordType, member.span);
    }

    return resultType;
  }

  private inferIndex(index: ast.IndexExpression, env: TypeEnv): Type {
    const objectType = prune(this.inferExpr(index.object, env));
    const indexType = this.inferExpr(index.index, env);

    // Index must be Int
    this.unify(indexType, TYPE_INT, index.index.span);

    // Object should be a List
    const elementType = freshTypeVar();
    this.unify(objectType, createListType(elementType), index.object.span);

    return elementType;
  }

  private inferUnary(unary: ast.UnaryExpression, env: TypeEnv): Type {
    const operandType = this.inferExpr(unary.operand, env);

    switch (unary.operator) {
      case '!':
        this.unify(operandType, TYPE_BOOL, unary.operand.span);
        return TYPE_BOOL;
      case '-':
        // Could be Int or Float
        return operandType;
    }
  }

  private inferBinary(binary: ast.BinaryExpression, env: TypeEnv): Type {
    const leftType = this.inferExpr(binary.left, env);
    const rightType = this.inferExpr(binary.right, env);

    switch (binary.operator) {
      case '+':
      case '-':
      case '*':
      case '/':
      case '%':
        this.unify(leftType, rightType, binary.span);
        return leftType;
      
      case '==':
      case '!=':
        this.unify(leftType, rightType, binary.span);
        return TYPE_BOOL;
      
      case '<':
      case '>':
      case '<=':
      case '>=':
        this.unify(leftType, rightType, binary.span);
        return TYPE_BOOL;
      
      case '&&':
      case '||':
        this.unify(leftType, TYPE_BOOL, binary.left.span);
        this.unify(rightType, TYPE_BOOL, binary.right.span);
        return TYPE_BOOL;
      
      case '?':
        // Error propagation - left should be Result a e
        // Returns a, or propagates e
        return leftType; // Simplified for now
    }

    return freshTypeVar();
  }

  private inferPipeline(pipe: ast.PipelineExpression, env: TypeEnv): Type {
    const leftType = this.inferExpr(pipe.left, env);
    const rightType = prune(this.inferExpr(pipe.right, env));

    // Right side should be a function that takes left as last argument
    const returnType = freshTypeVar();
    
    if (rightType.kind === 'TypeFunc') {
      // Pipeline passes left as the last argument
      if (rightType.params.length > 0) {
        const lastParamType = rightType.params[rightType.params.length - 1]!;
        this.unify(lastParamType, leftType, pipe.span);
        return rightType.returnType;
      }
    }

    // Create expected function type
    const expectedFunc = createFuncType([leftType], returnType);
    this.unify(rightType, expectedFunc, pipe.span);

    return returnType;
  }

  private inferIf(ifExpr: ast.IfExpression, env: TypeEnv): Type {
    const condType = this.inferExpr(ifExpr.condition, env);
    this.unify(condType, TYPE_BOOL, ifExpr.condition.span);

    const thenType = this.inferExpr(ifExpr.thenBranch, env);
    const elseType = this.inferExpr(ifExpr.elseBranch, env);
    this.unify(thenType, elseType, ifExpr.span);

    return thenType;
  }

  private inferMatch(match: ast.MatchExpression, env: TypeEnv): Type {
    const subjectType = this.inferExpr(match.subject, env);
    let resultType: Type | null = null;

    for (const arm of match.arms) {
      const armEnv = env.extend();
      this.checkPattern(arm.pattern, subjectType, armEnv);

      if (arm.guard) {
        const guardType = this.inferExpr(arm.guard, armEnv);
        this.unify(guardType, TYPE_BOOL, arm.guard.span);
      }

      const bodyType = this.inferExpr(arm.body, armEnv);
      
      if (resultType === null) {
        resultType = bodyType;
      } else {
        this.unify(resultType, bodyType, arm.body.span);
      }
    }

    return resultType ?? freshTypeVar();
  }

  private inferDo(doExpr: ast.DoExpression, env: TypeEnv): Type {
    const doEnv = env.extend();
    let lastType: Type = TYPE_UNIT;

    for (const stmt of doExpr.body) {
      switch (stmt.kind) {
        case 'DoLetStatement': {
          const valueType = this.inferExpr(stmt.value, doEnv);
          this.bindPattern(stmt.pattern, valueType, doEnv);
          lastType = valueType;
          break;
        }
        case 'DoEffectStatement':
          lastType = this.inferExpr(stmt.expression, doEnv);
          break;
        case 'DoExprStatement':
          lastType = this.inferExpr(stmt.expression, doEnv);
          break;
      }
    }

    return lastType;
  }

  private inferBlock(block: ast.BlockExpression, env: TypeEnv): Type {
    const blockEnv = env.extend();

    for (const stmt of block.statements) {
      this.checkStatement(stmt, blockEnv);
    }

    if (block.result) {
      return this.inferExpr(block.result, blockEnv);
    }

    return TYPE_UNIT;
  }

  private inferProvide(provide: ast.ProvideExpression, env: TypeEnv): Type {
    const provideEnv = env.extend();

    for (const provision of provide.provisions) {
      const valueType = this.inferExpr(provision.value, env);
      provideEnv.define(provision.name.name, createScheme([], valueType));
    }

    return this.inferExpr(provide.body, provideEnv);
  }

  // ===========================================================================
  // Pattern Checking
  // ===========================================================================

  private checkPattern(pattern: ast.Pattern, expectedType: Type, env: TypeEnv): void {
    switch (pattern.kind) {
      case 'IdentifierPattern':
        env.define(pattern.name, createScheme([], expectedType));
        break;
      
      case 'LiteralPattern': {
        const litType = this.literalPatternType(pattern);
        this.unify(expectedType, litType, pattern.span);
        break;
      }
      
      case 'WildcardPattern':
        // Matches anything
        break;
      
      case 'ListPattern': {
        const elementType = freshTypeVar();
        this.unify(expectedType, createListType(elementType), pattern.span);
        for (const elem of pattern.elements) {
          this.checkPattern(elem, elementType, env);
        }
        if (pattern.rest) {
          env.define(pattern.rest.name, createScheme([], createListType(elementType)));
        }
        break;
      }
      
      case 'RecordPattern': {
        for (const field of pattern.fields) {
          const fieldType = freshTypeVar();
          if (field.pattern) {
            this.checkPattern(field.pattern, fieldType, env);
          } else {
            env.define(field.name.name, createScheme([], fieldType));
          }
        }
        break;
      }
      
      case 'ConstructorPattern':
        // Would need to look up the constructor type
        break;
      
      case 'RestPattern':
        if (pattern.name) {
          env.define(pattern.name.name, createScheme([], expectedType));
        }
        break;
    }
  }

  private bindPattern(pattern: ast.Pattern, type: Type, env: TypeEnv): void {
    this.checkPattern(pattern, type, env);
  }

  private literalPatternType(pattern: ast.LiteralPattern): Type {
    const value = pattern.value;
    if (typeof value === 'number') {
      return Number.isInteger(value) ? TYPE_INT : TYPE_FLOAT;
    }
    if (typeof value === 'string') {
      return TYPE_STRING;
    }
    if (typeof value === 'boolean') {
      return TYPE_BOOL;
    }
    return freshTypeVar();
  }

  // ===========================================================================
  // Type Expression to Type
  // ===========================================================================

  private typeExprToType(typeExpr: ast.TypeExpression): Type {
    switch (typeExpr.kind) {
      case 'TypeIdentifier':
        return this.resolveTypeName(typeExpr.name);
      
      case 'FunctionType':
        return createFuncType(
          typeExpr.params.map(p => this.typeExprToType(p)),
          this.typeExprToType(typeExpr.returnType)
        );
      
      case 'RecordType': {
        const fields = new Map<string, Type>();
        for (const field of typeExpr.fields.fields) {
          fields.set(field.name.name, this.typeExprToType(field.type));
        }
        return createRecordType(fields);
      }
      
      case 'ListType':
        return createListType(this.typeExprToType(typeExpr.elementType));
      
      case 'GenericType':
        return createTypeApp(
          typeExpr.name.name,
          typeExpr.args.map(arg => this.typeExprToType(arg))
        );
      
      case 'ParenthesizedType':
        return this.typeExprToType(typeExpr.type);
    }
  }

  private resolveTypeName(name: string): Type {
    switch (name) {
      case 'Int': return TYPE_INT;
      case 'Float': return TYPE_FLOAT;
      case 'String': return TYPE_STRING;
      case 'Char': return TYPE_CHAR;
      case 'Bool': return TYPE_BOOL;
      case 'Unit': return TYPE_UNIT;
      default:
        // Could be a type parameter or user-defined type
        return freshTypeVar();
    }
  }

  // ===========================================================================
  // Unification
  // ===========================================================================

  private unify(a: Type, b: Type, span: Span): boolean {
    a = prune(a);
    b = prune(b);

    if (a.kind === 'TypeVar') {
      if (a !== b) {
        if (occursIn(a, b)) {
          this.error(
            ErrorCodes.INFINITE_TYPE,
            `Infinite type: ${typeToString(a)} = ${typeToString(b)}`,
            span
          );
          return false;
        }
        a.instance = b;
      }
      return true;
    }

    if (b.kind === 'TypeVar') {
      return this.unify(b, a, span);
    }

    if (a.kind === 'TypeConst' && b.kind === 'TypeConst') {
      if (a.name !== b.name) {
        this.error(
          ErrorCodes.TYPE_MISMATCH,
          `Type mismatch: expected ${a.name}, got ${b.name}`,
          span
        );
        return false;
      }
      return true;
    }

    if (a.kind === 'TypeFunc' && b.kind === 'TypeFunc') {
      if (a.params.length !== b.params.length) {
        this.error(
          ErrorCodes.WRONG_ARITY,
          `Function arity mismatch: expected ${a.params.length} args, got ${b.params.length}`,
          span
        );
        return false;
      }
      for (let i = 0; i < a.params.length; i++) {
        if (!this.unify(a.params[i]!, b.params[i]!, span)) return false;
      }
      return this.unify(a.returnType, b.returnType, span);
    }

    if (a.kind === 'TypeRecord' && b.kind === 'TypeRecord') {
      // Unify common fields
      for (const [name, aType] of a.fields) {
        const bType = b.fields.get(name);
        if (bType) {
          if (!this.unify(aType, bType, span)) return false;
        } else if (!b.isOpen) {
          this.error(
            ErrorCodes.MISSING_FIELD,
            `Missing field: ${name}`,
            span
          );
          return false;
        }
      }
      return true;
    }

    if (a.kind === 'TypeList' && b.kind === 'TypeList') {
      return this.unify(a.elementType, b.elementType, span);
    }

    if (a.kind === 'TypeApp' && b.kind === 'TypeApp') {
      if (a.constructor !== b.constructor) {
        this.error(
          ErrorCodes.TYPE_MISMATCH,
          `Type mismatch: ${a.constructor} vs ${b.constructor}`,
          span
        );
        return false;
      }
      if (a.args.length !== b.args.length) {
        return false;
      }
      for (let i = 0; i < a.args.length; i++) {
        if (!this.unify(a.args[i]!, b.args[i]!, span)) return false;
      }
      return true;
    }

    this.error(
      ErrorCodes.TYPE_MISMATCH,
      `Type mismatch: ${typeToString(a)} vs ${typeToString(b)}`,
      span
    );
    return false;
  }

  // ===========================================================================
  // Error Reporting
  // ===========================================================================

  private error(code: string, message: string, span: Span): void {
    this.errors.push(createError(code, message, span));
  }
}

export function typeCheck(program: ast.Program): TypeCheckResult {
  const checker = new TypeChecker();
  return checker.check(program);
}

