class MarkdownParser {
   rules = {
      // headers
      h1: /^# (.+)$/gm,
      h2: /^## (.+)$/gm,
      h3: /^### (.+)$/gm,

      // inline-element and they can be present anywhere, even inside any other elements, so regex is according to that-------------
      // text formatting
      bold: /\*\*(.+?)\*\*/g,
      italic: /\*(.+?)\*/g,
      link: /\[(.+?)\]\((.+?)\)/g,
      code: /`(.+?)`/g,
      codeBlock: /```([\s\S]*?)```/g,
      // inline-element and they can be present anywhere, even inside any other elements, so regex is according to that-------------end

      image: /!\[(.+?)\]\((.+?)\)/g,

      unorderedList: /^[\s]*[\-\*\+][\s]+(.+)$/gm,
      orderedList: /^[\s]*\d+\.[\s]+(.+)$/gm,


      blockquote: /^> (.+)$/g,
      hr: /^[\s]*[-*_]{3,}[\s]*$/g,

      // replace more than twice or twice newlines into single new-line
      // newLine: /\r\r+|\n\n+/gm
      // newLine: /\r+|\n+/gm
   }

   constructor() {

   }

   splitByBlockElementMarkdown(html: string) {
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
      let result = processedString.split(/^(#{1,3} .+$|> *.+$|[\s]*[-*_]{3,}[\s]*$|[\-\*\+][\s]+.+$|\d. .+$|[.+\n]|###CODEBLOCK###\d+###CODEBLOCK###$)/gm)

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

   convertToElement(html: string[]) {
      let htmlResult: string[] = []

      let isULRunning = false
      let isOLRunning = false

      for (let index = 0; index < html.length; index++) {
         const line = html[index]

         // code block parsing
         const codeBlockExec = /^\`{3}([\s\S]*?)\`{3}$/gm.exec(line)
         if (codeBlockExec) {
            // if ol-running, then close it off
            if (isOLRunning) {
               htmlResult.push("</ol>")
               isOLRunning = false
            }
            // if ul-running, then close it off
            if (isULRunning) {
               htmlResult.push("</ul>")
               isULRunning = false
            }

            const [wholeCodeBlock, codeBlockContent] = codeBlockExec
            htmlResult.push(`<pre data-line='${index}'><code>${codeBlockContent}</code></pre>`)
            continue
         }

         // list parsing
         const ulExec = /^[\-\*\+][\s]+(.+)$/g.exec(line)
         const olExec = /^\d. (.+)$/g.exec(line)

         if (ulExec) {
            // if ol-running, then close it off
            if (isOLRunning) {
               htmlResult.push("</ol>")
               isOLRunning = false
            }

            // start fresh ul
            if (!isULRunning) {
               htmlResult.push(`<ul data-line='${index}'>`)
               isULRunning = true
            }

            const [wholeUl, ulContent] = ulExec
            let parsedUlContent = this.parseAllInlineElementsWithinAnElement([ulContent])
            htmlResult.push(`<li data-line='${index}'>${parsedUlContent}</li>`)
         }
         else if (olExec) {
            // if ul-running, then close it off
            if (isULRunning) {
               htmlResult.push("</ul>")
               isULRunning = false
            }

            // start fresh ol
            if (!isOLRunning) {
               htmlResult.push(`<ol data-line='${index}'>`)
               isOLRunning = true
            }

            const [wholeOl, olContent] = olExec
            let parsedOlContent = this.parseAllInlineElementsWithinAnElement([olContent])
            htmlResult.push(`<li data-line='${index}'>${parsedOlContent}</li>`)
         } else {
            if (isOLRunning) {
               htmlResult.push("</ol>")
               isOLRunning = false
            }
            if (isULRunning) {
               htmlResult.push("</ul>")
               isULRunning = false
            }

            // heading parsing
            const headingExec = /^(#{1,3}) (.+)$/g.exec(line)
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
            const blockquoteExec = /^> (.+)$/g.exec(line)
            if (blockquoteExec) {
               const [wholeBlockquote, blockquoteContent] = blockquoteExec
               htmlResult.push(`<blockquote data-line='${index}'>${blockquoteContent}</blockquote>`)
               continue
            }


            // hr parsing
            const hrExec = /^[\s]*[-*_]{3,}[\s]*$/g.exec(line)
            if (hrExec) {
               htmlResult.push(`<hr data-line='${index}'/>`)
               continue
            }

            const splittedLines = line.split("\n\n")   // To count multiple lines with \n as single paragraph. Which allows to write one paragraph in multiple lines.

            for (const content of splittedLines) {
               // img parsing
               const imgExec = /^!\[(.+?)\]\((.+?)\)/gm.exec(content)
               if (imgExec) {
                  const [wholeImg, imgAlt, imgSrc] = imgExec
                  htmlResult.push(`<img data-line='${index}' src='${imgSrc}' alt='${imgAlt}' />`)
                  continue
               }

               if (content.trim()) {
                  // if content is valid html tag then insert as it is.
                  const tagExec = /<([a-z]*)\b[^>]*>(.*?)<\/\1>/.exec(content)
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
      if (isOLRunning) {
         htmlResult.push("</ol>")
         isOLRunning = false
      }
      if (isULRunning) {
         htmlResult.push("</ul>")
         isULRunning = false
      }

      return htmlResult.join("\n")
   }

   parseInlineFormatting(html: string, startWhiteSpace = "") {
      // parsing bold before italic to handle nested formatting
      // ***this is bold and italic***
      // **this is bold**
      // *this is italic*
      html = html.replace(this.rules.bold, startWhiteSpace + '<strong>$1</strong>')
      html = html.replace(this.rules.italic, startWhiteSpace + '<em>$1</em>')
      html = html.replace(this.rules.link, startWhiteSpace + '<a href="$2">$1</a>')
      return html
   }


   parseAllInlineElementsWithinAnElement(elementMarkdownStringLine: string[]) {
      let joinedStr = elementMarkdownStringLine.reduce((acc, item, index) => {
         const isLastIndex = elementMarkdownStringLine.length > 1 ? index == elementMarkdownStringLine.length - 1 : false
         let preWhitespace = isLastIndex ? " " : ""

         let parsedItemWithRegx = item

         if (this.rules.codeBlock.test(item)) {
            parsedItemWithRegx = item.replace(this.rules.codeBlock, preWhitespace + '<code>$1</code>')
         } else if (this.rules.code.test(item)) {
            parsedItemWithRegx = item.replace(this.rules.code, preWhitespace + '<code>$1</code>')
         } else if (this.rules.bold.test(item) || this.rules.italic.test(item) || this.rules.link.test(item)) {
            parsedItemWithRegx = this.parseInlineFormatting(item, preWhitespace)
         }
         acc += preWhitespace + parsedItemWithRegx

         return acc
      }, '')
      return joinedStr
   }
}