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
