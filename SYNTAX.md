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

Types can be inferred, but explicit annotations are allowed:

```lambdawg
let add: (Int, Int) -> Int = (a, b) => a + b
```

---

## 3. Functions

### Definition
```lambdawg
let square = (n) => n * n

let greet = (name) => "Hello, " + name
```

### Multi-argument functions
```lambdawg
let sum = (a, b, c) => a + b + c
```

### Partial application
```lambdawg
let add5 = add(5, _)
add5(3)  -- result: 8
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

---

## 5. Parallelism

- **Default**: pipelines parallelize across pure functions.  
- **Explicit sequencing**: use `seq` to force order.

```lambdawg
nums
|> parallel map (x => x * x)   -- default behavior
|> seq map (print)             -- enforce sequential execution
```

---

## 6. Effects

Effects are explicit with `do` and `do!`.

```lambdawg
let main = () => do {
    let contents = do! file.read("notes.txt")
    do! console.print("File size: " + length(contents))
}
```

- `do` = sequencing block  
- `do!` = perform an effectful action

---

## 7. Errors

Errors are values, not exceptions. Pattern matching is used for handling.

```lambdawg
let safeDivide = (a, b) =>
    if b == 0 then Error("division by zero")
    else Ok(a / b)

match safeDivide(10, 0) {
    Ok(result) => console.print(result)
    Error(msg) => console.print("Failed: " + msg)
}
```

---

## 8. Ambient Lambdas

Functions can declare contextual dependencies without threading them manually.

```lambdawg
let processLogs with logger, json = (path) => do {
    let lines = do! file.readLines(path)
    lines
    |> parallel map (line => json.parse(line))
    |> filter (log => log.level == "ERROR")
    |> map (log => { time: log.timestamp, msg: log.message })
    |> do! logger.info("Processed logs")
}
```

The compiler ensures `logger` and `json` are available wherever `processLogs` is called.

---

## 9. Pattern Matching

```lambdawg
match nums {
    [] => "empty"
    [x] => "single element: " + x
    [x, y, ...rest] => "starts with " + x + " and " + y
}
```

---

## 10. Modules

```lambdawg
module math {
    let add = (a, b) => a + b
    let mul = (a, b) => a * b
}

import math

let total = math.add(2, 3)
```

---

## 11. Types & Data

Custom types with algebraic data types (ADTs):

```lambdawg
type Result a =
    | Ok a
    | Error String

type Shape =
    | Circle { radius: Int }
    | Rect { width: Int, height: Int }
```

---

## 12. Entry Point

```lambdawg
let main with console = () => do {
    do! console.print("Hello from Lambdawg!")
}
```

---
