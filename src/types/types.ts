/**
 * Internal type representations for the Lambdawg type checker
 */

// Type variable counter for generating unique type variables
let typeVarCounter = 0;

export function resetTypeVarCounter(): void {
  typeVarCounter = 0;
}

export function freshTypeVar(): TypeVar {
  return { kind: 'TypeVar', id: typeVarCounter++, instance: null };
}

// ============================================================================
// Type Definitions
// ============================================================================

export type Type =
  | TypeVar
  | TypeConst
  | TypeFunc
  | TypeRecord
  | TypeList
  | TypeApp;

/**
 * Type variable - can be unified with other types
 */
export interface TypeVar {
  kind: 'TypeVar';
  id: number;
  instance: Type | null;  // Set during unification
}

/**
 * Constant type (Int, String, Bool, etc.)
 */
export interface TypeConst {
  kind: 'TypeConst';
  name: string;
}

/**
 * Function type
 */
export interface TypeFunc {
  kind: 'TypeFunc';
  params: Type[];
  returnType: Type;
}

/**
 * Record type
 */
export interface TypeRecord {
  kind: 'TypeRecord';
  fields: Map<string, Type>;
  isOpen: boolean;  // true if record can have additional fields (row polymorphism)
}

/**
 * List type
 */
export interface TypeList {
  kind: 'TypeList';
  elementType: Type;
}

/**
 * Generic type application (e.g., Option Int, Result String Error)
 */
export interface TypeApp {
  kind: 'TypeApp';
  constructor: string;
  args: Type[];
}

// ============================================================================
// Built-in Types
// ============================================================================

export const TYPE_INT: TypeConst = { kind: 'TypeConst', name: 'Int' };
export const TYPE_FLOAT: TypeConst = { kind: 'TypeConst', name: 'Float' };
export const TYPE_STRING: TypeConst = { kind: 'TypeConst', name: 'String' };
export const TYPE_CHAR: TypeConst = { kind: 'TypeConst', name: 'Char' };
export const TYPE_BOOL: TypeConst = { kind: 'TypeConst', name: 'Bool' };
export const TYPE_UNIT: TypeConst = { kind: 'TypeConst', name: 'Unit' };

export function createFuncType(params: Type[], returnType: Type): TypeFunc {
  return { kind: 'TypeFunc', params, returnType };
}

export function createRecordType(fields: Map<string, Type>, isOpen = false): TypeRecord {
  return { kind: 'TypeRecord', fields, isOpen };
}

export function createListType(elementType: Type): TypeList {
  return { kind: 'TypeList', elementType };
}

export function createTypeApp(constructor: string, args: Type[]): TypeApp {
  return { kind: 'TypeApp', constructor, args };
}

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Resolve a type variable chain to find the actual type
 */
export function prune(type: Type): Type {
  if (type.kind === 'TypeVar' && type.instance !== null) {
    type.instance = prune(type.instance);
    return type.instance;
  }
  return type;
}

/**
 * Check if a type variable occurs in a type (for occurs check)
 */
export function occursIn(typeVar: TypeVar, type: Type): boolean {
  type = prune(type);
  
  if (type.kind === 'TypeVar') {
    return type.id === typeVar.id;
  }
  
  if (type.kind === 'TypeFunc') {
    return type.params.some(p => occursIn(typeVar, p)) || occursIn(typeVar, type.returnType);
  }
  
  if (type.kind === 'TypeRecord') {
    for (const fieldType of type.fields.values()) {
      if (occursIn(typeVar, fieldType)) return true;
    }
    return false;
  }
  
  if (type.kind === 'TypeList') {
    return occursIn(typeVar, type.elementType);
  }
  
  if (type.kind === 'TypeApp') {
    return type.args.some(arg => occursIn(typeVar, arg));
  }
  
  return false;
}

/**
 * Pretty print a type
 */
export function typeToString(type: Type): string {
  type = prune(type);
  
  switch (type.kind) {
    case 'TypeVar':
      return `t${type.id}`;
    
    case 'TypeConst':
      return type.name;
    
    case 'TypeFunc': {
      const params = type.params.map(typeToString).join(', ');
      const ret = typeToString(type.returnType);
      return `(${params}) -> ${ret}`;
    }
    
    case 'TypeRecord': {
      const fields = Array.from(type.fields.entries())
        .map(([name, t]) => `${name}: ${typeToString(t)}`)
        .join(', ');
      return `{ ${fields} }`;
    }
    
    case 'TypeList':
      return `List ${typeToString(type.elementType)}`;
    
    case 'TypeApp': {
      if (type.args.length === 0) {
        return type.constructor;
      }
      const args = type.args.map(typeToString).join(' ');
      return `${type.constructor} ${args}`;
    }
  }
}

