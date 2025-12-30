# Lambdawg

Lambdawg is an experimental functional programming language focused on **clarity, parallelism, and honesty about effects**.  
It explores the idea that functional programming should be both **principled** and **practical**, without requiring academic gymnastics to get work done.

## Why Lambdawg?

- **Dogpiling Parallelism**: Pure functions parallelize automatically. Sequential execution is explicit, not assumed.
- **Ambient Lambdas**: Context (like `db` or `logger`) flows through the program without verbose plumbing.
- **Honest Effects**: All I/O and side-effects are explicit — no hidden exceptions or invisible global state.
- **Readable Syntax**: A design that values clarity as much as mathematical rigor.

## Example

```lambdawg
import json

let processLogs with json = (path) => do {
    let lines = do! file.readLines(path)
    lines
    |> parallel map (line => json.parse(line))
    |> filter (log => log.level == "ERROR")
    |> map (log => { time: log.timestamp, msg: log.message })
}

let main with logger = () => do {
    let errors = processLogs("logs.json")
    do! logger.info("Found " + length(errors) + " errors")
}
```

## Getting Started

### Installation & Building

```bash
# Install dependencies
npm install

# Build the compiler
npm run build

# Run tests
npm test
```

### Using the Compiler

#### 1. Interactive Browser Sandbox

The easiest way to try Lambdawg:

```bash
# Start a local server
npx http-server . -p 8080

# Open http://localhost:8080/examples/sandbox.html
```

The sandbox provides a live editor where you can write Lambdawg code, see the compiled JavaScript, and run it instantly!

#### 2. Node.js Examples

```bash
# Run basic examples
node examples/basic-usage.js
```

#### 3. CLI Compiler

```bash
# Compile a Lambdawg file
node examples/cli-compiler.js examples/example.lw

# Compile and run
node examples/cli-compiler.js examples/example.lw --run

# Save to file
node examples/cli-compiler.js examples/example.lw -o output.js
```

#### 4. Programmatic API

```javascript
import { compile } from '@lambdawg/compiler';

const result = compile(`let x = 42`);

if (result.success) {
  console.log(result.code);
  eval(result.code); // Run it!
}
```

See the `examples/` directory for more detailed examples and documentation.

## Documentation

- **[SYNTAX.md](SYNTAX.md)** - Complete syntax guide
- **[SPEC.md](SPEC.md)** - Language specification
- **[ROADMAP.md](ROADMAP.md)** - Future plans
- **[examples/README.md](examples/README.md)** - Usage examples and tutorials
