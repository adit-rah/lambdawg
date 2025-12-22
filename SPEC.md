# Lambdawg Language Specification

This document provides a comprehensive specification for the Lambdawg programming language.  
It serves as the authoritative reference for language implementers and advanced users.

**Version**: 0.1.0 (Draft)  
**Status**: Pre-implementation specification

---

## Table of Contents

1. [Overview](#1-overview)
2. [Lexical Structure](#2-lexical-structure)
3. [Types](#3-types)
4. [Values and Literals](#4-values-and-literals)
5. [Expressions](#5-expressions)
6. [Functions](#6-functions)
7. [Pattern Matching](#7-pattern-matching)
8. [Effect System](#8-effect-system)
9. [Ambient Lambdas](#9-ambient-lambdas)
10. [Parallelism Model](#10-parallelism-model)
11. [Module System](#11-module-system)
12. [JavaScript Interop](#12-javascript-interop)
13. [Standard Library](#13-standard-library)
14. [Compilation Model](#14-compilation-model)

---

## 1. Overview

### 1.1 Design Goals

Lambdawg is designed around three core principles:

1. **Approachability**: Readable by developers of any background, learnable in hours
2. **Honest Effects**: All side effects are explicit and visible in the code
3. **Implicit Parallelism**: Pure code parallelizes automatically; sequential execution is opt-in

### 1.2 Execution Model

Lambdawg transpiles to JavaScript. This provides:
- Zero-installation execution in browsers
- Access to the JavaScript ecosystem via interop
- Web Workers for parallel execution
- Promise-based async mapping to the effect system

### 1.3 Type System Summary

- Statically typed with full type inference
- Hindley-Milner style inference (no annotations required for most code)
- Algebraic data types (sum and product types)
- Parametric polymorphism (generics)
- No subtyping, no inheritance

---

## 2. Lexical Structure

### 2.1 Character Set

Lambdawg source files are UTF-8 encoded.

### 2.2 Identifiers

```
lowercase_ident = [a-z][a-zA-Z0-9_]*
uppercase_ident = [A-Z][a-zA-Z0-9_]*
```

- **Lowercase identifiers**: values, functions, parameters, module names
- **Uppercase identifiers**: types, type constructors, modules (when used as namespaces)

### 2.3 Keywords

Reserved keywords that cannot be used as identifiers:

```
let       type      module    import    private
if        then      else      match     with
do        in        provide   providing seq
true      false     
```

### 2.4 Operators

```
Arithmetic:    +  -  *  /  %
Comparison:    ==  !=  <  >  <=  >=
Logical:       &&  ||  !
Pipeline:      |>
Assignment:    =
Type:          ->  :
Other:         =>  ?  _  ...  @
```

### 2.5 Comments

```lambdawg
-- Single line comment

{- 
   Block comment
   can span multiple lines
-}
```

### 2.6 Literals

```lambdawg
42              -- Int
3.14            -- Float
"hello"         -- String
'c'             -- Char
true, false     -- Bool
()              -- Unit
```

---

## 3. Types

### 3.1 Built-in Types

| Type | Description | JavaScript Equivalent |
|------|-------------|----------------------|
| `Int` | Integer numbers | `number` (integer subset) |
| `Float` | Floating-point numbers | `number` |
| `String` | Text strings | `string` |
| `Char` | Single character | `string` (length 1) |
| `Bool` | Boolean values | `boolean` |
| `Unit` | No meaningful value | `undefined` |
| `List a` | Ordered collection | `Array` |
| `Option a` | Optional value | Custom |
| `Result a e` | Success or error | Custom |
| `JsValue` | Opaque JavaScript value | `any` |

### 3.2 Built-in Type Definitions

```lambdawg
type Option a =
    | Some a
    | None

type Result a e =
    | Ok a
    | Error e

type List a =
    | Nil
    | Cons a (List a)
```

### 3.3 Record Types

Records are anonymous product types:

```lambdawg
type Point = { x: Float, y: Float }
type User = { name: String, age: Int, active: Bool }
```

Records can be nested:

```lambdawg
type Company = {
    name: String,
    address: { street: String, city: String }
}
```

### 3.4 Algebraic Data Types

Sum types (variants):

```lambdawg
type Shape =
    | Circle { radius: Float }
    | Rect { width: Float, height: Float }
    | Point
```

Product types (records) are defined inline or as type aliases.

### 3.5 Function Types

```lambdawg
(A) -> B                    -- single argument
(A, B) -> C                 -- multiple arguments
(A, (B) -> C) -> D          -- higher-order function
```

### 3.6 Generic Types

Type parameters are lowercase:

```lambdawg
type Pair a b = { first: a, second: b }
type Tree a =
    | Leaf a
    | Node (Tree a) (Tree a)
```

### 3.7 Type Aliases

```lambdawg
type UserId = Int
type Handler a = (Request) -> Result a String
type Callback = () -> Unit
```

### 3.8 Type Inference

Lambdawg uses Hindley-Milner type inference. Types are inferred from usage:

```lambdawg
let add = (a, b) => a + b           -- inferred: (Int, Int) -> Int
let first = (list) => list[0]       -- inferred: (List a) -> a
let identity = (x) => x             -- inferred: (a) -> a
```

Explicit annotations are optional but allowed:

```lambdawg
let add: (Int, Int) -> Int = (a, b) => a + b
```

---

## 4. Values and Literals

### 4.1 Numeric Literals

```lambdawg
42              -- Int (decimal)
0xFF            -- Int (hexadecimal)
0b1010          -- Int (binary)
0o755           -- Int (octal)
3.14            -- Float
1.0e10          -- Float (scientific)
1_000_000       -- Int with separators
```

### 4.2 String Literals

```lambdawg
"hello"                     -- regular string
"line1\nline2"              -- escape sequences
"say \"hello\""             -- escaped quotes
```

Escape sequences: `\n`, `\t`, `\r`, `\\`, `\"`, `\'`

### 4.3 String Interpolation

```lambdawg
let name = "world"
let greeting = "Hello, ${name}!"    -- "Hello, world!"
```

### 4.4 List Literals

```lambdawg
[]                          -- empty list
[1, 2, 3]                   -- list of Ints
[[1, 2], [3, 4]]            -- nested lists
```

### 4.5 Record Literals

```lambdawg
{ x: 10, y: 20 }
{ name: "Ada", age: 36 }
```

Record spread:

```lambdawg
let base = { x: 0, y: 0 }
let moved = { ...base, x: 10 }      -- { x: 10, y: 0 }
```

### 4.6 Constructor Application

```lambdawg
Some(42)                    -- Option Int
None                        -- Option a
Ok("success")               -- Result String e
Error("failed")             -- Result a String
Circle { radius: 5.0 }      -- Shape
```

---

## 5. Expressions

### 5.1 Let Bindings

```lambdawg
let x = 42
let point = { x: 10, y: 20 }
let add = (a, b) => a + b
```

Let bindings are immutable. Shadowing is allowed:

```lambdawg
let x = 1
let x = x + 1       -- shadows previous x
```

### 5.2 Conditional Expressions

```lambdawg
if condition then expr1 else expr2
```

Both branches must have the same type. `if` is an expression:

```lambdawg
let max = if a > b then a else b
```

### 5.3 Pipeline Expressions

```lambdawg
value |> function
```

The pipeline operator passes the left value as the last argument to the right function:

```lambdawg
[1, 2, 3] |> map (x => x * 2)       -- equivalent to: map((x => x * 2), [1, 2, 3])
```

Pipelines chain:

```lambdawg
[1, 2, 3, 4]
|> map (x => x * 2)
|> filter (x => x > 4)
|> sum
```

### 5.4 Match Expressions

See [Section 7: Pattern Matching](#7-pattern-matching).

### 5.5 Effect Expressions

See [Section 8: Effect System](#8-effect-system).

### 5.6 Operator Precedence

From highest to lowest:

1. Function application: `f(x)`
2. Unary operators: `!`, `-`
3. Multiplicative: `*`, `/`, `%`
4. Additive: `+`, `-`
5. Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`
6. Logical AND: `&&`
7. Logical OR: `||`
8. Pipeline: `|>`
9. Error propagation: `?`
10. Assignment: `=`

---

## 6. Functions

### 6.1 Function Definition

```lambdawg
let name = (parameters) => body
```

Examples:

```lambdawg
let square = (n) => n * n
let add = (a, b) => a + b
let greet = (name) => "Hello, " + name
```

### 6.2 Multi-line Function Bodies

Use blocks for complex bodies:

```lambdawg
let process = (data) => {
    let cleaned = clean(data)
    let validated = validate(cleaned)
    transform(validated)
}
```

The last expression is the return value.

### 6.3 Partial Application

Use `_` as a placeholder:

```lambdawg
let add = (a, b) => a + b
let add5 = add(5, _)        -- (Int) -> Int
let addTo5 = add(_, 5)      -- (Int) -> Int
```

Multiple placeholders are filled left-to-right:

```lambdawg
let f = (a, b, c) => a + b + c
let g = f(_, 10, _)         -- (Int, Int) -> Int
g(1, 2)                     -- f(1, 10, 2) = 13
```

### 6.4 Higher-Order Functions

Functions are first-class values:

```lambdawg
let apply = (f, x) => f(x)
let compose = (f, g) => (x) => f(g(x))
let twice = (f) => (x) => f(f(x))
```

### 6.5 Recursion

Recursive functions reference themselves by name:

```lambdawg
let factorial = (n) =>
    if n <= 1 then 1
    else n * factorial(n - 1)

let fibonacci = (n) =>
    match n {
        0 => 0
        1 => 1
        n => fibonacci(n - 1) + fibonacci(n - 2)
    }
```

### 6.6 Parameter Destructuring

```lambdawg
let getX = ({ x, y }) => x
let head = ([first, ...rest]) => first
let process = ({ name, age, ...rest }) => name + " is " + show(age)
```

---

## 7. Pattern Matching

### 7.1 Match Expression

```lambdawg
match expression {
    pattern1 => result1
    pattern2 => result2
    ...
}
```

### 7.2 Pattern Types

**Literal patterns**:
```lambdawg
match x {
    0 => "zero"
    1 => "one"
    _ => "other"
}
```

**Variable patterns**:
```lambdawg
match x {
    n => "got " + show(n)
}
```

**Constructor patterns**:
```lambdawg
match option {
    Some(value) => value
    None => defaultValue
}
```

**Record patterns**:
```lambdawg
match user {
    { name, role: "admin" } => "Admin: " + name
    { name, role } => name + " (" + role + ")"
}
```

**List patterns**:
```lambdawg
match list {
    [] => "empty"
    [x] => "single: " + show(x)
    [x, y, ...rest] => "multiple"
}
```

### 7.3 Guards

```lambdawg
match value {
    n if n < 0 => "negative"
    n if n == 0 => "zero"
    n if n > 100 => "large"
    n => "normal"
}
```

### 7.4 Nested Patterns

```lambdawg
match result {
    Ok(Some(value)) => value
    Ok(None) => defaultValue
    Error(msg) => panic(msg)
}
```

### 7.5 Exhaustiveness Checking

The compiler verifies all patterns are covered. Incomplete matches produce warnings:

```lambdawg
-- Warning: non-exhaustive, missing: None
match option {
    Some(x) => x
}
```

Use `_` for catch-all:

```lambdawg
match option {
    Some(x) => x
    _ => defaultValue
}
```

---

## 8. Effect System

### 8.1 Pure vs Effectful Code

Pure code:
- No side effects
- Same inputs always produce same outputs
- Can be parallelized and memoized

Effectful code:
- Performs I/O, mutation, or other side effects
- Must be explicitly marked with `do` blocks

### 8.2 Effect Blocks

```lambdawg
do {
    statement1
    statement2
    result
}
```

### 8.3 Performing Effects

Use `do!` to perform an effectful action:

```lambdawg
let main with console = () => do {
    do! console.print("Hello")
    do! console.print("World")
}
```

### 8.4 Sequencing

Effects in a `do` block execute sequentially:

```lambdawg
let program with console, file = () => do {
    let contents = do! file.read("input.txt")     -- step 1
    let processed = transform(contents)            -- step 2 (pure)
    do! file.write("output.txt", processed)        -- step 3
    do! console.print("Done")                      -- step 4
}
```

### 8.5 Effect and Value Binding

```lambdawg
do {
    let x = pureExpression           -- bind pure value
    let y = do! effectfulAction      -- bind effect result
    x + y                            -- return value
}
```

### 8.6 Mapping to JavaScript

| Lambdawg | JavaScript |
|----------|------------|
| `do { }` | `async function` body |
| `do!` | `await` |
| Effect result | `Promise` |

---

## 9. Ambient Lambdas

### 9.1 Purpose

Ambient lambdas provide compile-time dependency injection without explicit parameter threading.

### 9.2 Declaration

```lambdawg
let functionName with dep1, dep2 = (params) => body
```

With type annotations:

```lambdawg
let functionName with dep1: Type1, dep2: Type2 = (params) => body
```

### 9.3 Ambient Usage

Inside the function, ambients are accessed like regular values:

```lambdawg
let greet with console = (name) => do {
    do! console.print("Hello, " + name)
}
```

### 9.4 Providing Ambients

**Block-level provision**:
```lambdawg
provide console = stdConsole, logger = fileLogger in {
    do! greet("World")
}
```

**Module-level provision**:
```lambdawg
module app providing console = stdConsole {
    let main = () => do {
        do! console.print("Hello")
    }
}
```

### 9.5 Resolution Rules

Ambients are resolved at compile time in this order:
1. Innermost enclosing `provide` block
2. Outer `provide` blocks (lexical scope)
3. Module-level `providing` declarations
4. Import-level provisions
5. Compile error if not found

### 9.6 Ambient Propagation

Functions that call other functions with ambients must either:
1. Declare the same ambients
2. Provide them explicitly

```lambdawg
-- greet requires console
let greet with console = (name) => do {
    do! console.print("Hello, " + name)
}

-- main also declares console, so greet can use it
let main with console = () => do {
    do! greet("World")
}

-- OR: provide explicitly
let main2 = () => do {
    provide console = stdConsole in {
        do! greet("World")
    }
}
```

### 9.7 Testing with Ambients

```lambdawg
let mockConsole = {
    output: [],
    print: (msg) => do {
        mockConsole.output = [...mockConsole.output, msg]
    }
}

let testGreet = () => do {
    provide console = mockConsole in {
        do! greet("Test")
    }
    assert(mockConsole.output == ["Hello, Test"])
}
```

---

## 10. Parallelism Model

### 10.1 Philosophy

Pure functions parallelize by default. Sequential execution is explicit.

### 10.2 Automatic Parallelization

Pipeline operations on collections parallelize automatically:

```lambdawg
[1, 2, 3, 4, 5]
|> map (x => expensiveComputation(x))   -- parallel
|> filter (x => x > 10)                  -- parallel
|> sum                                    -- reduction
```

### 10.3 Purity Detection

A function is considered pure if:
- It has no `do` block
- It calls only pure functions
- It does not access mutable state

The compiler tracks purity through the type system.

### 10.4 Sequential Execution

Use `seq` to force sequential execution:

```lambdawg
items
|> seq map (x => compute(x))   -- sequential
```

### 10.5 Parallel Hints

Fine-tune parallelization with hints:

```lambdawg
items
|> @parallel(minSize: 1000) map (x => f(x))
```

Available hints:
- `minSize: N` — Only parallelize if collection has ≥N elements
- `chunkSize: N` — Process in chunks of N elements

### 10.6 Effects and Parallelism

Effectful code cannot be automatically parallelized. Effects require `seq`:

```lambdawg
-- This is a compile error:
items |> map (x => do { do! log(x); x })

-- This is correct:
items |> seq map (x => do { do! log(x); x })
```

### 10.7 JavaScript Implementation

Parallelism is implemented using:
- Web Workers for CPU-bound parallel work
- `Promise.all` for I/O-bound parallel work

---

## 11. Module System

### 11.1 Module Definition

```lambdawg
module moduleName {
    -- definitions
}
```

### 11.2 Exports

All definitions are public by default. Use `private` for internal definitions:

```lambdawg
module math {
    private let helper = (x) => x + 1
    let add = (a, b) => a + b          -- public
    let increment = (x) => helper(x)   -- public
}
```

### 11.3 Imports

**Qualified import**:
```lambdawg
import math
math.add(1, 2)
```

**Selective import**:
```lambdawg
import math { add, mul }
add(1, 2)
```

**Renamed import**:
```lambdawg
import math { add as plus }
plus(1, 2)
```

**Wildcard import** (discouraged):
```lambdawg
import math { * }
```

### 11.4 File Structure

One module per file. Filename matches module name:

```
src/
  math.dawg       -- module math
  utils.dawg      -- module utils
  app/
    main.dawg     -- module app.main
```

### 11.5 Module Provisions

```lambdawg
module app providing console = stdConsole, logger = fileLogger {
    -- all functions in this module have access to console and logger
}
```

---

## 12. JavaScript Interop

### 12.1 Importing JavaScript

```lambdawg
import js { fetch, JSON, console, document }
```

### 12.2 JavaScript Values

JavaScript values have type `JsValue` by default:

```lambdawg
import js { document }

let el: JsValue = document.getElementById("app")
```

### 12.3 Type Coercion

Convert between Lambdawg and JavaScript types:

```lambdawg
import js { JSON }

let obj = { name: "Ada", age: 36 }
let jsonString: String = JSON.stringify(obj)
let parsed: JsValue = JSON.parse(jsonString)
```

### 12.4 Async JavaScript

JavaScript Promises map to Lambdawg effects:

```lambdawg
import js { fetch }

let getData with console = (url) => do {
    let response = do! fetch(url)           -- await fetch(url)
    let json = do! response.json()          -- await response.json()
    json
}
```

### 12.5 Callbacks

Convert between Lambdawg functions and JavaScript callbacks:

```lambdawg
import js { setTimeout }

let delay = (ms) => do {
    do! setTimeout(ms)
}
```

### 12.6 Null and Undefined

JavaScript `null` and `undefined` map to `None`:

```lambdawg
import js { document }

let maybeElement: Option JsValue = document.getElementById("missing")
-- Returns None if element doesn't exist
```

---

## 13. Standard Library

### 13.1 Core Functions

```lambdawg
-- Identity and composition
identity: (a) -> a
compose: ((b) -> c, (a) -> b) -> (a) -> c
pipe: ((a) -> b, (b) -> c) -> (a) -> c

-- Comparison
min: (a, a) -> a
max: (a, a) -> a
clamp: (a, a, a) -> a
```

### 13.2 List Functions

```lambdawg
-- Creation
range: (Int, Int) -> List Int
repeat: (a, Int) -> List a

-- Transformation
map: ((a) -> b, List a) -> List b
filter: ((a) -> Bool, List a) -> List a
flatMap: ((a) -> List b, List a) -> List b

-- Reduction
fold: ((b, a) -> b, b, List a) -> b
reduce: ((a, a) -> a, List a) -> Option a
sum: (List Int) -> Int
product: (List Int) -> Int

-- Access
head: (List a) -> Option a
tail: (List a) -> Option (List a)
last: (List a) -> Option a
nth: (Int, List a) -> Option a

-- Query
length: (List a) -> Int
isEmpty: (List a) -> Bool
contains: (a, List a) -> Bool
any: ((a) -> Bool, List a) -> Bool
all: ((a) -> Bool, List a) -> Bool

-- Combination
concat: (List a, List a) -> List a
flatten: (List (List a)) -> List a
zip: (List a, List b) -> List (a, b)

-- Sorting
sort: (List a) -> List a
sortBy: ((a) -> b, List a) -> List a

-- Utility
reverse: (List a) -> List a
take: (Int, List a) -> List a
drop: (Int, List a) -> List a
unique: (List a) -> List a
```

### 13.3 Option Functions

```lambdawg
map: ((a) -> b, Option a) -> Option b
flatMap: ((a) -> Option b, Option a) -> Option b
getOrElse: (a, Option a) -> a
orElse: (Option a, Option a) -> Option a
isSome: (Option a) -> Bool
isNone: (Option a) -> Bool
```

### 13.4 Result Functions

```lambdawg
map: ((a) -> b, Result a e) -> Result b e
mapError: ((e) -> f, Result a e) -> Result a f
flatMap: ((a) -> Result b e, Result a e) -> Result b e
getOrElse: (a, Result a e) -> a
isOk: (Result a e) -> Bool
isError: (Result a e) -> Bool
```

### 13.5 String Functions

```lambdawg
length: (String) -> Int
concat: (String, String) -> String
split: (String, String) -> List String
join: (String, List String) -> String
trim: (String) -> String
toUpper: (String) -> String
toLower: (String) -> String
contains: (String, String) -> Bool
startsWith: (String, String) -> Bool
endsWith: (String, String) -> Bool
replace: (String, String, String) -> String
```

### 13.6 Conversion Functions

```lambdawg
show: (a) -> String
parseInt: (String) -> Option Int
parseFloat: (String) -> Option Float
```

---

## 14. Compilation Model

### 14.1 Pipeline Overview

```
Source (.dawg)
    ↓
  Lexer
    ↓
  Parser → AST
    ↓
  Type Checker → Typed AST
    ↓
  Purity Analyzer
    ↓
  Ambient Resolver
    ↓
  Parallel Optimizer
    ↓
  JavaScript Emitter
    ↓
Output (.js)
```

### 14.2 Lexical Analysis

Transforms source text into tokens. Handles:
- Keywords, identifiers, literals
- Operators and punctuation
- Comments (discarded)
- Whitespace (mostly discarded)

### 14.3 Parsing

Produces an Abstract Syntax Tree (AST). Grammar is LL(k) parseable.

### 14.4 Type Checking

- Implements Hindley-Milner type inference
- Unifies types across expressions
- Reports type errors with source locations
- Produces typed AST with inferred types

### 14.5 Purity Analysis

- Marks each function as pure or effectful
- Tracks effect dependencies
- Validates effect usage (no effects outside `do` blocks)

### 14.6 Ambient Resolution

- Resolves all `with` dependencies
- Validates ambient availability at call sites
- Inserts ambient parameters in generated code

### 14.7 Parallel Optimization

- Identifies parallelizable pipeline operations
- Applies parallel hints
- Generates Web Worker dispatch code

### 14.8 Code Generation

Emits JavaScript with:
- ES modules for module system
- `async`/`await` for effects
- `Promise.all` and Web Workers for parallelism
- Algebraic data types as tagged objects

---

## Appendix A: Grammar (Informative)

```ebnf
program     = module* ;
module      = "module" IDENT ("providing" provisions)? "{" definition* "}" ;

definition  = letDef | typeDef | importDef ;
letDef      = "let" ("private")? IDENT ("with" ambients)? "=" expr ;
typeDef     = "type" TYPE_IDENT typeParams? "=" typeBody ;
importDef   = "import" ("js")? IDENT ("{" importList "}")? ;

expr        = letExpr | ifExpr | matchExpr | doExpr | pipelineExpr ;
letExpr     = "let" pattern "=" expr ("in" expr)? ;
ifExpr      = "if" expr "then" expr "else" expr ;
matchExpr   = "match" expr "{" matchArm* "}" ;
doExpr      = "do" "{" doStatement* "}" ;
pipelineExpr = expr ("|>" pipelineOp)* ;

matchArm    = pattern ("if" expr)? "=>" expr ;
pattern     = literal | IDENT | constructor | recordPattern | listPattern | "_" ;

type        = simpleType | functionType | recordType ;
functionType = "(" typeList ")" "->" type ;
```

---

## Appendix B: Reserved for Future

The following features are reserved for future specification:
- Traits/type classes
- Effect polymorphism
- Macros
- Foreign function interface (beyond JavaScript)
- Concurrency primitives (channels, actors)

---

