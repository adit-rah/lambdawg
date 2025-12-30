import * as monaco from 'monaco-editor';
import { compile, formatCompilerErrors } from '../../dist/index.js';
import { registerLambdawgLanguage } from './language.js';
import './styles.css';

// Register Lambdawg language
registerLambdawgLanguage(monaco);

// Initialize the playground
document.addEventListener('DOMContentLoaded', () => {
  initPlayground();
});

function initPlayground() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <header class="header">
      <div class="header-content">
        <h1>🐕 Lambdawg Playground</h1>
        <p>Functional programming with clarity, parallelism, and honest effects</p>
      </div>
      <div class="header-actions">
        <select id="examples" class="select">
          <option value="">Load Example...</option>
          <option value="hello">Hello World</option>
          <option value="pipeline">Pipeline</option>
          <option value="pattern">Pattern Matching</option>
          <option value="result">Result Types</option>
          <option value="module">Modules</option>
        </select>
        <button id="run" class="btn btn-primary">▶ Run</button>
        <button id="share" class="btn btn-secondary">🔗 Share</button>
      </div>
    </header>

    <div class="main">
      <div class="panel editor-panel">
        <div class="panel-header">
          <span class="panel-title">Lambdawg Code</span>
          <div class="panel-actions">
            <span id="status" class="status"></span>
          </div>
        </div>
        <div id="editor" class="editor"></div>
      </div>

      <div class="resizer"></div>

      <div class="panel output-panel">
        <div class="tabs">
          <button class="tab active" data-tab="output">Output</button>
          <button class="tab" data-tab="javascript">JavaScript</button>
          <button class="tab" data-tab="ast">AST</button>
        </div>
        <div class="tab-content">
          <div id="output-tab" class="tab-pane active">
            <pre id="output" class="output">Click "Run" to compile and execute your code.</pre>
          </div>
          <div id="javascript-tab" class="tab-pane">
            <pre id="javascript" class="output"></pre>
          </div>
          <div id="ast-tab" class="tab-pane">
            <pre id="ast" class="output"></pre>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize Monaco editor
  const editor = monaco.editor.create(document.getElementById('editor'), {
    value: getDefaultCode(),
    language: 'lambdawg',
    theme: 'vs-dark',
    fontSize: 14,
    minimap: { enabled: false },
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    scrollBeyondLastLine: false,
  });

  // Load from URL hash if present
  const hash = window.location.hash.slice(1);
  if (hash) {
    try {
      const code = decodeURIComponent(atob(hash));
      editor.setValue(code);
    } catch (e) {
      console.error('Failed to load code from URL', e);
    }
  }

  // Setup event listeners
  setupEventListeners(editor);
  
  // Auto-compile on change (debounced)
  let compileTimeout;
  editor.onDidChangeModelContent(() => {
    clearTimeout(compileTimeout);
    compileTimeout = setTimeout(() => {
      checkCode(editor);
    }, 500);
  });

  // Initial check
  checkCode(editor);
}

function setupEventListeners(editor) {
  // Run button
  document.getElementById('run').addEventListener('click', () => {
    runCode(editor);
  });

  // Share button
  document.getElementById('share').addEventListener('click', () => {
    shareCode(editor);
  });

  // Examples dropdown
  document.getElementById('examples').addEventListener('change', (e) => {
    if (e.target.value) {
      editor.setValue(getExample(e.target.value));
      e.target.value = '';
    }
  });

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });
}

function checkCode(editor) {
  const code = editor.getValue();
  const status = document.getElementById('status');
  
  try {
    const result = compile(code, { filename: 'playground.lw' });
    
    if (result.success) {
      status.textContent = '✓ Ready';
      status.className = 'status status-success';
      
      // Clear error markers
      monaco.editor.setModelMarkers(editor.getModel(), 'lambdawg', []);
    } else {
      status.textContent = `✗ ${result.errors.length} error${result.errors.length > 1 ? 's' : ''}`;
      status.className = 'status status-error';
      
      // Set error markers
      const markers = result.errors.map(err => ({
        severity: monaco.MarkerSeverity.Error,
        startLineNumber: err.span?.start.line || 1,
        startColumn: err.span?.start.column || 1,
        endLineNumber: err.span?.end.line || 1,
        endColumn: err.span?.end.column || 1,
        message: err.message,
      }));
      
      monaco.editor.setModelMarkers(editor.getModel(), 'lambdawg', markers);
    }
  } catch (e) {
    status.textContent = '✗ Error';
    status.className = 'status status-error';
  }
}

