import { ASTGenerator } from './AstGenerator'
import { EXEC_FN } from './constants/execFn.constant'
import { BLOCK_ITEMS_REGX_RULES, INLINE_ITEMS_REGX_RULES } from './constants/regxRules.constant'
import convertDomToReact from './convertDomToReact'
import { ListParser } from './ListParser'
import { MapCache } from './utils/MapCache'
import { parserActions } from './utils/parserActions'

export type RawMarkdownString = string
export type MarkdownToken = string
export type ListItemToken = string
export type ParsedHtml = string

/**
 * Core markdown parser that converts markdown strings to HTML
 * Supports headings, lists, blockquotes, code blocks, and inline elements formatting
 *
 * Processing Pipeline:
 * 1. Pre-processing: Replace code blocks with placeholders, split by blocks, remove whitespace blocks
 * 2. Main parsing: Convert each token to appropriate HTML element
 * 3. Inline parsing: Handle formatting within elements (bold, italic, links, etc.)
 */
export class BaseMarkdownParser {
   #tokenCache = new MapCache()

   inlineItemRegxRules = INLINE_ITEMS_REGX_RULES
   blockItemRegxRules = BLOCK_ITEMS_REGX_RULES
   execFn = EXEC_FN

   listParser = new ListParser()
   astGenerator = new ASTGenerator()

   // Feature flags
   parsingfeatureFlags = {
      codeBlock: true,
      olParsing: true,
      ulParsing: true,
      heading: true,
      blockquote: true,
      hr: true,
   }

   constructor(options: Partial<typeof this.parsingfeatureFlags> = this.parsingfeatureFlags) {
      this.parsingfeatureFlags = { ...this.parsingfeatureFlags, ...options }
   }

   /**
    * Pre-processing actions that prepare raw markdown for parsing
    */
   preParserActions = {
      replaceCodeBlocksWithPlaceholders: parserActions.replaceCodeBlocksWithPlaceholders,
      splitIntoBlockTokens: parserActions.splitIntoBlockTokens,
      filterWhitespaceTokens: parserActions.filterWhitespaceTokens,
      restoreCodeBlocksFromPlaceholders: parserActions.restoreCodeBlocksFromPlaceholders,
      encodeCodeContent: parserActions.encodeCodeContent,
   }

