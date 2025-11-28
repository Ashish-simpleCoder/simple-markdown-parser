# Simple Markdown Parser

<img width="1358" height="653" alt="image" src="https://github.com/user-attachments/assets/08da9fd8-9eae-47c3-9d39-3119e7f3a8da" />


## How It works
<img width="3236" height="2642" alt="image" src="https://github.com/user-attachments/assets/106eaff2-9ad9-41d4-9e8d-566b39f591c3" />


## Features
- Parse markdown into JSX.
- Parse html present in markdown into jsx.
- Render any amount of `ol` and `ul` list independently or nested inside each other. `No Recursion`. So it is very performant.
- `Caching` feature for caching `ol` and `ul` list output in the `mapCache` too prevent going through re-generation of lists if they are not changed.
- Render `checkbox` in list items.

## Full feature checklist

- [x] Three heading variants (#, ##, ###).
    - [x] h1
    - [x] h2
    - [x] h3
- [x] Inline elements -> bold(**bold**), italic(*italic*), link([text](text.com)) and code(`code`)
- [x] Image
    - [x] render image element
    - [x] `alt` attr
    - [x] dimension attr (width & height)
- [x] OL and UL
    - [x] simple list generation
    - [ ] nested list generation 
    - [x] checklist parsing
        - [x] simple checklist
        - [x] two states -> 1.checked, 2.unchecked 
    - [ ] optimization
- [x] hr
- [x] blockquote
- [x] codeblock
- [x] simple paragraph
- [ ] Parsing html content as html
    - [ ] santizing html
    - [ ] html parsing
- [ ] Frontmatter
- [ ] Custom blocks
    - [ ] warning
    - [ ] info
    - [ ] error
    - [ ] success
    - [ ] details element
- [ ] Table of Content(TOC)
- [ ] Comments parsing
- [ ] Error handling and fallback to paragraphs



## Running on local

1. Install dependencies
```sh
pnpm i
```

2. Running server
```sh
pnpm run dev
```
