/**
 * Abstract Syntax Tree node definitions for Lambdawg
 */

import { Span } from '../source.js';

// Base node interface
export interface AstNode {
  kind: string;
  span: Span;
}

// ============================================================================
// Program & Module
// ============================================================================

export interface Program extends AstNode {
  kind: 'Program';
  modules: Module[];
  statements: Statement[];
}

export interface Module extends AstNode {
  kind: 'Module';
  name: Identifier;
  providing?: ProvisionList;
  body: Statement[];
}

export interface ProvisionList extends AstNode {
  kind: 'ProvisionList';
  provisions: Provision[];
}

export interface Provision extends AstNode {
  kind: 'Provision';
  name: Identifier;
  value: Expression;
}

// ============================================================================
// Statements
// ============================================================================

export type Statement = 
  | LetStatement
  | TypeDefinition
  | ImportStatement
  | ExpressionStatement;

export interface LetStatement extends AstNode {
  kind: 'LetStatement';
  isPrivate: boolean;
  name: Identifier;
  typeAnnotation?: TypeExpression;
  ambients?: AmbientList;
  value: Expression;
}

export interface TypeDefinition extends AstNode {
  kind: 'TypeDefinition';
  name: Identifier;
  typeParams: Identifier[];
  body: TypeBody;
}

export type TypeBody = TypeAlias | SumType;

export interface TypeAlias extends AstNode {
  kind: 'TypeAlias';
  type: TypeExpression;
}

export interface SumType extends AstNode {
  kind: 'SumType';
  variants: Variant[];
}

export interface Variant extends AstNode {
  kind: 'Variant';
  name: Identifier;
  fields?: RecordTypeFields;
}

export interface ImportStatement extends AstNode {
  kind: 'ImportStatement';
  isJs: boolean;
  moduleName: Identifier;
  imports?: ImportList;
}

export interface ImportList extends AstNode {
  kind: 'ImportList';
  items: ImportItem[];
  isWildcard: boolean;
}

export interface ImportItem extends AstNode {
  kind: 'ImportItem';
  name: Identifier;
  alias?: Identifier;
}

export interface ExpressionStatement extends AstNode {
  kind: 'ExpressionStatement';
  expression: Expression;
}

// ============================================================================
// Expressions
// ============================================================================

export type Expression =
  | Identifier
  | Literal
  | ListExpression
  | RecordExpression
  | FunctionExpression
  | CallExpression
  | MemberExpression
  | IndexExpression
  | UnaryExpression
  | BinaryExpression
  | PipelineExpression
  | IfExpression
  | MatchExpression
  | DoExpression
  | DoEffectExpression
  | ProvideExpression
  | BlockExpression
  | PlaceholderExpression
  | SpreadExpression;

export interface Identifier extends AstNode {
  kind: 'Identifier';
  name: string;
}

export interface Literal extends AstNode {
  kind: 'Literal';
  type: 'int' | 'float' | 'string' | 'char' | 'bool' | 'unit';
  value: number | string | boolean | null;
}

export interface ListExpression extends AstNode {
  kind: 'ListExpression';
  elements: Expression[];
}

export interface RecordExpression extends AstNode {
  kind: 'RecordExpression';
  fields: RecordField[];
  spread?: Expression;
}

export interface RecordField extends AstNode {
  kind: 'RecordField';
  name: Identifier;
  value: Expression;
}

export interface FunctionExpression extends AstNode {
  kind: 'FunctionExpression';
  params: Pattern[];
  body: Expression;
}

export interface CallExpression extends AstNode {
  kind: 'CallExpression';
  callee: Expression;
  args: Expression[];
}

export interface MemberExpression extends AstNode {
  kind: 'MemberExpression';
  object: Expression;
  property: Identifier;
}

export interface IndexExpression extends AstNode {
  kind: 'IndexExpression';
  object: Expression;
  index: Expression;
}

export interface UnaryExpression extends AstNode {
  kind: 'UnaryExpression';
  operator: UnaryOperator;
  operand: Expression;
}

export type UnaryOperator = '!' | '-';