   /**
    * Main parsing functions that handle the conversion pipeline
    */
   parsers = {
      /**
       * Phase 1: Pre-processes raw markdown string into clean tokens
       *
       * Steps:
       * 1. Replace code blocks with placeholders
       * 2. Split markdown by block elements
       * 3. Filter out whitespace-only tokens
       * 4. Restore code blocks from placeholders
       *
       * @param markdown - Raw markdown input string
       * @returns Array of clean markdown tokens ready for HTML conversion
       */
      preParseMarkdown: (markdown: RawMarkdownString): string[] => {
         let tokens: string[] = [markdown]
         let extractedBlocks: string[] = []

         tokens = [this.preParserActions.encodeCodeContent({ markdown: tokens[0] })]
         if (this.parsingfeatureFlags.codeBlock) {
            const { processedMarkdown, extractedCodeBlocks } = this.preParserActions.replaceCodeBlocksWithPlaceholders({
               markdown: tokens[0],
            })
            extractedBlocks = extractedCodeBlocks
            tokens = [processedMarkdown]
         }
         tokens = this.preParserActions.splitIntoBlockTokens({ markdown: tokens[0] })
         tokens = this.preParserActions.filterWhitespaceTokens({ tokens: tokens })

         if (this.parsingfeatureFlags.codeBlock) {
            tokens = this.preParserActions.restoreCodeBlocksFromPlaceholders({
               tokens: tokens,
               codeBlocks: extractedBlocks,
            })
         }
         return tokens
      },

      /**
       * Phase 2: Converts markdown tokens to HTML elements
       *
       * Processing order (important for precedence):
       * 1. Code blocks (highest precedence - content should not be processed)
       * 2. Lists (ol/ul) - collected and batch processed
       * 3. Headings (h1-h3)
       * 4. Blockquotes
       * 5. Horizontal rules
       * 6. Paragraphs (default case - handles inline formatting)
       *
       * @param tokens - Array of pre-processed markdown tokens
       * @returns Complete HTML string
       */
      convertTokensToHtml: (tokens: MarkdownToken[]) => {
         const htmlElements: ParsedHtml[] = []
         let listItems: ListItemToken[] = []
         let listStartIndex: number = -1

         for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
            const currentToken = tokens[tokenIndex]

            // 1. Code Block Processing (highest priority - no further parsing)
            const codeBlockMatch = this.execFn.codeBlock(currentToken)
            if (this.parsingfeatureFlags.codeBlock && codeBlockMatch) {
               // Flush any pending list items before processing code block
               this.parsers.flushPendingList(listItems, listStartIndex, htmlElements)
               listItems = []
               listStartIndex = -1

               const [, codeContent] = codeBlockMatch
               htmlElements.push(`<pre data-line='${tokenIndex}'><code>${codeContent}</code></pre>`)
               continue
            }

            // 2. List Processing (ol/ul) - collect items for batch processing
            if (this.execFn.ol(currentToken) || this.execFn.ul(currentToken)) {
               listItems.push(currentToken)
               if (listStartIndex === -1) {
                  listStartIndex = tokenIndex
               }
               continue
            }

            // Flush any pending list items before processing other elements
            this.parsers.flushPendingList(listItems, listStartIndex, htmlElements)
            listItems = []
            listStartIndex = -1

            // 3. Heading Processing (h1-h3)
            const headingMatch = this.execFn.heading(currentToken)
            if (this.parsingfeatureFlags.heading && headingMatch) {
               const [, headingLevel, headingText] = headingMatch
               const processedText = this.parsers.processInlineFormatting(headingText)

               const tagName = `h${headingLevel.length}`
               htmlElements.push(`<${tagName} data-line='${tokenIndex}'>${processedText}</${tagName}>`)
               continue
            }

            // 4. Blockquote Processing
            const blockquoteMatch = this.execFn.blockquote(currentToken)
            if (this.parsingfeatureFlags.blockquote && blockquoteMatch) {
               const [, blockquoteText] = blockquoteMatch
               htmlElements.push(`<blockquote data-line='${tokenIndex}'>${blockquoteText}</blockquote>`)
               continue
            }

            // 5. Horizontal Rule Processing
            const hrMatch = this.execFn.hr(currentToken)
            if (this.parsingfeatureFlags.hr && hrMatch) {
               htmlElements.push(`<hr data-line='${tokenIndex}'/>`)
               continue
            }

            // 6. Paragraph Processing (default case)
            this.parsers.processParagraphToken(currentToken, tokenIndex, htmlElements)
         }

         // Flush any remaining list items
         this.parsers.flushPendingList(listItems, listStartIndex, htmlElements)

         // Parse html string to valid htmlDom object
         const childNodes = new DOMParser()
            .parseFromString(htmlElements.join('\n'), 'text/html')
            ?.querySelector('body')?.childNodes
         const reactElements = childNodes ? convertDomToReact(childNodes) : []
         return reactElements
      },

      convertTokensToHtml2: (tokens: MarkdownToken[]) => {
         const htmlElements: ParsedHtml[] = []
         let listItems: ListItemToken[] = []
         let listStartIndex: number = -1

         const astNode = this.astGenerator.parse(tokens)

         for (let tokenIndex = 0; tokenIndex < astNode.children.length; tokenIndex++) {
            const currentNode = this.astGenerator.AstMap.get(astNode.children[tokenIndex])

            if (!currentNode) continue

            const nodeType = currentNode.nodeType

            // 1. Code Block Processing (highest priority - no further parsing)
            if (this.parsingfeatureFlags.codeBlock && nodeType == 'codeblock') {
               this.parsers.flushPendingList(listItems, listStartIndex, htmlElements)
               listItems = []
               listStartIndex = -1

               htmlElements.push(`<pre data-line='${tokenIndex}'><code>${currentNode.textContent}</code></pre>`)
               continue
            }

            // 2. List Processing (ol/ul) - collect items for batch processing
            if (
               (nodeType == 'ol' && this.parsingfeatureFlags.olParsing) ||
               (nodeType == 'ul' && this.parsingfeatureFlags.ulParsing)
            ) {
               if (currentNode.textContent) {
                  listItems.push(currentNode.textContent)
               }
               if (listStartIndex === -1) {
                  listStartIndex = tokenIndex
               }
               continue
            }

            // Flush any pending list items before processing other elements
            this.parsers.flushPendingList(listItems, listStartIndex, htmlElements)
            listItems = []
            listStartIndex = -1

            // 3. Heading Processing (h1-h3)
            if (this.parsingfeatureFlags.heading && (nodeType == 'h1' || nodeType == 'h2' || nodeType == 'h3')) {
               if (currentNode.textContent) {
                  const processedText = this.parsers.processInlineFormatting(currentNode.textContent)

                  htmlElements.push(`<${nodeType} data-line='${tokenIndex}'>${processedText}</${nodeType}>`)
               }
               continue
            }

            // 4. Blockquote Processing
            if (this.parsingfeatureFlags.blockquote && nodeType == 'blockquote') {
               htmlElements.push(`<blockquote data-line='${tokenIndex}'>${currentNode.textContent}</blockquote>`)
               continue
            }

            // 5. Horizontal Rule Processing
            if (this.parsingfeatureFlags.hr && nodeType == 'hr') {
               htmlElements.push(`<hr data-line='${tokenIndex}'/>`)
               continue
            }

            // 6. Paragraph Processing (default case)
            if (currentNode.textContent) {
               this.parsers.processParagraphToken(currentNode.textContent, tokenIndex, htmlElements)
            }
         }

         // Flush any remaining list items
         this.parsers.flushPendingList(listItems, listStartIndex, htmlElements)

         // Parse html string to valid htmlDom object
         const childNodes = new DOMParser()
            .parseFromString(htmlElements.join('\n'), 'text/html')
            ?.querySelector('body')?.childNodes

         const reactElements = childNodes ? convertDomToReact(childNodes) : []

         return reactElements
      },

