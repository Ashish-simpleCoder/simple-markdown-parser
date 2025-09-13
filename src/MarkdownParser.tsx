class MarkdownParser {
   rules = {
      blockItem: {
         // headers
         h1: /^# (.+)$/gm,
         h2: /^## (.+)$/gm,
         h3: /^### (.+)$/gm,

         unorderedList: /^[\s]*[\-\*\+][\s]+(.+)$/gm,
         orderedList: /^[\s]*\d+\.[\s]+(.+)$/gm,


         blockquote: /^> (.+)$/g,
         hr: /^[\s]*[-*_]{3,}[\s]*$/g,
      },
      inlineItem: {
         // inline-element and they can be present anywhere, even inside any other elements, so regex is according to that-------------
         bold: /\*\*(.+?)\*\*/g,
         italic: /\*(.+?)\*/g,
         link: /\[(.+?)\]\((.+?)\)/g,
         code: /`(.+?)`/g,
         codeBlock: /```([\s\S]*?)```/g,
         image: /!\[(.+?)\]\((.+?)\)({width=\d+ height=\d+})?/g,
      }
   }
   static execFn = {
      codeBlock: (line: string) => /^\`{3}([\s\S]*?)\`{3}$/g.exec(line),
      ul: (line: string) => /^([ ]{0,})?[\-\*\+][ ](\[[ \\x]\])?(.+)$/m.exec(line), // Putting "m" flag, because line might have "\s" characters at beginning.
      ol: (line: string) => /^([ ]{0,})?\d+.[ ](\[[ \\x]\])?(.+)$/m.exec(line), // Putting "m" flag, because line might have "\s" characters at beginning.
      heading: (line: string) => /^(#{1,3}) (.+)$/g.exec(line),
      blockquote: (line: string) => /^> (.+)$/g.exec(line),
      hr: (line: string) => /^[\s]*[-*_]{3,}[\s]*$/g.exec(line),
      img: (line: string) => /^!\[(.+?)\]\((.+?)\)/g.exec(line),
      htmlTag: (line: string) => /<([a-z]*)\b[^>]*>(.*?)<\/\1>/.exec(line)
   }

   constructor() {

   }

   splitHtmlStringByBlockElement(html: string) {
      const codeBlocks: string[] = [];
      const placeholder = '###CODEBLOCK###';

      let processedString = html.replace(/\`{3}[\s\S]*?\`{3}/gm, (match) => {
         codeBlocks.push(match)

         return `${placeholder}${codeBlocks.length - 1}${placeholder}`
      })

      // split line-by in following sequence with below regx
      // 1. heading
      // 2. blockquote
      // 3. hr
      // 4. ul
      // 5. ol
      // 6. line-terminator (needed to split content present with codeblock to make them paragraphs)
      // 7. codeblock-placeholder
      let result = processedString.split(/^(#{1,3} .+$|> *.+$|[\s]*[-*_]{3,}[\s]*$|[\s]{0,}[\-\*\+] +.+$|[\s]{0,}\d+. .+$|[.+\n]|###CODEBLOCK###\d+###CODEBLOCK###$)/gm)


      // Restore code blocks in the results
      const mappedResult = result.filter(section => {
         // remove all of the blocks containing only white-space characters
         const newLineRegx = /^\s*$/g
         return !newLineRegx.exec(section)
      }).map(section => {
         return section.replace(new RegExp(`${placeholder}(\\d+)${placeholder}`, 'g'),
            (match, index) => `${codeBlocks[parseInt(index)]}`
         );
      });

      return mappedResult
   }

   generateHTML_From_HtmlArrayOfString(html: string[]) {
      let htmlResult: string[] = []
      let listItems: string[] = []

      for (let index = 0; index < html.length; index++) {
         const line = html[index]

         // code block parsing
         const codeBlockExec = MarkdownParser.execFn.codeBlock(line)
         if (codeBlockExec) {
            if (listItems.length > 0) {
               const res = parseList(listItems, (content) => this.parseAllInlineElementsWithinAnElement([content]))
               if (res) {
                  htmlResult.push(res.innerHTML)
               }
               listItems = []
            }

            const [wholeCodeBlock, codeBlockContent] = codeBlockExec
            htmlResult.push(`<pre data-line='${index}'><code>${codeBlockContent}</code></pre>`)
            continue
         }
         // list parsing
         const ulExec = MarkdownParser.execFn.ul(line)
         const olExec = MarkdownParser.execFn.ol(line)

         // ul/ol parsing
         if (ulExec || olExec) {
            listItems.push(line)
         } else {
            // adding of the list items to htmlResult
            if (listItems.length > 0) {
               const res = parseList(listItems, (content) => this.parseAllInlineElementsWithinAnElement([content]))
               if (res) {
                  htmlResult.push(res.innerHTML)
               }
               listItems = []
            }

            // heading parsing
            const headingExec = MarkdownParser.execFn.heading(line)
            if (headingExec) {
               const [wholeHeading, headingVariant, headingContent] = headingExec
               let parsedHeadingContent = this.parseAllInlineElementsWithinAnElement([headingContent])

               if (headingVariant == '#') {
                  htmlResult.push(`<h1 data-line='${index}'>${parsedHeadingContent}</h1>`)
               } else if (headingVariant == "##") {
                  htmlResult.push(`<h2 data-line='${index}'>${parsedHeadingContent}</h2>`)
               } else if (headingVariant == "###") {
                  htmlResult.push(`<h3 data-line='${index}'>${parsedHeadingContent}</h3>`)
               }
               continue
            }

            // blockquote parsing
            const blockquoteExec = MarkdownParser.execFn.blockquote(line)
            if (blockquoteExec) {
               const [wholeBlockquote, blockquoteContent] = blockquoteExec
               htmlResult.push(`<blockquote data-line='${index}'>${blockquoteContent}</blockquote>`)
               continue
            }

            // hr parsing
            const hrExec = MarkdownParser.execFn.hr(line)
            if (hrExec) {
               htmlResult.push(`<hr data-line='${index}'/>`)
               continue
            }

            const splittedLines = line.split("\n\n")   // To count multiple lines with \n as single paragraph. Which allows to write one paragraph in multiple lines.
            for (const content of splittedLines) {
               if (content.trim()) {
                  // if content is valid html tag then insert as it is.
                  const tagExec = MarkdownParser.execFn.htmlTag(content)
                  if (tagExec) {
                     const [wholeHtmlTag] = tagExec
                     htmlResult.push(wholeHtmlTag)
                  } else {
                     // parsing everything as paragraph
                     const paragraph = this.parseAllInlineElementsWithinAnElement([content])
                     htmlResult.push(`<p data-line='${index}'>${paragraph}</p>`)
                  }
               }
            }
         }
      }

      // adding of the list items to htmlResult
      if (listItems.length > 0) {
         const res = parseList(listItems, (content) => this.parseAllInlineElementsWithinAnElement([content]))
         if (res) {
            htmlResult.push(res.innerHTML)
         }
         listItems = []
      }
      return htmlResult.join("\n")
   }

   parseAllInlineElementsWithinAnElement(elementMarkdownStringLine: string[]) {
      let joinedStr = elementMarkdownStringLine.reduce((acc, item, index) => {
         const isLastIndex = elementMarkdownStringLine.length > 1 ? index == elementMarkdownStringLine.length - 1 : false
         let preWhitespace = isLastIndex ? " " : ""

         let parsedItemWithRegx = item

         if (this.rules.inlineItem.image.test(parsedItemWithRegx)) {
            parsedItemWithRegx = item.replace(this.rules.inlineItem.image, preWhitespace + `<img src='$2' alt='$1' $3 />`)
         }
         if (this.rules.inlineItem.codeBlock.test(parsedItemWithRegx)) {
            parsedItemWithRegx = parsedItemWithRegx.replace(this.rules.inlineItem.codeBlock, preWhitespace + '<code>$1</code>')
         }
         if (this.rules.inlineItem.code.test(parsedItemWithRegx)) {
            parsedItemWithRegx = parsedItemWithRegx.replace(this.rules.inlineItem.code, preWhitespace + '<code>$1</code>')
         }
         if (this.rules.inlineItem.bold.test(parsedItemWithRegx)) {
            parsedItemWithRegx = parsedItemWithRegx.replace(this.rules.inlineItem.bold, preWhitespace + '<strong>$1</strong>')
         }
         if (this.rules.inlineItem.italic.test(parsedItemWithRegx)) {
            parsedItemWithRegx = parsedItemWithRegx.replace(this.rules.inlineItem.italic, preWhitespace + '<em>$1</em>')
         }
         if (this.rules.inlineItem.link.test(parsedItemWithRegx)) {
            parsedItemWithRegx = parsedItemWithRegx.replace(this.rules.inlineItem.link, preWhitespace + '<a href="$2">$1</a>')
         }
         acc += preWhitespace + parsedItemWithRegx

         return acc
      }, '')
      return joinedStr
   }
}