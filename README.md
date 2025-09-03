# Simple Markdown Parser

<img width="1358" height="653" alt="image" src="https://github.com/user-attachments/assets/08da9fd8-9eae-47c3-9d39-3119e7f3a8da" />


## Todos

Checklist that I have decided to complete.


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

1. Start Watcher
```sh
    npm run watch
```

2. Run server
```sh
npx vite
```