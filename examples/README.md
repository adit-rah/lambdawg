# Lambdawg Examples

This directory contains examples of how to use the Lambdawg compiler and sandbox environment.

## Quick Start

### 1. Build the Compiler

First, make sure you've built the compiler:

```bash
npm run build
```

### 2. Run the Basic Examples

```bash
node examples/basic-usage.js
```

This will show you various compilation examples including:
- Simple variable declarations
- Pipeline operations
- Pattern matching
- Error handling with Result types
- Compilation error handling

### 3. Use the Browser Sandbox

The sandbox provides an interactive web interface to write and run Lambdawg code:

```bash
# Start a local server (any will work)
npx http-server . -p 8080

# Then open in your browser:
# http://localhost:8080/examples/sandbox.html
```

Features:
- Live code editing
- Instant compilation feedback
- View generated JavaScript
- Execute code in the browser
- Beautiful UI with syntax highlighting

### 4. Use the CLI Compiler

Compile and run Lambdawg files from the command line:

```bash
# Compile a file and output JavaScript
node examples/cli-compiler.js your-file.lw

# Compile and save to a file
node examples/cli-compiler.js your-file.lw -o output.js

# Compile and run immediately
node examples/cli-compiler.js your-file.lw --run

# Check for errors without generating code
node examples/cli-compiler.js your-file.lw --check
```

## Example Lambdawg Programs

### Hello World

```lambdawg
let main with console = () => do {
  do! console.print("Hello, Lambdawg!")
}
```

### Data Processing Pipeline

```lambdawg
let processNumbers = (nums) =>
  nums
  |> map((x) => x * 2, _)
  |> filter((x) => x > 10, _)
  |> sum(_)

let result = processNumbers([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
```

### Pattern Matching

```lambdawg
let fizzbuzz = (n) => match { a: n % 3, b: n % 5 } {
  { a: 0, b: 0 } => "FizzBuzz"
  { a: 0 } => "Fizz"
  { b: 0 } => "Buzz"
  _ => show(n)
}
```

### Error Handling

```lambdawg
let safeDivide = (a, b) =>
  if b == 0 then Error("division by zero")
  else Ok(a / b)

let compute = (x, y) => match safeDivide(x, y) {
  Ok(result) => result * 2
  Error(msg) => 0
}
```

### Modules

```lambdawg
module math {
  let add = (a, b) => a + b
  let multiply = (a, b) => a * b
  let square = (x) => multiply(x, x)
}

let result = math.square(5)
```

## Programmatic API

You can also use the compiler in your own Node.js or browser applications:

```javascript
import { compile, formatCompilerErrors } from '@lambdawg/compiler';

const source = `
  let x = 42
  let y = x + 8
`;

const result = compile(source, {
  filename: 'example.lw',
  skipTypeCheck: false,
  emit: {
    runtime: 'browser', // or 'node'
    minify: false,
    sourceMap: false,
  }
});

if (result.success) {
  console.log('Compiled JavaScript:');
  console.log(result.code);
  
  // Execute it
  eval(result.code);
} else {
  console.error('Compilation errors:');
  console.error(formatCompilerErrors(result.errors));
}
```

## Runtime Environment

The compiled JavaScript includes a small runtime (`__lw`) that provides:

- **Result types**: `Ok(value)`, `Error(error)`
- **Option types**: `Some(value)`, `None`
- **List operations**: `map`, `filter`, `fold`, `sum`, `length`, `head`, `tail`
- **Utilities**: `show` (JSON.stringify), `tap`, `pipe`, `identity`
- **Pattern matching helpers**

All of these are automatically included in the compiled output, so your code just works!

## Tips

1. **Debugging**: Use the browser sandbox to quickly test ideas and see the generated JavaScript
2. **Learning**: Check the test files in `src/` to see more examples of what the compiler supports
3. **Contributing**: If you find bugs or want to add features, see `CONTRIBUTING.md`

## What Works Now

The compiler currently supports:

- ✅ Variables and constants (`let`)
- ✅ Functions and lambdas (`=>`)
- ✅ Pipelines (`|>`)
- ✅ Pattern matching (`match`)
- ✅ Records and lists (`{}`, `[]`)
- ✅ Partial application (`_`)
- ✅ Do blocks (`do { }`)
- ✅ Modules
- ✅ Basic type checking
- ✅ JavaScript interop

## What's Coming

Check `ROADMAP.md` for planned features like:
- Advanced type inference
- Effect system
- Ambient context (with/provide)
- Parallel execution hints
- More optimizations

Happy coding! 🐕


