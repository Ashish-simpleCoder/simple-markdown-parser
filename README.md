# Simple Markdown Parser

**Simple Markdown Parser** is a lightweight, high-performance markdown parser that converts markdown content directly into JSX.

<img width="1891" height="1045" alt="image" src="https://github.com/user-attachments/assets/f725be9d-0dd0-41d1-abb1-5cb45071e7d6" />


## 🛠️ Tech Stack
- React 18 with TypeScript
- pnpm v10.34.4
- Node.js v24.17.0

## 🚀 Architecture
<img width="4514" height="3161" alt="image" src="https://github.com/user-attachments/assets/7ddb6f30-88f4-4ba1-9b0f-431b0880bc31" />

The parsing process is managed by `src/parsers/index.tsx` using a three-phase pipeline:

1.  **Pre-processing (`preParse`):**
    *   The raw markdown string is passed through a "preParserLane" of utility functions (`src/parsers/utils/helpers.ts`).
    *   This phase handles encoding code content, replacing code blocks and HTML blocks with placeholders, and splitting the raw markdown into manageable block tokens while filtering out unnecessary whitespace. This is crucial for isolating structured data from plain text.

2.  **Conversion to HTML (`convertTokensToHtml`):**
    *   The pre-processed tokens are converted into an Abstract Syntax Tree (AST) using `ASTGenerator`.
    *   The parser iterates through this AST, identifying block types (headings, blockquotes, horizontal rules, lists, code blocks).
    *   **List Handling & Caching:** Lists are special-cased. When a list item is encountered, it's collected into a buffer. Once a non-list item appears, or the end of the content is reached, `flushPendingList` is called. This function uses a `MapCache` (`src/parsers/utils/MapCache.ts`) to store and retrieve previously generated list HTML, preventing expensive re-parsing of unchanged list structures—a key performance feature mentioned in the `README`.
    *   **Inline Formatting:** Within paragraphs and headings, `processInlineFormatting` uses a set of ordered regex rules (`src/parsers/constants/regxRules.constant.ts`) to replace markdown syntax (`**`, `*`, `[]()`, etc.) with appropriate HTML tags.

3.  **HTML to JSX (`convertHtmlToReactNode`):**
    *   The resulting intermediate HTML strings are joined and parsed into a temporary DOM structure using the browser's native `DOMParser`.
    *   A utility function (`src/parsers/utils/convertDomToReact.ts`) then traverses this DOM structure and converts it into a recursive React element tree, effectively rendering the markdown as JSX.

### Key Implementation Details

| Feature | Implementation Component | Notes |
| :--- | :--- | :--- |
| **Parsing to JSX** | `convertHtmlToReactNode` + `convertDomToReact` | Converts intermediate HTML to a React node tree. |
| **High-Performance Lists** | `ListParser` | A custom utility specifically designed for non-recursive, high-performance list processing. |
| **List Caching** | `MapCache` | Used in `flushPendingList` to memoize list output based on content. |
| **Regex Parsing** | `regxRules.constant.ts` | Defines the patterns for all markdown elements (headings, bold, italic, links, images, code). |


## 📝 Roadmap

* [x] Markdown to JSX parsing
* [x] HTML inside markdown to JSX
* [x] Headings
  * [x] `#` → h1
  * [x] `##` → h2
  * [x] `###` → h3
* [x] Inline elements
  * [x] Bold (`**bold**`)
  * [x] Italic (`*italic*`)
  * [x] Inline code (`code`)
  * [x] Links (`[text](url)`)
* [x] Images
  * [x] JSX image rendering
  * [x] `alt` attribute support
  * [x] Custom width & height attributes
* [x] Ordered & Unordered Lists (OL / UL)
  * [x] Simple list generation
  * [x] Nested list generation
  * [x] Checklist parsing
    * [x] Simple checklist
    * [x] Checked & unchecked states
  * [x] Non-recursive list rendering (high performance)
  * [x] List rendering caching using
* [x] Horizontal rule (`hr`)
* [x] Blockquotes
* [x] Code blocks
* [x] Paragraph rendering
* [ ] HTML parsing as real HTML
  * [ ] HTML sanitization
  * [x] Basic HTML parsing
* [ ] Frontmatter support
* [ ] Custom blocks
  * [ ] Warning
  * [ ] Info
  * [ ] Error
  * [ ] Success
  * [ ] Details (`<details>` element)
<!--* [ ] Table of Contents (TOC)-->
* [ ] Comment parsing

---


## Running on local

1. Install dependencies
```sh
pnpm i
```

2. Running server
```sh
pnpm run dev
```
