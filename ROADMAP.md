# Lambdawg Roadmap

This document outlines the phased implementation plan for Lambdawg.  
Each phase builds on the previous, delivering usable value at each step.

---

## Overview

```
Phase 1: Playground          →  People can try Lambdawg in a browser
Phase 2: CLI Transpiler      →  People can build real projects
Phase 3: Standard Library    →  People can be productive
Phase 4: Tooling             →  People can work efficiently
Phase 5: Native (Optional)   →  People can optimize for performance
```

---

## Phase 1: Language Playground

**Goal**: A browser-based environment where anyone can write and run Lambdawg code.

**Deliverables**:
- [ ] Lexer and parser for core syntax
- [ ] Type checker with inference
- [ ] Basic JavaScript code generator
- [ ] Web-based editor with syntax highlighting
- [ ] Live output panel (console, errors)
- [ ] Shareable code links

**Scope**:
- Core types: `Int`, `Float`, `String`, `Bool`, `List`, `Option`, `Result`
- Functions, pattern matching, pipelines
- Basic `do`/`do!` effects (console output only)
- No parallelism yet (sequential execution)
- No ambient lambdas yet

**Success Criteria**:
- A developer can write FizzBuzz in Lambdawg and see output
- Type errors are reported with helpful messages
- Code can be shared via URL

**Estimated Effort**: 4-6 weeks

---

## Phase 2: CLI Transpiler

**Goal**: A command-line tool that transpiles `.dawg` files to JavaScript.

**Deliverables**:
- [ ] `lambdawg build` command
- [ ] `lambdawg run` command (build + execute via Node.js)
- [ ] `lambdawg check` command (type check without building)
- [ ] Multi-file project support
- [ ] Module system (`import`, `module`)
- [ ] Source maps for debugging
- [ ] Watch mode for development

**Scope**:
- Full module system
- Ambient lambdas (`with`, `provide`)
- JavaScript interop (`import js`)
- Error propagation (`?`, `do?`)
- File I/O effects

**Success Criteria**:
- A developer can create a multi-file project
- `lambdawg run main.dawg` executes the program
- Errors point to correct source locations

**Estimated Effort**: 6-8 weeks

---

## Phase 3: Standard Library

**Goal**: A comprehensive standard library for common tasks.

**Deliverables**:
- [ ] `core` - fundamental functions (`identity`, `compose`, `pipe`)
- [ ] `list` - list operations (`map`, `filter`, `fold`, `sort`, etc.)
- [ ] `string` - string manipulation
- [ ] `option` - Option type utilities
- [ ] `result` - Result type utilities
- [ ] `io` - file system operations
- [ ] `http` - HTTP client
- [ ] `json` - JSON parsing and serialization
- [ ] `time` - date and time utilities
- [ ] `random` - random number generation
- [ ] `regex` - regular expressions

**Documentation**:
- [ ] API reference for each module
- [ ] Usage examples
- [ ] Searchable documentation website

**Success Criteria**:
- Common tasks don't require JavaScript interop
- Documentation is comprehensive and searchable
- Examples cover typical use cases

**Estimated Effort**: 8-12 weeks

---

## Phase 4: Tooling

**Goal**: First-class developer experience in modern editors.

**Deliverables**:

### Language Server (LSP)
- [ ] Syntax highlighting
- [ ] Error diagnostics (inline)
- [ ] Type information on hover
- [ ] Go to definition
- [ ] Find references
- [ ] Auto-completion
- [ ] Rename symbol

### VS Code Extension
- [ ] LSP integration
- [ ] Snippet support
- [ ] Run/debug commands
- [ ] Problem panel integration

### Formatter
- [ ] `lambdawg fmt` command
- [ ] Consistent code style
- [ ] Editor integration (format on save)

### Linter
- [ ] `lambdawg lint` command
- [ ] Unused variable warnings
- [ ] Style suggestions
- [ ] Custom rule support

**Success Criteria**:
- VS Code provides a Lambdawg development experience comparable to TypeScript
- Code formatting is automatic and consistent
- Common mistakes are caught before running

**Estimated Effort**: 8-10 weeks

---

## Phase 5: Parallelism

**Goal**: Deliver on the "parallelism by default" promise.

**Deliverables**:
- [ ] Purity analysis in the compiler
- [ ] Web Worker code generation for parallel `map`/`filter`
- [ ] `seq` modifier implementation
- [ ] `@parallel()` hints
- [ ] Runtime scheduler for work distribution
- [ ] Performance benchmarks

**Technical Approach**:
1. Compiler marks functions as pure/impure
2. Pipeline operations on lists check purity
3. Pure operations generate Web Worker dispatch code
4. Results are collected and merged
5. Impure operations or `seq` fall back to sequential

**Success Criteria**:
- Parallel `map` over 10,000 items shows measurable speedup
- Adding `seq` correctly forces sequential execution
- No parallelism overhead for small collections

**Estimated Effort**: 6-8 weeks

---

## Phase 6: Package Manager (Future)

**Goal**: Share and reuse Lambdawg libraries.

**Deliverables**:
- [ ] Package registry (similar to npm)
- [ ] `lambdawg.json` manifest file
- [ ] `lambdawg add <package>` command
- [ ] `lambdawg publish` command
- [ ] Version resolution and lock files
- [ ] Private package support

**Deferred Until**:
- Community shows demand for shared libraries
- Standard library is stable

---

## Phase 7: Native Compilation (Future)

**Goal**: High-performance native binaries for compute-intensive applications.

**Deliverables**:
- [ ] LLVM or Cranelift backend
- [ ] Native parallelism (threads, not Web Workers)
- [ ] Ahead-of-time compilation
- [ ] Cross-compilation support

**Deferred Until**:
- JavaScript target is mature
- Clear performance requirements emerge
- Community demand justifies investment

---

## Current Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Playground | Not Started | Next milestone |
| Phase 2: CLI | Not Started | |
| Phase 3: Stdlib | Not Started | |
| Phase 4: Tooling | Not Started | |
| Phase 5: Parallelism | Not Started | |
| Phase 6: Packages | Future | |
| Phase 7: Native | Future | |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get involved.

Priority areas:
1. Language design feedback
2. Playground development
3. Documentation and examples

---

## Timeline

This roadmap represents idealized sequencing. Actual timelines depend on:
- Number of contributors
- Community feedback requiring design changes
- Technical discoveries during implementation

The goal is **working software over comprehensive planning**. Each phase delivers value; we don't wait for perfection.

---

