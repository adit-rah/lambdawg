import { describe, it, expect } from 'vitest';
import { tokenize } from './lexer.js';
import { TokenType } from './tokens.js';

describe('Lexer', () => {
  it('tokenizes literals', () => {
    const { tokens } = tokenize('42 3.14 "hello" true false');
    
    expect(tokens[0]?.type).toBe(TokenType.INT);
    expect(tokens[0]?.value).toBe(42);
    
    expect(tokens[1]?.type).toBe(TokenType.FLOAT);
    expect(tokens[1]?.value).toBe(3.14);
    
    expect(tokens[2]?.type).toBe(TokenType.STRING);
    expect(tokens[2]?.value).toBe('hello');
    
    expect(tokens[3]?.type).toBe(TokenType.TRUE);
    expect(tokens[4]?.type).toBe(TokenType.FALSE);
  });

  it('tokenizes identifiers and keywords', () => {
    const { tokens } = tokenize('let foo = 42');
    
    expect(tokens[0]?.type).toBe(TokenType.LET);
    expect(tokens[1]?.type).toBe(TokenType.IDENT);
    expect(tokens[1]?.lexeme).toBe('foo');
    expect(tokens[2]?.type).toBe(TokenType.EQ);
    expect(tokens[3]?.type).toBe(TokenType.INT);
  });

  it('tokenizes type identifiers', () => {
    const { tokens } = tokenize('type Point = { x: Int }');
    
    expect(tokens[0]?.type).toBe(TokenType.TYPE);
    expect(tokens[1]?.type).toBe(TokenType.TYPE_IDENT);
    expect(tokens[1]?.lexeme).toBe('Point');
    // type Point = { x : Int }
    // 0    1     2 3 4 5 6   7
    expect(tokens[6]?.type).toBe(TokenType.TYPE_IDENT);
    expect(tokens[6]?.lexeme).toBe('Int');
  });

  it('tokenizes operators', () => {
    const { tokens } = tokenize('a + b |> map => ->');
    
    expect(tokens[1]?.type).toBe(TokenType.PLUS);
    expect(tokens[3]?.type).toBe(TokenType.PIPE);
    expect(tokens[5]?.type).toBe(TokenType.FAT_ARROW);
    expect(tokens[6]?.type).toBe(TokenType.ARROW);
  });

  it('handles comments', () => {
    const { tokens } = tokenize('let x = 1 -- comment\nlet y = 2');
    
    // let x = 1 (comment ignored) let y = 2
    // Should have 8 tokens: let, x, =, 1, let, y, =, 2
    expect(tokens.filter(t => t.type !== TokenType.EOF).length).toBe(8);
  });

  it('handles block comments', () => {
    const { tokens } = tokenize('let x {- block comment -} = 1');
    
    expect(tokens[0]?.type).toBe(TokenType.LET);
    expect(tokens[1]?.type).toBe(TokenType.IDENT);
    expect(tokens[2]?.type).toBe(TokenType.EQ);
  });

  it('tokenizes do! correctly', () => {
    const { tokens } = tokenize('do! console.print("hi")');
    
    expect(tokens[0]?.type).toBe(TokenType.DO);
    expect(tokens[1]?.type).toBe(TokenType.BANG);
  });

  it('reports unterminated string', () => {
    const { errors } = tokenize('"unterminated');
    
    expect(errors.length).toBe(1);
    expect(errors[0]?.code).toBe('L002');
  });

  it('tokenizes spread operator', () => {
    const { tokens } = tokenize('{ ...obj, x: 1 }');
    
    expect(tokens[1]?.type).toBe(TokenType.DOTDOTDOT);
  });

  it('tokenizes hex, binary, octal numbers', () => {
    const { tokens } = tokenize('0xFF 0b1010 0o755');
    
    expect(tokens[0]?.value).toBe(255);
    expect(tokens[1]?.value).toBe(10);
    expect(tokens[2]?.value).toBe(493);
  });
});

