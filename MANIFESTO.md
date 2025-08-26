
---

### `MANIFESTO.md`
```markdown
# The Lambdawg Manifesto

## Purpose

Lambdawg exists to address a painful corner of programming: the tension between **functional purity** and **real-world software development**.  
Most functional languages solve hard problems (immutability, types, safety), but often at the cost of approachability or practicality.  
Lambdawg aims to strike a new balance.

## Core Principles

1. **Functions First**  
   Everything is a function. Composition, not mutation, is the default mode of thought.

2. **Dogpiling Parallelism**  
   Pure functions should not require boilerplate to run in parallel.  
   In Lambdawg, parallelism is the default. Sequential execution must be requested explicitly.

3. **Honest Effects**  
   No hidden exceptions, no silent global state. Effects are declared and visible.  
   Side effects use `do` and `do!` to distinguish sequencing from external actions.

4. **Ambient Lambdas**  
   Context should flow naturally. A function can declare dependencies (e.g. a `db`, `logger`) without requiring explicit threading everywhere.  
   The compiler ensures the right context is in scope, removing verbosity while keeping safety.

5. **Clarity Over Cleverness**  
   Syntax should be readable by a junior developer but principled enough for a functional programming veteran.  
   No unnecessary symbols. No magic. No cleverness for its own sake.

6. **Errors Are Values**  
   Errors are not exceptions. They are values (`Ok`, `Error`) to be passed and handled with intent.

7. **Approachability**  
   The language should be learnable in hours, usable in days, and deep enough to reward mastery over years.

## What Lambdawg Is Not

- It is not a toy language. The design assumes real-world use: I/O, concurrency, and system integration.  
- It is not an academic puzzle. Mathematical purity is respected, but never worshipped at the cost of clarity.  
- It is not yet another syntax experiment. Its unique value lies in **parallelism + explicit effects + ambient lambdas**.

## Call to Builders

Lambdawg is an open invitation:  
- To functional programmers tired of boilerplate.  
- To imperative programmers curious about clarity without fear.  
- To researchers and engineers who believe languages should evolve around human needs, not just theory.

The goal is not perfection. The goal is usefulness.  
