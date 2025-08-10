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
      code: /`(.+?)`/g,
      link: /\[(.+?)\]\((.+?)\)/g,
      // inline-element and they can be present anywhere, even inside any other elements, so regex is according to that-------------end

      image: /!\[(.+?)\]\((.+?)\)/g,

      unorderedList: /^[\s]*[\-\*\+][\s]+(.+)$/gm,
      orderedList: /^[\s]*\d+\.[\s]+(.+)$/gm,

      codeBlock: /```([\s\S]*?)```/g,

      blockquote: /^>[\s]*(.+)$/gm,

      hr: /^[\s]*[-*_]{3,}[\s]*$/gm,

      // replace more than twice or twice newlines into single new-line
      // newLine: /\r\r+|\n\n+/gm
      // newLine: /\r+|\n+/gm
   }

   constructor() {

   }
   splitByBlockElementMarkdown(html: string) {
      // split string with followings
      // 1. heading elments as they are block elements
      // 2. blockquote
      // 3. codeblock
      // 4. lists
      // 5. HR

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
      let result = processedString.split(/^(#{1,3} .+$|> *.+$|[\s]*[-*_]{3,}[\s]*$|[\-\*\+][\s]+.+$|\d. .+)/gm)
      // let result = processedString.split(/^(#{1,3} .+$|> *.+$|[\s]*[-*_]{3,}[\s]*$|[\-\*\+][\s]+.+$|\d. .+)/gm)


      // Restore code blocks in the results
      return result.filter(section => {
         const newLineRegx = /^\s*$/g
         return !newLineRegx.exec(section)
      }).map(section => {
         return section.replace(new RegExp(`${placeholder}(\\d+)${placeholder}`, 'g'),
            (match, index) => `${codeBlocks[parseInt(index)]}`
            // (match, index) => `${placeholder}${codeBlocks[parseInt(index)]}${placeholder}`
         );
      });
   }

   convertToElement(html: string[]) {
      let htmlResult: string[] = []
      let isULRunning = false
      let isOLRunning = false

      for (const line of html) {
         // code block parsing
         const codeBlockExec = /\`{3}([\s\S]*?)\`{3}/gm.exec(line)
         if (codeBlockExec) {
            const [wholeCodeBlock, codeBlockContent] = codeBlockExec
            htmlResult.push(`<pre><code>${codeBlockContent}</code></pre>`)
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
               htmlResult.push("<ul>")
               isULRunning = true
            }

            const [wholeUl, ulContent] = ulExec
            let parsedUlContent = this.parseAllInlineElementsWithinAnElement([ulContent])
            htmlResult.push(`<li>${parsedUlContent}</li>`)
         }
         else if (olExec) {
            // if ul-running, then close it off
            if (isULRunning) {
               htmlResult.push("</ul>")
               isULRunning = false
            }

            // start fresh ol
            if (!isOLRunning) {
               htmlResult.push("<ol>")
               isOLRunning = true
            }

            const [wholeOl, olContent] = olExec
            let parsedOlContent = this.parseAllInlineElementsWithinAnElement([olContent])
            htmlResult.push(`<li>${parsedOlContent}</li>`)
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
                  htmlResult.push(`<h1>${parsedHeadingContent}</h1>`)
               } else if (headingVariant == "##") {
                  htmlResult.push(`<h2>${parsedHeadingContent}</h2>`)
               } else if (headingVariant == "###") {
                  htmlResult.push(`<h3>${parsedHeadingContent}</h3>`)
               }
               continue
            }

            // blockquote parsing
            const blockquoteExec = /^> (.+)$/g.exec(line)
            if (blockquoteExec) {
               const [wholeBlockquote, blockquoteContent] = blockquoteExec
               htmlResult.push(`<blockquote>${blockquoteContent}</blockquote>`)
               continue
            }


            // hr parsing
            const hrExec = /^[\s]*[-*_]{3,}[\s]*/gm.exec(line)
            if (hrExec) {
               htmlResult.push("<hr />")
               continue
            }

            const splittedLines = line.split("\n")

            for (const content of splittedLines) {
               // img parsing
               const imgExec = /^!\[(.+?)\]\((.+?)\)/gm.exec(content)
               if (imgExec) {
                  const [wholeImg, imgAlt, imgSrc] = imgExec
                  htmlResult.push(`<img src='${imgSrc}' alt='${imgAlt}' />`)
                  continue
               }

               if(content.trim()){
                  // parsing everything as paragraph
                  const paragraph = this.parseAllInlineElementsWithinAnElement([content])
                  console.log(paragraph, content)
                  htmlResult.push(`<p>${paragraph}</p>`)
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

   parse(markdown: string) {
      let html = markdown

      // first parsing codeblocks, to prevent content inside
      // to handle scenarios like this
      /**
       * ```
         awesome
         # h1
       * ```
      
      */
      html = this.parseCodeBlocks(html)

      html = this.parseHeaders(html)

      html = this.parseBlockquotes(html)

      html = this.parseHorizontalRules(html)

      html = this.parseLists(html)

      html = this.parseImages(html)

      html = this.parseLinks(html)

      // parse everything else
      html = this.parseEverythingElse(html)

      return html.trim()
   }

   parseHeaders(html: string) {
      html = html.replace(this.rules.h1, '<h1>$1</h1>')
      html = html.replace(this.rules.h2, '<h2>$1</h2>')
      html = html.replace(this.rules.h3, '<h3>$1</h3>')
      return html
   }

   parseInlineFormatting(html: string, startWhiteSpace = "") {
      // parsing bold before italic to handle nested formatting
      // ***this is bold and italic***
      // **this is bold**
      // *this is italic*
      html = html.replace(this.rules.bold, startWhiteSpace + '<strong>$1</strong>')
      html = html.replace(this.rules.italic, startWhiteSpace + '<em>$1</em>')
      html = html.replace(this.rules.code, startWhiteSpace + '<code>$1</code>')
      html = this.parseLinks(startWhiteSpace + html)
      return html
   }

   parseLinks(html: string) {
      return html.replace(this.rules.link, '<a href="$2">$1</a>')
   }

   parseImages(html: string) {
      return html.replace(this.rules.image, '<img src="$2" alt="$1">')
   }

   parseCodeBlocks(html: string) {
      return html.replace(this.rules.codeBlock, '<pre><code>$1</code><button class="copy-btn">copy</button></pre>')
   }

   parseBlockquotes(html: string) {
      return html.replace(this.rules.blockquote, '<blockquote>$1</blockquote>')
   }

   parseHorizontalRules(html: string) {
      return html.replace(this.rules.hr, '<hr>')
   }

   parseLists(html: string) {
      // just doing simple list parsing
      const lines = html.split('\n')
      const result: string[] = []
      let inUnorderedList = false
      let inOrderedList = false

      for (let i = 0; i < lines.length; i++) {
         const line = lines[i]
         // check for unordered list item
         if (this.rules.unorderedList.test(line)) {
            // end previousaly opened <ol>
            if (inOrderedList) {
               result.push('</ol>')
               inOrderedList = false
            }
            // start ul
            if (!inUnorderedList) {
               result.push('<ul>')
               inUnorderedList = true
            }
            const match = line.match(this.rules.unorderedList)!
            result.push(`<li>${match[0].split(this.rules.unorderedList)[1]}</li>`)
         }
         // check for ordered list item
         else if (this.rules.orderedList.test(line)) {
            // end previousaly opened <ul>
            if (inUnorderedList) {
               result.push('</ul>')
               inUnorderedList = false
            }
            // start ol
            if (!inOrderedList) {
               result.push('<ol>')
               inOrderedList = true
            }
            const match = line.match(this.rules.orderedList)!
            result.push(`<li>${match[0].split(this.rules.orderedList)[1]}</li>`)
         }
         // regular line
         else {
            if (inUnorderedList) {
               result.push('</ul>')
               inUnorderedList = false
            }
            if (inOrderedList) {
               result.push('</ol>')
               inOrderedList = false
            }
            result.push(line)
         }
      }

      // close any remaining lists
      if (inUnorderedList) result.push('</ul>')
      if (inOrderedList) result.push('</ol>')

      return result.join('\n')
   }

   parseAllInlineElementsWithinAnElement(elementMarkdownStringLine: string[]) {
      let joinedStr = elementMarkdownStringLine.reduce((acc, item, index) => {
         const isLastIndex = elementMarkdownStringLine.length > 1 ? index == elementMarkdownStringLine.length - 1 : false
         let preWhitespace = isLastIndex ? " " : ""

         if (this.rules.bold.test(item) || this.rules.italic.test(item) || this.rules.code.test(item) || this.rules.link.test(item)) {
            let mappedItem = this.parseInlineFormatting(item, preWhitespace)
            return acc += preWhitespace + mappedItem
         }
         else {
            acc += preWhitespace + item
         }
         return acc
      }, '')
      return joinedStr
   }

   parseEverythingElse(html: string) {
      const lines = html.split('\n')
      const result: string[] = []
      let currentParagraph: string[] = []
      let preTagContent: string[] = []

      for (const line of lines) {
         const trimmedLine = line.trim()

         const isStartingWithPreTag = preTagStartRegx.exec(line)
         const isEndingWithPreTag = preTagEndRegx.exec(line)

         if (isStartingWithPreTag && isEndingWithPreTag) {
            result.push(line)
            preTagContent = []
            continue
         }
         if (isStartingWithPreTag && !isEndingWithPreTag) {
            preTagContent = []
            preTagContent.push(line)
            continue
         }
         if (!isStartingWithPreTag && isEndingWithPreTag) {
            preTagContent.push(line)
            result.push(preTagContent.join("\n"))
            preTagContent = []
            continue
         }
         if (preTagContent.length > 0) {
            preTagContent.push(line)
            continue
         }


         // skip empty lines and already processed elements
         if (trimmedLine === '' || trimmedLine.startsWith('<') || trimmedLine.includes('</')) {
            // if trimmedLine is encountered, the close the current-paragraph
            if (currentParagraph.length > 0) {
               let joinedStr = this.parseAllInlineElementsWithinAnElement(currentParagraph)
               // console.log(joinedStr)
               result.push("<p>" + joinedStr + "</p>")

               currentParagraph = []
            }
            // add the line as-is (already running tags)
            result.push(this.parseAllInlineElementsWithinAnElement([line]))
         } else {
            // adding to current-paragraph for generating new paragraph from it
            currentParagraph.push(trimmedLine)
         }
      }

      // close any remaining paragraph
      if (currentParagraph.length > 0) {
         let joinedStr = this.parseAllInlineElementsWithinAnElement(currentParagraph)
         result.push("<p>" + joinedStr + "</p>")
      }
      return result.join('\n')
   }
}
let preTagStartRegx = /(\s?)<pre>/g

let preTagEndRegx = /<\/pre>(\s?)/g