      /**
       * Processes a token as paragraph(s), handling multi-line content and HTML tags
       *
       * @param token - The markdown token to process
       * @param tokenIndex - Index for data-line attribute
       * @param htmlElements - Array to append results to
       */
      processParagraphToken: (token: MarkdownToken, tokenIndex: number, htmlElements: ParsedHtml[]) => {
         // Split by double newlines to handle multiple paragraphs in one token
         const paragraphSections = token.split('\n\n')

         for (let i = 0; i < paragraphSections.length; i++) {
            const section = paragraphSections[i].trim()
            if (!section) continue

            // Check if content is already a valid HTML tag
            const htmlTagMatch = this.execFn.htmlTag(section)
            if (htmlTagMatch) {
               const [htmlTag] = htmlTagMatch
               htmlElements.push(htmlTag)
            } else {
               // Process as regular paragraph with inline formatting
               const processedContent = this.parsers.processInlineFormatting(section)
               htmlElements.push(`<p data-line='${tokenIndex}'>${processedContent}</p>`)
            }
         }
      },

      /**
       * Helper function to flush pending list items to HTML
       *
       * @param listItems - Accumulated list item tokens
       * @param startIndex - Starting index for data-line attribute
       * @param htmlElements - Array to append results to
       */
      flushPendingList: (listItems: ListItemToken[], startIndex: number, htmlElements: ParsedHtml[]) => {
         if (listItems.length > 0) {
            const cacheKey = this.#tokenCache.generateKey('', listItems)

            let listHtml

            const cachedItem = this.#tokenCache.get(cacheKey)

            if (cachedItem) {
               listHtml = cachedItem
            } else {
               listHtml = this.listParser.parse(listItems, startIndex, this.parsers.processInlineFormatting)
               this.#tokenCache.set(cacheKey, listHtml)
            }
            if (listHtml) {
               htmlElements.push(listHtml)
            }
         }
      },

      /**
       * Processes inline markdown formatting within text content
       * Handles bold, italic, links, code, images, etc.
       *
       * Processing order matters - more specific patterns should be processed first
       *
       * @param token - Text content to process
       * @returns HTML with inline formatting applied
       */
      processInlineFormatting: (token: MarkdownToken) => {
         let processedContent = token

         // Process inline elements in order of specificity
         processedContent = processedContent.replace(this.inlineItemRegxRules.image, `<img src='$2' alt='$1' $4 />`)
         processedContent = processedContent.replace(this.inlineItemRegxRules.codeBlock, '<code>$1</code>')
         processedContent = processedContent.replace(this.inlineItemRegxRules.code, '<code>$1</code>')
         processedContent = processedContent.replace(this.inlineItemRegxRules.bold, '<strong>$1</strong>')
         processedContent = processedContent.replace(this.inlineItemRegxRules.italic, '<em>$1</em>')
         processedContent = processedContent.replace(this.inlineItemRegxRules.link, '<a href="$2">$1</a>')

         return processedContent
      },
   }

   /**
    * Main public method to parse markdown string to HTML
    *
    * @param markdown - Raw markdown string to parse
    * @returns Parsed HTML string
    */
   parse(markdown: RawMarkdownString): React.ReactNode[] {
      return this.parsers.convertTokensToHtml2(this.parsers.preParseMarkdown(markdown))
   }
}
