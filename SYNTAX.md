# Lambdawg Syntax Guide

This document outlines the core syntax of Lambdawg.  
It is not a formal specification — it is a working draft to guide design and discussion.

---

## 1. Lexical Basics

- **Identifiers**: lowercase for values/functions (`foo`, `bar`), uppercase for types (`Int`, `String`).
- **Comments**: single line with `--`, block with `{- ... -}`.
- **Whitespace**: significant for readability but not semantic. Indentation is recommended, not enforced.

---

## 2. Values & Types

```lambdawg
let x = 42
let y = "hello"
let z = true

let point = { x: 10, y: 20 }     -- record
let nums = [1, 2, 3, 4]          -- list
```

Types are inferred by default, but explicit annotations are allowed:

```lambdawg
let add: (Int, Int) -> Int = (a, b) => a + b
```

### Record Updates

Records are immutable. Use spread syntax to create modified copies:

```lambdawg
let point = { x: 10, y: 20 }
let moved = { ...point, x: 15 }  -- { x: 15, y: 20 }

let user = { name: "Ada", role: "admin", active: true }
let demoted = { ...user, role: "guest" }
```

---

## 3. Functions

### Definition

```lambdawg
let square = (n) => n * n

let greet = (name) => "Hello, " + name
```

### Multi-argument Functions

```lambdawg
let sum = (a, b, c) => a + b + c
```

### Type Signatures

Function types use `->` for the return type. Arguments are listed in parentheses:

```lambdawg
let add: (Int, Int) -> Int = (a, b) => a + b
let transform: (String, (String) -> String) -> String = (s, f) => f(s)
```

### Partial Application

Use `_` as a placeholder to create partially applied functions:

```lambdawg
let add = (a, b) => a + b
let add5 = add(5, _)       -- (Int) -> Int, first arg fixed
let addTo5 = add(_, 5)     -- (Int) -> Int, second arg fixed

add5(3)    -- result: 8
addTo5(3)  -- result: 8
```

Multiple placeholders are filled left-to-right:

```lambdawg
let f = (a, b, c) => a + b + c
let g = f(_, 10, _)        -- (Int, Int) -> Int
g(1, 2)                    -- f(1, 10, 2) = 13
```

### Destructuring in Parameters

Records and lists can be destructured directly in function parameters:

```lambdawg
let getX = ({ x, y }) => x

let getName = ({ name, ...rest }) => name

let head = ([first, ...tail]) => first

let processLog = ({ level, message, timestamp }) =>
    if level == "ERROR" then { alert: true, msg: message }
    else { alert: false, msg: message }
```

---

## 4. Pipelines

Lambdawg uses `|>` for left-to-right function application.

```lambdawg
let result =
    [1, 2, 3, 4]
    |> map (x => x * 2)
    |> filter (x => x > 4)
    |> sum
```

### Tap Operator

Use `tap` for side effects within a pipeline without breaking the data flow:

```lambdawg
let result =
    [1, 2, 3, 4]
    |> map (x => x * 2)
    |> tap (xs => do! console.print("Intermediate: " + show(xs)))
    |> filter (x => x > 4)
    |> sum
```

`tap` passes data through unchanged after executing its function.

---

## 5. Parallelism

Lambdawg parallelizes pure function pipelines **by default**. Sequential execution must be explicitly requested.

### Default Behavior (Parallel)

```lambdawg
nums
|> map (x => x * x)      -- parallel by default
|> filter (x => x > 10)  -- parallel by default
|> sum
```

### Explicit Sequential Execution

Use `seq` to enforce ordering when needed:

```lambdawg
items
|> seq map (x => compute(x))   -- sequential: preserves order, no parallelism
```

### Parallel Hints

For fine-grained control over parallelization thresholds:

```lambdawg
items
|> @parallel(minSize: 1000) map (x => expensiveComputation(x))
|> filter (x => x > threshold)
```

The `@parallel(minSize: N)` hint tells the runtime to only parallelize when the collection has at least N elements. This avoids overhead for small collections.

