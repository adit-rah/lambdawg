export { TypeChecker, typeCheck, TypeEnv } from './checker.js';
export type { TypeCheckResult } from './checker.js';
export {
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
  createScheme,
  prune,
  typeToString,
  instantiate,
  generalize,
} from './types.js';

export type {
  Type,
  TypeVar,
  TypeConst,
  TypeFunc,
  TypeRecord,
  TypeList,
  TypeApp,
  TypeScheme,
} from './types.js';
