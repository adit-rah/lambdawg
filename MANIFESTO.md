# The Lambdawg Manifesto

## Purpose

Lambdawg exists to address a painful corner of programming: the tension between **functional purity** and **real-world software development**.  
Most functional languages solve hard problems (immutability, types, safety), but often at the cost of approachability or practicality.  
Lambdawg aims to strike a new balance.

---

## Core Principles

### 1. Functions First
Everything is a function. Composition, not mutation, is the default mode of thought.

### 2. Dogpiling Parallelism
Pure functions should not require boilerplate to run in parallel.  
In Lambdawg, parallelism is the default. Sequential execution must be requested explicitly.

### 3. Honest Effects
No hidden exceptions, no silent global state. Effects are declared and visible.  
Side effects use `do` and `do!` to distinguish sequencing from external actions.

### 4. Ambient Lambdas
Context should flow naturally. A function can declare dependencies (e.g. a `db`, `logger`) without requiring explicit threading everywhere.  
The compiler ensures the right context is in scope, removing verbosity while keeping safety.

### 5. Clarity Over Cleverness
Syntax should be readable by a junior developer but principled enough for a functional programming veteran.  
No unnecessary symbols. No magic. No cleverness for its own sake.

### 6. Errors Are Values
Errors are not exceptions. They are values (`Ok`, `Error`) to be passed and handled with intent.

### 7. Approachability
The language should be learnable in hours, usable in days, and deep enough to reward mastery over years.

---

## Implementation Philosophy

### Why JavaScript?

Lambdawg transpiles to JavaScript as its first compilation target. This is a deliberate choice:

1. **Zero Friction**  
   No toolchain installation. No compiler setup. Write Lambdawg in a browser playground and see it run instantly.

2. **Validation Speed**  
   Building a native compiler takes years. Transpiling to JavaScript lets us validate the language design in weeks, iterate on feedback, and evolve the language while people are actually using it.

3. **Real Parallelism**  
   Web Workers provide genuine parallel execution. Lambdawg's "parallelism by default" model maps directly to worker-based concurrency.

4. **Ecosystem Access**  
   The JavaScript ecosystem is massive. Through `import js`, Lambdawg programs can use existing libraries, frameworks, and tools without waiting for a native standard library.

5. **Promises = Effects**  
   JavaScript's `async/await` and `Promise` model aligns naturally with Lambdawg's `do`/`do!` effect system. The translation is clean and intuitive.

### Approachability First

When faced with a design choice, we ask: **"Would this confuse a developer seeing Lambdawg for the first time?"**

- If adding a feature makes the language more powerful but harder to learn, we pause.
- If removing ceremony makes code clearer without sacrificing safety, we proceed.
- If two approaches are equally valid, we choose the one that reads more like English.

Adoption enables impact. A language no one uses helps no one, regardless of how elegant its semantics are.

### Future Targets

JavaScript is the first target, not the only target. The architecture allows for future backends:

- **Native compilation** (via LLVM or Cranelift) for performance-critical applications
- **WebAssembly** for portable, sandboxed execution
- **Other runtimes** (JVM, .NET) if demand warrants

The language design is intentionally backend-agnostic. Features like parallelism hints and effect tracking will translate to different runtime strategies depending on the target.

---

## What Lambdawg Is Not

- It is not a toy language. The design assumes real-world use: I/O, concurrency, and system integration.
- It is not an academic puzzle. Mathematical purity is respected, but never worshipped at the cost of clarity.
- It is not yet another syntax experiment. Its unique value lies in **parallelism + explicit effects + ambient lambdas**.

---

## Call to Builders

Lambdawg is an open invitation:

- To functional programmers tired of boilerplate.
- To imperative programmers curious about clarity without fear.
- To researchers and engineers who believe languages should evolve around human needs, not just theory.

The goal is not perfection. The goal is usefulness.

---
