# Simple Markdown Parser

**Simple Markdown Parser** is a lightweight, high-performance markdown parser that converts markdown content directly into JSX. It is designed for modern React-based applications where performance, predictability, and fine-grained control over rendering are critical.

The parser avoids expensive recursive strategies and instead uses **iterative list processing** with caching to efficiently render ordered and unordered lists—even when deeply nested. It also supports inline HTML within markdown, checklist items, image attributes etc.

<img width="1358" height="653" alt="image" src="https://github.com/user-attachments/assets/08da9fd8-9eae-47c3-9d39-3119e7f3a8da" />


## How It works
<img width="3236" height="2642" alt="image" src="https://github.com/user-attachments/assets/106eaff2-9ad9-41d4-9e8d-566b39f591c3" />


## Features
- Parse markdown into JSX.
- Parse html present in markdown into jsx.
- Render any amount of `ol` and `ul` list independently or nested inside each other. `No Recursion`. So it is very performant.
- `Caching` feature for caching `ol` and `ul` list output in the `mapCache` too prevent going through re-generation of lists if they are not changed.
- Render `checkbox` in list items.


## Features & Roadmap

* [x] **Markdown to JSX parsing**
* [x] **HTML inside markdown to JSX**
* [x] **Headings**
  * [x] `#` → h1
  * [x] `##` → h2
  * [x] `###` → h3
* [x] **Inline elements**
  * [x] Bold (`**bold**`)
  * [x] Italic (`*italic*`)
  * [x] Inline code (`` `code` ``)
  * [x] Links (`[text](url)`)
* [x] **Images**
  * [x] JSX image rendering
  * [x] `alt` attribute support
  * [x] Width & height attributes
* [x] **Ordered & Unordered Lists (OL / UL)**
  * [x] Simple list generation
  * [ ] Nested list generation
  * [x] Checklist parsing
    * [x] Simple checklist
    * [x] Checked & unchecked states
  * [x] Non-recursive list rendering (high performance)
  * [x] Cached list rendering using `mapCache`
* [x] **Horizontal rule (`hr`)**
* [x] **Blockquotes**
* [x] **Code blocks**
* [x] **Paragraph rendering**
* [ ] **HTML parsing as real HTML**
  * [ ] HTML sanitization
  * [x] Basic HTML parsing
* [ ] **Frontmatter support**
* [ ] **Custom blocks**
  * [ ] Warning
  * [ ] Info
  * [ ] Error
  * [ ] Success
  * [ ] Details (`<details>` element)
* [ ] **Table of Contents (TOC)**
* [ ] **Comment parsing**

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