function runCode(editor) {
  const code = editor.getValue();
  const outputEl = document.getElementById('output');
  const jsEl = document.getElementById('javascript');
  const astEl = document.getElementById('ast');
  
  outputEl.textContent = '⚙ Compiling...\n';
  
  try {
    const result = compile(code, { filename: 'playground.lw' });
    
    // Show JavaScript
    jsEl.textContent = result.code || 'No output generated';
    
    // Show AST
    astEl.textContent = result.ast ? JSON.stringify(result.ast, null, 2) : 'No AST available';
    
    if (!result.success) {
      outputEl.textContent = '✗ Compilation failed:\n\n' + formatCompilerErrors(result.errors);
      switchTab('output');
      return;
    }
    
    outputEl.textContent = '✓ Compilation successful!\n\n';
    
    // Capture console output
    const logs = [];
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => logs.push(['log', ...args]);
    console.error = (...args) => logs.push(['error', ...args]);
    
    try {
      // Execute the code
      eval(result.code);
      
      if (logs.length > 0) {
        outputEl.textContent += '─── Console Output ───\n\n';
        logs.forEach(([type, ...args]) => {
          const formatted = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ');
          outputEl.textContent += formatted + '\n';
        });
      } else {
        outputEl.textContent += 'Code executed successfully (no console output)\n';
      }
      
      // Show some defined variables
      const variables = ['x', 'y', 'nums', 'result', 'total', 'point', 'main'];
      const defined = [];
      
      for (const varName of variables) {
        try {
          const value = eval(varName);
          if (value !== undefined) {
            const display = typeof value === 'function' ? '[Function]' : JSON.stringify(value);
            defined.push(`${varName} = ${display}`);
          }
        } catch (e) {
          // Variable doesn't exist
        }
      }
      
      if (defined.length > 0) {
        outputEl.textContent += '\n─── Defined Variables ───\n\n';
        outputEl.textContent += defined.join('\n');
      }
      
    } catch (error) {
      outputEl.textContent += '✗ Runtime error:\n\n';
      outputEl.textContent += error.message + '\n';
      outputEl.textContent += error.stack;
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
    
    switchTab('output');
    
  } catch (error) {
    outputEl.textContent = '✗ Unexpected error:\n\n' + error.message + '\n' + error.stack;
    switchTab('output');
  }
}

function shareCode(editor) {
  const code = editor.getValue();
  const encoded = btoa(encodeURIComponent(code));
  const url = window.location.origin + window.location.pathname + '#' + encoded;
  
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('share');
    const original = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => {
      btn.textContent = original;
    }, 2000);
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `${tabName}-tab`);
  });
}

function getDefaultCode() {
  return `-- Welcome to Lambdawg!
-- Try editing the code and clicking Run

let nums = [1, 2, 3, 4, 5]

let doubled = nums |> map((x) => x * 2, _)
let total = doubled |> sum(_)

let describe = (n) => match n {
  0 => "zero"
  1 => "one"
  _ => "many"
}

let point = { x: 10, y: 20 }
let moved = { ...point, x: 15 }
`;
}

function getExample(name) {
  const examples = {
    hello: `-- Hello World in Lambdawg

let greeting = "Hello, Lambdawg!"
let message = greeting + " Welcome to functional programming!"
`,
    
    pipeline: `-- Pipeline Operations
-- Pure functions compose beautifully

let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

let result = numbers
  |> map((x) => x * x, _)
  |> filter((x) => x > 25, _)
  |> sum(_)

-- Result should be: 36 + 49 + 64 + 81 + 100 = 330
`,
    
    pattern: `-- Pattern Matching
-- Destructure and match data elegantly

let describe = (value) => match value {
  0 => "zero"
  1 => "one"
  2 => "two"
  n if n < 0 => "negative"
  n if n > 100 => "large"
  _ => "other"
}

let first = describe(0)
let second = describe(1)
let big = describe(150)

-- Match on lists
let listDesc = (list) => match list {
  [] => "empty"
  [x] => "single: " + show(x)
  [x, y] => "pair: " + show(x) + ", " + show(y)
  _ => "multiple items"
}
`,
    
    result: `-- Result Types for Error Handling
-- No exceptions, errors are values

let safeDivide = (a, b) =>
  if b == 0 then Error("division by zero")
  else Ok(a / b)

let goodResult = safeDivide(10, 2)
let badResult = safeDivide(10, 0)

-- Option types for nullable values
let findFirst = (list) =>
  if length(list) > 0 then Some(list[0])
  else None

let nums = [42, 17, 99]
let firstNum = findFirst(nums)
let emptyFirst = findFirst([])
`,
    
    module: `-- Modules organize your code

module math {
  let add = (a, b) => a + b
  let multiply = (a, b) => a * b
  let square = (x) => multiply(x, x)
  
  let pi = 3.14159
  let circleArea = (r) => pi * square(r)
}

module list {
  let sum = (xs) => xs |> sum(_)
  let avg = (xs) => sum(xs) / length(xs)
  let max = (xs) => xs |> fold((a, b) => if a > b then a else b, xs[0], _)
}

let area = math.circleArea(5)
let nums = [1, 2, 3, 4, 5]
let average = list.avg(nums)
`,
  };
  
  return examples[name] || getDefaultCode();
}