export interface BinaryExpression extends AstNode {
  kind: 'BinaryExpression';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

export type BinaryOperator = 
  | '+' | '-' | '*' | '/' | '%'
  | '==' | '!=' | '<' | '>' | '<=' | '>='
  | '&&' | '||'
  | '?';

export interface PipelineExpression extends AstNode {
  kind: 'PipelineExpression';
  left: Expression;
  right: Expression;
  isSeq: boolean;
  parallelHint?: ParallelHint;
}

export interface ParallelHint extends AstNode {
  kind: 'ParallelHint';
  options: Record<string, Expression>;
}

export interface IfExpression extends AstNode {
  kind: 'IfExpression';
  condition: Expression;
  thenBranch: Expression;
  elseBranch: Expression;
}

export interface MatchExpression extends AstNode {
  kind: 'MatchExpression';
  subject: Expression;
  arms: MatchArm[];
}

export interface MatchArm extends AstNode {
  kind: 'MatchArm';
  pattern: Pattern;
  guard?: Expression;
  body: Expression;
}

export interface DoExpression extends AstNode {
  kind: 'DoExpression';
  isResultContext: boolean; // do? vs do
  body: DoStatement[];
}

export type DoStatement = 
  | DoLetStatement
  | DoEffectStatement
  | DoExprStatement;

export interface DoLetStatement extends AstNode {
  kind: 'DoLetStatement';
  pattern: Pattern;
  isEffect: boolean; // let x = vs let x = do!
  value: Expression;
}

export interface DoEffectStatement extends AstNode {
  kind: 'DoEffectStatement';
  expression: Expression;
}

export interface DoExprStatement extends AstNode {
  kind: 'DoExprStatement';
  expression: Expression;
}

export interface DoEffectExpression extends AstNode {
  kind: 'DoEffectExpression';
  expression: Expression;
}

export interface ProvideExpression extends AstNode {
  kind: 'ProvideExpression';
  provisions: Provision[];
  body: Expression;
}

export interface BlockExpression extends AstNode {
  kind: 'BlockExpression';
  statements: Statement[];
  result?: Expression;
}

export interface PlaceholderExpression extends AstNode {
  kind: 'PlaceholderExpression';
}

export interface SpreadExpression extends AstNode {
  kind: 'SpreadExpression';
  expression: Expression;
}

// ============================================================================
// Patterns
// ============================================================================

export type Pattern =
  | IdentifierPattern
  | LiteralPattern
  | WildcardPattern
  | ListPattern
  | RecordPattern
  | ConstructorPattern
  | RestPattern;

export interface IdentifierPattern extends AstNode {
  kind: 'IdentifierPattern';
  name: string;
}

export interface LiteralPattern extends AstNode {
  kind: 'LiteralPattern';
  value: number | string | boolean;
}

export interface WildcardPattern extends AstNode {
  kind: 'WildcardPattern';
}

export interface ListPattern extends AstNode {
  kind: 'ListPattern';
  elements: Pattern[];
  rest?: IdentifierPattern;
}

export interface RecordPattern extends AstNode {
  kind: 'RecordPattern';
  fields: RecordPatternField[];
  rest?: boolean;
}

export interface RecordPatternField extends AstNode {
  kind: 'RecordPatternField';
  name: Identifier;
  pattern?: Pattern;
}

export interface ConstructorPattern extends AstNode {
  kind: 'ConstructorPattern';
  name: Identifier;
  fields?: RecordPattern | Pattern;
}

export interface RestPattern extends AstNode {
  kind: 'RestPattern';
  name?: Identifier;
}

// ============================================================================
// Types
// ============================================================================

export type TypeExpression =
  | TypeIdentifier
  | FunctionType
  | RecordType
  | ListType
  | GenericType
  | ParenthesizedType;

export interface TypeIdentifier extends AstNode {
  kind: 'TypeIdentifier';
  name: string;
}

export interface FunctionType extends AstNode {
  kind: 'FunctionType';
  params: TypeExpression[];
  returnType: TypeExpression;
}

export interface RecordType extends AstNode {
  kind: 'RecordType';
  fields: RecordTypeFields;
}

export interface RecordTypeFields extends AstNode {
  kind: 'RecordTypeFields';
  fields: RecordTypeField[];
}

export interface RecordTypeField extends AstNode {
  kind: 'RecordTypeField';
  name: Identifier;
  type: TypeExpression;
}

export interface ListType extends AstNode {
  kind: 'ListType';
  elementType: TypeExpression;
}

export interface GenericType extends AstNode {
  kind: 'GenericType';
  name: TypeIdentifier;
  args: TypeExpression[];
}

export interface ParenthesizedType extends AstNode {
  kind: 'ParenthesizedType';
  type: TypeExpression;
}

// ============================================================================
// Ambient declarations
// ============================================================================

export interface AmbientList extends AstNode {
  kind: 'AmbientList';
  ambients: AmbientDecl[];
}

export interface AmbientDecl extends AstNode {
  kind: 'AmbientDecl';
  name: Identifier;
  type?: TypeExpression;
}

// ============================================================================
// AST Construction Helpers
// ============================================================================

export function createProgram(
  modules: Module[],
  statements: Statement[],
  span: Span
): Program {
  return { kind: 'Program', modules, statements, span };
}

export function createIdentifier(name: string, span: Span): Identifier {
  return { kind: 'Identifier', name, span };
}

export function createLiteral(
  type: Literal['type'],
  value: Literal['value'],
  span: Span
): Literal {
  return { kind: 'Literal', type, value, span };
}