### Effects Require Sequential

Effectful operations in pipelines must use `seq` to make interleaving behavior explicit:

```lambdawg
items
|> seq map (item => do {
    do! logger.log("Processing: " + item)
    process(item)
})
```

---

## 6. Effects

Effects are explicit and visible. Effectful code uses `do` blocks with `do!` for performing actions.

### Effect Blocks

```lambdawg
let main with console, file = () => do {
    let contents = do! file.read("notes.txt")
    do! console.print("File size: " + show(length(contents)))
}
```

- `do { }` — sequencing block for effectful code
- `do!` — perform an effectful action within a `do` block

### Pure vs Effectful Functions

```lambdawg
-- Pure: no effects, can be parallelized
let double = (x) => x * 2

-- Effectful: uses do block, declares dependencies with `with`
let greet with console = (name) => do {
    do! console.print("Hello, " + name)
}
```

The presence of a `do` block and `with` clause makes effectful functions visually distinct from pure functions.

---

## 7. Errors

Errors are values, not exceptions. Lambdawg has built-in `Result` and `Option` types.

### Built-in Types

```lambdawg
-- These are built-in, always available
-- Option a = Some a | None
-- Result a e = Ok a | Error e
```

### Returning Errors

```lambdawg
let safeDivide = (a, b) =>
    if b == 0 then Error("division by zero")
    else Ok(a / b)
```

### Handling Errors with Pattern Matching

```lambdawg
match safeDivide(10, 0) {
    Ok(result) => do! console.print(show(result))
    Error(msg) => do! console.print("Failed: " + msg)
}
```

### Error Propagation

Use `?` to propagate errors without explicit matching:

```lambdawg
let processFile with file = (path) => do {
    let contents = do! file.read(path)?    -- propagates Error if read fails
    let parsed = json.parse(contents)?      -- propagates Error if parse fails
    Ok(transform(parsed))
}
```

The `?` operator:
- On `Ok(value)`: unwraps to `value`
- On `Error(e)`: returns early with `Error(e)`

### Result-Context Blocks

Use `do?` for blocks where all operations return `Result`:

```lambdawg
let processAll with file = (paths) => do? {
    let a = do! file.read(paths[0])   -- auto-unwraps Ok, propagates Error
    let b = do! file.read(paths[1])
    a + b                              -- automatically wrapped in Ok
}
```

---

## 8. Ambient Lambdas

Functions can declare contextual dependencies using `with`. The compiler ensures these dependencies are available at all call sites.

### Declaration

```lambdawg
let processLogs with logger: Logger, json: JsonParser = (path: String) => do {
    let lines = do! file.readLines(path)
    let errors = lines
        |> map (line => json.parse(line))
        |> filter (log => log.level == "ERROR")
        |> map (log => { time: log.timestamp, msg: log.message })
    
    do! logger.info("Processed " + show(length(errors)) + " error logs")
    errors
}
```

### Providing Ambients

Use `provide` to supply ambient values:

```lambdawg
provide logger = fileLogger, json = standardJson in {
    do! processLogs("app.log")
}
```

### Module-Level Provision

```lambdawg
module app providing console = stdConsole, logger = fileLogger {
    let main = () => do {
        do! console.print("Starting...")
        do! runApp()
    }
}
```

### Ambient Resolution

Ambients are resolved at compile time using lexical scope:
1. Innermost `provide` block
2. Enclosing `provide` blocks
3. Module-level provisions
4. Compile error if not found

---

## 9. Pattern Matching

### Basic Patterns

```lambdawg
match nums {
    [] => "empty"
    [x] => "single element: " + show(x)
    [x, y, ...rest] => "starts with " + show(x) + " and " + show(y)
}
```

### Guards

Use `if` for conditional patterns:

```lambdawg
match value {
    n if n < 0 => "negative"
    0 => "zero"
    n if n > 100 => "large positive"
    n => "small positive"
}
```

### Destructuring in Patterns

