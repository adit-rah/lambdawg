#!/usr/bin/env node

/**
 * Simple CLI Compiler for Lambdawg
 * 
 * Usage:
 *   node examples/cli-compiler.js input.lw [-o output.js] [--run]
 */

import { compile, formatCompilerErrors } from '../dist/index.js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
Lambdawg Compiler CLI

Usage:
  node examples/cli-compiler.js <input.lw> [options]

Options:
  -o, --output <file>    Write output to file (default: stdout)
  -r, --run              Run the compiled JavaScript
  -c, --check            Check without generating code
  --no-typecheck         Skip type checking
  -h, --help             Show this help

Examples:
  node examples/cli-compiler.js example.lw
  node examples/cli-compiler.js example.lw -o output.js
  node examples/cli-compiler.js example.lw --run
  node examples/cli-compiler.js example.lw --check
  `);
}

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  printUsage();
  process.exit(0);
}

const inputFile = args[0];
let outputFile = null;
let shouldRun = false;
let checkOnly = false;
let skipTypeCheck = false;

// Parse arguments
for (let i = 1; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '-o' || arg === '--output') {
    outputFile = args[++i];
  } else if (arg === '-r' || arg === '--run') {
    shouldRun = true;
  } else if (arg === '-c' || arg === '--check') {
    checkOnly = true;
  } else if (arg === '--no-typecheck') {
    skipTypeCheck = true;
  }
}

try {
  // Read input file
  const inputPath = resolve(inputFile);
  const source = readFileSync(inputPath, 'utf-8');
  
  console.error(`Compiling ${inputFile}...`);
  
  // Compile
  const result = compile(source, {
    filename: inputFile,
    skipTypeCheck,
  });
  
  // Handle errors
  if (!result.success) {
    console.error('\n❌ Compilation failed:\n');
    console.error(formatCompilerErrors(result.errors));
    process.exit(1);
  }
  
  // Handle warnings
  if (result.warnings.length > 0) {
    console.error('\n⚠️  Warnings:\n');
    console.error(formatCompilerErrors(result.warnings));
  }
  
  console.error('✅ Compilation successful!');
  
  if (checkOnly) {
    console.error('✓ Type checking passed');
    process.exit(0);
  }
  
  // Output
  if (outputFile) {
    const outputPath = resolve(outputFile);
    writeFileSync(outputPath, result.code, 'utf-8');
    console.error(`Written to ${outputFile}`);
  } else if (!shouldRun) {
    console.log(result.code);
  }
  
  // Run
  if (shouldRun) {
    console.error('\n─── Running ───\n');
    
    // Execute the compiled code
    try {
      eval(result.code);
    } catch (error) {
      console.error('\n❌ Runtime error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}


