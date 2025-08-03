class MarkdownParser {
   rules: Record<string, RegExp> = {
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

         if (this.rules.bold.test(item) || this.rules.italic.test(item) || this.rules.code.test(item)) {
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

      for (const line of lines) {
         const trimmedLine = line.trim()

         // skip empty lines and already processed elements
         if (trimmedLine === '' || trimmedLine.startsWith('<') || trimmedLine.includes('</')) {
            // if trimmedLine is encountered, the close the current-paragraph
            if (currentParagraph.length > 0) {
               let joinedStr = this.parseAllInlineElementsWithinAnElement(currentParagraph)
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