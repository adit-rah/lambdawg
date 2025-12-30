/**
 * Basic Usage Example - Using the Lambdawg Compiler
 * 
 * This shows how to compile Lambdawg code to JavaScript and run it.
 */

import { compile, formatCompilerErrors } from '../dist/index.js';

// Example 1: Simple compilation
console.log('=== Example 1: Simple Compilation ===\n');

const simpleCode = `
let x = 42
let y = x + 8
`;

const result1 = compile(simpleCode, { filename: 'example.lw' });

if (result1.success) {
  console.log('✓ Compilation successful!\n');
  console.log('Generated JavaScript:');
  console.log('─'.repeat(50));
  console.log(result1.code);
  console.log('─'.repeat(50) + '\n');
  
  // Run the compiled code
  console.log('Running compiled code...');
  eval(result1.code);
  console.log('x =', x);
  console.log('y =', y);
} else {
  console.error('✗ Compilation failed:');
  console.error(formatCompilerErrors(result1.errors));
}

// Example 2: Function with pipeline
console.log('\n=== Example 2: Pipeline Operations ===\n');

const pipelineCode = `
let nums = [1, 2, 3, 4, 5]
let result = nums |> map((x) => x * 2, _) |> filter((x) => x > 5, _) |> sum(_)
`;

const result2 = compile(pipelineCode);

if (result2.success) {
  console.log('✓ Compilation successful!\n');
  console.log('Generated JavaScript:');
  console.log('─'.repeat(50));
  console.log(result2.code);
  console.log('─'.repeat(50) + '\n');
  
  console.log('Running compiled code...');
  eval(result2.code);
  console.log('Result:', result);
}

// Example 3: Pattern matching
console.log('\n=== Example 3: Pattern Matching ===\n');

const matchCode = `
let describe = (n) => match n {
  0 => "zero"
  1 => "one"
  2 => "two"
  _ => "many"
}
`;

const result3 = compile(matchCode);

if (result3.success) {
  console.log('✓ Compilation successful!\n');
  console.log('Generated JavaScript (truncated):');
  console.log('─'.repeat(50));
  console.log(result3.code.substring(0, 500) + '...');
  console.log('─'.repeat(50) + '\n');
  
  console.log('Running compiled code...');
  eval(result3.code);
  console.log('describe(0) =', describe(0));
  console.log('describe(1) =', describe(1));
  console.log('describe(5) =', describe(5));
}

// Example 4: Error handling
console.log('\n=== Example 4: Error Handling ===\n');

const errorCode = `
let safeDivide = (a, b) =>
  if b == 0 then Error("division by zero")
  else Ok(a / b)
`;

const result4 = compile(errorCode);

if (result4.success) {
  console.log('✓ Compilation successful!\n');
  console.log('Running compiled code...');
  eval(result4.code);
  
  const okResult = safeDivide(10, 2);
  const errResult = safeDivide(10, 0);
  
  console.log('safeDivide(10, 2) =', okResult);
  console.log('safeDivide(10, 0) =', errResult);
}

// Example 5: Compilation error
console.log('\n=== Example 5: Handling Compilation Errors ===\n');

const badCode = `
let x = y + 1  -- y is not defined
`;

const result5 = compile(badCode, { filename: 'bad.lw' });

if (!result5.success) {
  console.log('✗ Compilation failed (as expected):\n');
  console.log(formatCompilerErrors(result5.errors));
}


