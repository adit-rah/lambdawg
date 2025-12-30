// Monaco language definition for Lambdawg

export function registerLambdawgLanguage(monaco) {
  // Register language
  monaco.languages.register({ id: 'lambdawg' });

  // Define syntax highlighting
  monaco.languages.setMonarchTokensProvider('lambdawg', {
    keywords: [
      'let', 'type', 'module', 'import', 'export', 'private',
      'if', 'then', 'else', 'match', 'with', 'provide', 'in',
      'do', 'seq', 'parallel', 'as', 'from'
    ],
    
    typeKeywords: [
      'Int', 'Float', 'String', 'Bool', 'Char', 'Unit',
      'List', 'Option', 'Result', 'Some', 'None', 'Ok', 'Error'
    ],
    
    operators: [
      '=>', '->', '|>', '+', '-', '*', '/', '%', '==', '!=',
      '<', '>', '<=', '>=', '&&', '||', '!', '?', '...', '='
    ],
    
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    
    tokenizer: {
      root: [
        // Comments
        [/--.*$/, 'comment'],
        [/\{-/, 'comment', '@comment'],
        
        // Identifiers and keywords
        [/[a-z_][\w]*/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier'
          }
        }],
        
        [/[A-Z][\w]*/, {
          cases: {
            '@typeKeywords': 'type',
            '@default': 'type.identifier'
          }
        }],
        
        // Numbers
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        [/0[oO][0-7]+/, 'number.octal'],
        [/0[bB][01]+/, 'number.binary'],
        [/\d+\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/\d+/, 'number'],
        
        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string'],
        
        // Characters
        [/'[^']*'/, 'string.char'],
        
        // Delimiters and operators
        [/[{}()\[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [/@symbols/, {
          cases: {
            '@operators': 'operator',
            '@default': ''
          }
        }],
        
        // Whitespace
        [/\s+/, 'white'],
      ],
      
      comment: [
        [/[^{-]+/, 'comment'],
        [/-\}/, 'comment', '@pop'],
        [/[{-]/, 'comment']
      ],
      
      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop']
      ],
    },
  });

  // Configure language
  monaco.languages.setLanguageConfiguration('lambdawg', {
    comments: {
      lineComment: '--',
      blockComment: ['{-', '-}']
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    indentationRules: {
      increaseIndentPattern: /^.*\{[^}]*$/,
      decreaseIndentPattern: /^.*\}.*$/
    }
  });

  // Auto-completion
  monaco.languages.registerCompletionItemProvider('lambdawg', {
    provideCompletionItems: (model, position) => {
      const suggestions = [
        // Keywords
        ...['let', 'type', 'module', 'import', 'if', 'then', 'else', 'match', 'do', 'with'].map(kw => ({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw,
        })),
        
        // Built-in functions
        ...['map', 'filter', 'fold', 'sum', 'length', 'head', 'tail', 'show'].map(fn => ({
          label: fn,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: fn,
          detail: 'Built-in function',
        })),
        
        // Types
        ...['Ok', 'Error', 'Some', 'None'].map(type => ({
          label: type,
          kind: monaco.languages.CompletionItemKind.Constructor,
          insertText: type,
          detail: 'Type constructor',
        })),
      ];
      
      return { suggestions };
    },
  });
}

