import { describe, it, expect } from 'vitest';
import { compile, check } from './compiler.js';

describe('Compiler', () => {
  describe('compile', () => {
    it('compiles a simple expression', () => {
      const result = compile('let x = 42');
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('const x = 42');
    });

    it('compiles a function', () => {
      const result = compile('let add = (a, b) => a + b');
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('const add = (a, b) => (a + b)');
    });

    it('compiles a pipeline', () => {
      const result = compile(`
        let nums = [1, 2, 3]
        let doubled = nums |> map((x) => x * 2, _)
      `);
      
      if (!result.success) {
        console.log('Pipeline errors:', result.errors);
      }
      expect(result.success).toBe(true);
      expect(result.code).toContain('__lw.pipe');
    });

    it('compiles an if expression', () => {
      const result = compile('let x = if true then 1 else 2');
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('true ? 1 : 2');
    });

    it('compiles a do block', () => {
      const result = compile(`
        let main = (arg) => do {
          let x = 1
          x
        }
      `);
      
      if (!result.success) {
        console.log('Do block errors:', result.errors);
      }
      expect(result.success).toBe(true);
      expect(result.code).toContain('async');
    });

    it('compiles pattern matching', () => {
      const result = compile(`
        let describe = (n) => match n {
          0 => "zero"
          1 => "one"
          _ => "other"
        }
      `);
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('__subject');
    });

    it('compiles records', () => {
      const result = compile('let point = { x: 10, y: 20 }');
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('{ x: 10, y: 20 }');
    });

    it('compiles partial application', () => {
      const result = compile(`
        let add = (a, b) => a + b
        let add5 = add(5, _)
      `);
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('__p0');
    });

    it('compiles modules', () => {
      const result = compile(`
        module math {
          let add = (a, b) => a + b
          let mul = (a, b) => a * b
        }
      `);
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('const math = ');
      expect(result.code).toContain('return { add, mul }');
    });
  });

  describe('check', () => {
    it('detects undefined variables', () => {
      const result = check('let x = y + 1');
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.code).toBe('T002');
    });

    it('passes valid code', () => {
      const result = check(`
        let x = 42
        let y = x + 1
      `);
      
      expect(result.success).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('error reporting', () => {
    it('reports parse errors with location', () => {
      const result = compile('let x = ');
      
      expect(result.success).toBe(false);
      expect(result.errors[0]?.span).toBeDefined();
    });
  });
});

