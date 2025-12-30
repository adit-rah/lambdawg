# Lambdawg Playground Features

## ✅ Implemented Features

### Editor
- **Monaco Editor** - The same editor that powers VS Code
- **Syntax Highlighting** - Custom Lambdawg language definition with:
  - Keywords: `let`, `type`, `module`, `if`, `match`, `do`, etc.
  - Types: `Int`, `String`, `Result`, `Option`, etc.
  - Constructors: `Ok`, `Error`, `Some`, `None`
  - Operators: `=>`, `|>`, `...`, etc.
  - Comments: `--` single-line and `{- -}` block comments
- **Auto-completion** - Suggestions for keywords, functions, and types
- **Auto-closing pairs** - Brackets, quotes, etc.
- **Live Error Checking** - Errors appear as you type with inline markers
- **Line Numbers & Minimap** - Full IDE experience

### Compilation & Execution
- **Instant Compilation** - Compile Lambdawg to JavaScript in the browser
- **Live Status** - See compilation status (✓ Ready / ✗ N errors)
- **Error Display** - Beautiful error messages with source locations
- **JavaScript Output** - View the transpiled JavaScript code
- **AST Viewer** - Explore the abstract syntax tree
- **Runtime Execution** - Run code directly in the browser
- **Console Capture** - See console.log output

### UI/UX
- **Split View** - Editor on left, output on right
- **Multiple Tabs** - Switch between Output, JavaScript, and AST
- **Dark Theme** - Modern, easy on the eyes
- **Responsive Design** - Works on desktop and mobile
- **Resizable Panels** - Adjust layout to your preference

### Examples Library
Built-in examples to learn Lambdawg:
1. **Hello World** - Basic syntax
2. **Pipeline** - Data transformation with `|>`
3. **Pattern Matching** - `match` expressions
4. **Result Types** - Error handling with `Ok`/`Error`
5. **Modules** - Code organization

### Sharing & Persistence
- **Share via URL** - Code is encoded in the URL hash
- **One-click Copy** - Copy shareable link to clipboard
- **Auto-restore** - Code persists across page reloads
- **Bookmarkable** - Save your work in browser bookmarks

## Technical Architecture

### Stack
- **Vite** - Fast build tool and dev server
- **Monaco Editor** - Full-featured code editor
- **Lambdawg Compiler** - Direct import from `../dist`
- **Vanilla JavaScript** - No framework overhead

### Performance
- **Fast Startup** - < 300ms initial load
- **Debounced Checking** - Type checking runs 500ms after typing
- **Efficient Compilation** - Runs in main thread (< 10ms for most code)
- **Lazy Loading** - Monaco loads on demand

### Browser Support
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)

## Future Enhancements (Ideas)

### Editor
- [ ] Multiple file support
- [ ] Tab management
- [ ] File tree navigation
- [ ] Find & replace across files
- [ ] Code formatting
- [ ] Snippet library

### Compilation
- [ ] Source maps
- [ ] Compile errors in problems panel
- [ ] Type information on hover
- [ ] Go to definition
- [ ] Find references

### Debugging
- [ ] Breakpoints
- [ ] Step debugging
- [ ] Variable inspection
- [ ] Call stack view

### Sharing
- [ ] GitHub Gist integration
- [ ] Save to browser storage
- [ ] Export as files
- [ ] Import from files

### Learning
- [ ] Interactive tutorials
- [ ] Inline documentation
- [ ] Code challenges
- [ ] Community examples

### Mobile
- [ ] Touch-optimized controls
- [ ] Gesture support
- [ ] Mobile-first layout

### Advanced
- [ ] Language Server Protocol (LSP)
- [ ] WebAssembly compilation
- [ ] Offline support (PWA)
- [ ] Collaborative editing
- [ ] Version control integration

## Development

### File Structure
```
playground/
├── index.html          # Entry point
├── package.json        # Dependencies
├── vite.config.js      # Vite config
└── src/
    ├── main.js         # App logic (400 lines)
    ├── language.js     # Language definition (150 lines)
    └── styles.css      # UI styles (200 lines)
```

### Key Functions
- `initPlayground()` - Initialize editor and UI
- `checkCode()` - Run type checking and show errors
- `runCode()` - Compile and execute code
- `shareCode()` - Generate shareable URL
- `registerLambdawgLanguage()` - Monaco language setup

### Customization
All colors and styles are in CSS variables - easy to theme!

```css
:root {
  --primary: #667eea;
  --secondary: #764ba2;
  --bg-dark: #1e1e1e;
  /* ... more */
}
```

## Contributing

Want to improve the playground? Here's how:

1. **Bug fixes** - Open an issue with reproduction steps
2. **Features** - Discuss in issues before implementing
3. **Examples** - Add to the `getExample()` function
4. **Themes** - Submit alternate color schemes

## Credits

Built with:
- Monaco Editor by Microsoft
- Vite by Evan You
- Lambdawg by the Lambdawg team

Made with 🐕 and ❤️

