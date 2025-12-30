# Lambdawg Playground

A modern web-based IDE for the Lambdawg programming language, built with Monaco Editor (the editor that powers VS Code).

## Features

- **Monaco Editor** - Full-featured code editor with syntax highlighting
- **Live Error Checking** - See errors as you type with inline markers
- **Instant Compilation** - Compile and run Lambdawg code in the browser
- **Multiple Views** - Switch between Output, JavaScript, and AST views
- **Example Library** - Load examples to learn Lambdawg features
- **Code Sharing** - Share your code via URL
- **Auto-save** - Code is preserved in the URL hash

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Open http://localhost:3000
```

### Build for Production

```bash
# Build static files
npm run build

# Preview the build
npm run preview
```

## Usage

1. **Write Code** - Type or paste Lambdawg code in the editor
2. **See Errors** - Syntax and type errors appear inline as you type
3. **Run Code** - Click "Run" to compile and execute
4. **View Output** - See results in the Output tab
5. **Share** - Click "Share" to copy a shareable URL

## Keyboard Shortcuts

- `Ctrl/Cmd + S` - Format code
- `Ctrl/Cmd + /` - Toggle comment
- `Ctrl/Cmd + F` - Find
- `Ctrl/Cmd + H` - Find and replace

## Examples

The playground includes several examples:

- **Hello World** - Basic syntax
- **Pipeline** - Data transformation with pipelines
- **Pattern Matching** - Destructuring and matching
- **Result Types** - Error handling with Result and Option
- **Modules** - Code organization

## Technology Stack

- **Monaco Editor** - Code editing
- **Vite** - Build tool and dev server
- **Lambdawg Compiler** - Language compilation (from `../dist`)

## Project Structure

```
playground/
├── index.html          # Entry point
├── package.json        # Dependencies
├── vite.config.js      # Vite configuration
└── src/
    ├── main.js         # Main application logic
    ├── language.js     # Lambdawg language definition
    └── styles.css      # UI styles
```

## Deployment

The playground is a static site and can be deployed to:

- **GitHub Pages**
- **Netlify**
- **Vercel**
- **Any static hosting**

Just run `npm run build` and deploy the `dist/` directory.

## Tips

- The playground uses the compiled compiler from `../dist`, so make sure to run `npm run build` in the root directory first
- Code is automatically saved in the URL hash - bookmark your work!
- Use the JavaScript tab to see the transpiled output
- Use the AST tab to explore the syntax tree

## Contributing

Found a bug or want to add a feature? The playground is part of the main Lambdawg project. See the root `CONTRIBUTING.md` for details.

Happy coding! 🐕

