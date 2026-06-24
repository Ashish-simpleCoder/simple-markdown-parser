# Markdown Parser Testing Guide

This project uses a layered testing strategy to ensure the reliability of the custom Markdown parser. The tests are built using **Vitest** and **React Testing Library**.

## Testing Architecture

The parser is tested in distinct layers, reflecting its internal data processing pipeline:

1.  **`preParser.test.ts`**: Validates raw input handling, whitespace filtering, and code block/HTML block extraction.
2.  **`astGenerator.test.ts`**: Validates the conversion of tokens into an Abstract Syntax Tree (AST), ensuring correct node classification (headings, lists, quotes, etc.).
3.  **`htmlConverter.test.ts`**: Validates the conversion of the AST into final HTML, including list batching, `data-line` attributes, and feature flag handling.
4.  **`inlineParser.test.ts`**: Validates regex-based inline formatting (bold, italic, links, code, images).
5.  **`integration.test.ts`**: Provides end-to-end verification of the full `MarkdownParser` pipeline.

## Running Tests

### Standard Execution
To run the entire test suite:
```bash
pnpm test
```

### Running Specific Layers
If you are working on a specific part of the parser, you can run only the relevant test file:
```bash
# Example: Only run HTML conversion tests
pnpm test src/parsers/__tests__/htmlConverter.test.ts
```

### Watch Mode
To run tests in watch mode (useful during active development):
```bash
pnpm test --watch
```

## Adding New Features

When adding new syntax (e.g., Tables or Task Lists), follow this workflow:

1.  **Regex Updates**: Add your patterns to `regxRules.constant`.
2.  **AST Update**: Add classification logic to `ASTGenerator`.
3.  **Parser Update**: Add the handling logic to `convertTokensToHtml` in `index.tsx`.
4.  **Add Tests**: 
    *   Add unit tests for any new regex in `inlineParser.test.ts`.
    *   Add structural tests to `astGenerator.test.ts`.
    *   Add integration tests to verify the full flow in `integration.test.ts`.