```lambdawg
match shape {
    Circle { radius } => 3.14159 * radius * radius
    Rect { width, height } => width * height
}

match user {
    { name, role: "admin" } => "Admin: " + name
    { name, role } => name + " (" + role + ")"
}
```

### Exhaustiveness

The compiler checks that patterns are exhaustive. Non-exhaustive matches produce warnings:

```lambdawg
-- Warning: non-exhaustive pattern match, missing: Rect
match shape {
    Circle { radius } => radius * 2
}

-- Use wildcard for intentional catch-all
match shape {
    Circle { radius } => radius * 2
    _ => 0
}
```

---

## 10. Modules

### Definition

```lambdawg
module math {
    let add = (a, b) => a + b
    let mul = (a, b) => a * b
    let pi = 3.14159
}
```

### Imports

```lambdawg
import math                      -- qualified: math.add, math.pi

import math { add, mul }         -- unqualified: add, mul

import math { add as plus }      -- renamed: plus

import math { * }                -- all unqualified (use sparingly)
```

### Qualified Access

```lambdawg
import math

let total = math.add(2, 3)
let area = math.pi * r * r
```

### Visibility

By default, all module members are public. Use `private` for internal definitions:

```lambdawg
module math {
    private let helper = (x) => x + 1
    let increment = (x) => helper(x)
}
```

---

## 11. JavaScript Interop

Lambdawg transpiles to JavaScript. Use `import js` to access JavaScript built-ins and libraries.

### Importing JavaScript

```lambdawg
import js { fetch, JSON, console }

let fetchData with console = (url) => do {
    let response = do! fetch(url)
    let data = do! response.json()
    do! console.log(data)
    data
}
```

### JavaScript Types

JavaScript values are typed as `JsValue` by default. Use type annotations for safety:

```lambdawg
import js { document }

let getElement: (String) -> Option JsValue = (id) =>
    let el = document.getElementById(id)
    if el == null then None else Some(el)
```

### Async JavaScript Functions

JavaScript async functions map naturally to Lambdawg's effect system:

```lambdawg
import js { fetch }

-- fetch returns a Promise, which maps to do!/do blocks
let getData with console = (url) => do {
    let response = do! fetch(url)
    let json = do! response.json()
    json
}
```

---

## 12. Types & Data

### Algebraic Data Types

```lambdawg
type Shape =
    | Circle { radius: Float }
    | Rect { width: Float, height: Float }
    | Triangle { a: Float, b: Float, c: Float }

type Tree a =
    | Leaf a
    | Node (Tree a) (Tree a)
```

### Type Aliases

```lambdawg
type UserId = Int
type Point = { x: Float, y: Float }
type Handler a = (Request) -> Result a String
```

### Generic Types

```lambdawg
type List a =
    | Nil
    | Cons a (List a)

type Pair a b = { first: a, second: b }
```

---

## 13. Entry Point

Every Lambdawg program requires a `main` function:

```lambdawg
let main with console = () => do {
    do! console.print("Hello from Lambdawg!")
}
```

The `main` function:
- Declares its ambient dependencies with `with`
- Uses a `do` block for effects
- Returns `()` (unit) or a `Result`

### With Arguments

```lambdawg
let main with console, args = () => do {
    match args {
        [] => do! console.print("No arguments provided")
        [cmd, ...rest] => do! console.print("Command: " + cmd)
    }
}
```

---

## 14. Summary of Conventions

| Convention | Meaning |
|------------|---------|
| `lowercase` | Values, functions |
| `Uppercase` | Types, constructors |
| `do { }` | Effect sequencing block |
| `do!` | Perform effect |
| `do?` | Result-context block (auto-propagates errors) |
| `with` | Ambient dependencies |
| `provide` | Supply ambient values |
| `?` | Error propagation operator |
| `_` | Placeholder (partial application) or wildcard (patterns) |
| `seq` | Force sequential execution |
| `@parallel()` | Parallel execution hints |
| `...` | Spread/rest in records and lists |
| `import js` | JavaScript interop |

---