/**
 * Check if two types are equal (after pruning)
 */
export function typesEqual(a: Type, b: Type): boolean {
  a = prune(a);
  b = prune(b);
  
  if (a.kind !== b.kind) return false;
  
  switch (a.kind) {
    case 'TypeVar':
      return a.id === (b as TypeVar).id;
    
    case 'TypeConst':
      return a.name === (b as TypeConst).name;
    
    case 'TypeFunc': {
      const bFunc = b as TypeFunc;
      if (a.params.length !== bFunc.params.length) return false;
      return a.params.every((p, i) => typesEqual(p, bFunc.params[i]!)) &&
             typesEqual(a.returnType, bFunc.returnType);
    }
    
    case 'TypeRecord': {
      const bRec = b as TypeRecord;
      if (a.fields.size !== bRec.fields.size) return false;
      for (const [name, type] of a.fields) {
        const bType = bRec.fields.get(name);
        if (!bType || !typesEqual(type, bType)) return false;
      }
      return true;
    }
    
    case 'TypeList':
      return typesEqual(a.elementType, (b as TypeList).elementType);
    
    case 'TypeApp': {
      const bApp = b as TypeApp;
      if (a.constructor !== bApp.constructor) return false;
      if (a.args.length !== bApp.args.length) return false;
      return a.args.every((arg, i) => typesEqual(arg, bApp.args[i]!));
    }
  }
}

/**
 * Deep copy a type (for instantiation of polymorphic types)
 */
export function copyType(type: Type, mapping: Map<number, TypeVar> = new Map()): Type {
  type = prune(type);
  
  switch (type.kind) {
    case 'TypeVar': {
      let copy = mapping.get(type.id);
      if (!copy) {
        copy = freshTypeVar();
        mapping.set(type.id, copy);
      }
      return copy;
    }
    
    case 'TypeConst':
      return type;
    
    case 'TypeFunc':
      return createFuncType(
        type.params.map(p => copyType(p, mapping)),
        copyType(type.returnType, mapping)
      );
    
    case 'TypeRecord': {
      const fields = new Map<string, Type>();
      for (const [name, fieldType] of type.fields) {
        fields.set(name, copyType(fieldType, mapping));
      }
      return createRecordType(fields, type.isOpen);
    }
    
    case 'TypeList':
      return createListType(copyType(type.elementType, mapping));
    
    case 'TypeApp':
      return createTypeApp(
        type.constructor,
        type.args.map(arg => copyType(arg, mapping))
      );
  }
}

// ============================================================================
// Type Scheme (for let-polymorphism)
// ============================================================================

export interface TypeScheme {
  typeVars: number[];  // Quantified type variables
  type: Type;
}

export function createScheme(typeVars: number[], type: Type): TypeScheme {
  return { typeVars, type };
}

/**
 * Instantiate a type scheme with fresh type variables
 */
export function instantiate(scheme: TypeScheme): Type {
  const mapping = new Map<number, TypeVar>();
  for (const id of scheme.typeVars) {
    mapping.set(id, freshTypeVar());
  }
  return copyType(scheme.type, mapping);
}

/**
 * Generalize a type into a type scheme
 */
export function generalize(type: Type, envTypeVars: Set<number>): TypeScheme {
  const freeVars = freeTypeVars(type);
  const quantified = [...freeVars].filter(id => !envTypeVars.has(id));
  return createScheme(quantified, type);
}

/**
 * Get all free type variables in a type
 */
export function freeTypeVars(type: Type): Set<number> {
  type = prune(type);
  const vars = new Set<number>();
  
  switch (type.kind) {
    case 'TypeVar':
      vars.add(type.id);
      break;
    
    case 'TypeFunc':
      for (const p of type.params) {
        for (const v of freeTypeVars(p)) vars.add(v);
      }
      for (const v of freeTypeVars(type.returnType)) vars.add(v);
      break;
    
    case 'TypeRecord':
      for (const fieldType of type.fields.values()) {
        for (const v of freeTypeVars(fieldType)) vars.add(v);
      }
      break;
    
    case 'TypeList':
      for (const v of freeTypeVars(type.elementType)) vars.add(v);
      break;
    
    case 'TypeApp':
      for (const arg of type.args) {
        for (const v of freeTypeVars(arg)) vars.add(v);
      }
      break;
  }
  
  return vars;
}

