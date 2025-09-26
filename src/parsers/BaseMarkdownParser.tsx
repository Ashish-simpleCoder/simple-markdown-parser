import { ListParser } from './ListParser'

export type RawMarkdownString = string
export type MarkdownToken = string
export type ListItemToken = string
export type ParsedHtml = string

// Constants for temporary replacements during parsing
export const PARSER_TOKENS = {
    codeBlockPlaceholder: '###CODEBLOCK###'
}

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
    /**
     * Regex patterns for matching different markdown elements
     * Separated into block-level and inline elements for clarity
     */
    static rules = {
        blockItem: {
            h1: /^# (.+)$/gm,
            h2: /^## (.+)$/gm,
            h3: /^### (.+)$/gm,

            unorderedList: /^[\s]*[\-\*\+][\s]+(.+)$/gm,
            orderedList: /^[\s]*\d+\.[\s]+(.+)$/gm,

            blockquote: /^> (.+)$/g,
            hr: /^[\s]*[-*_]{3,}[\s]*$/g,
        },
        inlineItem: {
            // Inline elements that can appear within other elements
            bold: /\*\*(.+?)\*\*/g,
            italic: /\*(.+?)\*/g,
            link: /\[(.+?)\]\((.+?)\)/g,
            code: /`(.+?)`/g,
            codeBlock: /```([\s\S]*?)```/g,
            image: /!\[(.+?)\]\((.+?)\)({width=\d+ height=\d+})?/g,
        }
    }

    /**
     * Execution functions that test and extract content from markdown tokens
     * Each function returns regex match results or null
     */
    static execFn = {
        codeBlock: (token: MarkdownToken) => /^\`{3}([\s\S]*?)\`{3}$/g.exec(token),
        // Putting "m" flag, because line might have "\s"(whitespace) characters at beginning.
        ul: (token: MarkdownToken) => /^([ ]{0,})?[\-\*\+][ ](\[[ \\x]\])?(.+)$/m.exec(token),
        ol: (token: MarkdownToken) => /^([ ]{0,})?\d+.[ ](\[[ \\x]\])?(.+)$/m.exec(token),
        heading: (token: MarkdownToken) => /^(#{1,3}) (.+)$/g.exec(token),
        blockquote: (token: MarkdownToken) => /^> (.+)$/g.exec(token),
        hr: (token: MarkdownToken) => /^[\s]*[-*_]{3,}[\s]*$/g.exec(token),
        img: (token: MarkdownToken) => /^!\[(.+?)\]\((.+?)\)/g.exec(token),
        htmlTag: (token: MarkdownToken) => /<([a-z]*)\b[^>]*>(.*?)<\/\1>/.exec(token),
        newLine: (token: MarkdownToken) => /^\s*$/g.exec(token),
    }

    /**
     * Pre-processing actions that prepare raw markdown for parsing
     */
    preProcessingActions = {
        /**
         * Temporarily replaces code blocks with numbered placeholders
         * This prevents code block content from being processed as markdown
         * 
         * @param markdown - Raw markdown string
         * @returns Object with processed string and array of extracted code blocks
         */
        replaceCodeBlocksWithPlaceholders: (markdown: RawMarkdownString) => {
            const extractedCodeBlocks: MarkdownToken[] = [];

            const processedString = markdown.replace(/\`{3}[\s\S]*?\`{3}/gm, (match) => {
                extractedCodeBlocks.push(match)
                return `${PARSER_TOKENS.codeBlockPlaceholder}${extractedCodeBlocks.length - 1}${PARSER_TOKENS.codeBlockPlaceholder}`
            })

            return { processedString, extractedCodeBlocks }
        },

        /**
         * Splits markdown into tokens based on block-level elements
         * Uses combined regex to identify different markdown block types
         * 
         * Order of splitting:
         * 1. Headings (h1-h3)
         * 2. Blockquotes  
         * 3. Horizontal rules
         * 4. Unordered lists
         * 5. Ordered lists
         * 6. Line terminators
         * 7. Code block placeholders
         * 
         * @param markdown - Markdown string to split
         * @returns Array of markdown tokens
         */
        splitIntoBlockTokens: (markdown: RawMarkdownString) => {
            const blockSplitPattern = /^(#{1,3} .+$|> *.+$|[\s]*[-*_]{3,}[\s]*$|[\s]{0,}[\-\*\+] +.+$|[\s]{0,}\d+. .+$|[.+\n]|###CODEBLOCK###\d+###CODEBLOCK###$)/gm

            return markdown.split(blockSplitPattern)
        },

        /**
         * Removes tokens that contain only whitespace characters
         * Cleans up the token array after splitting
         * 
         * @param tokens - Array of markdown tokens
         * @returns Filtered array without whitespace-only tokens
         */
        filterWhitespaceTokens: (tokens: MarkdownToken[]) => {
            return tokens.filter(token => {
                return !BaseMarkdownParser.execFn.newLine(token)
            })
        },

        /**
         * Restores original code blocks from numbered placeholders
         * Final step in pre-processing that puts code blocks back
         * 
         * @param tokens - Array of tokens with placeholders
         * @param codeBlocks - Array of original code block content
         * @returns Array with restored code blocks
         */
        restoreCodeBlocksFromPlaceholders: (tokens: MarkdownToken[], codeBlocks: MarkdownToken[]) => {
            return tokens.map(token => {
                return token.replace(
                    new RegExp(`${PARSER_TOKENS.codeBlockPlaceholder}(\\d+)${PARSER_TOKENS.codeBlockPlaceholder}`, 'g'),
                    (match, index) => codeBlocks[index]
                )
            })
        },
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
        preProcessMarkdown: (markdown: RawMarkdownString) => {
            const { processedString, extractedCodeBlocks } = this.preProcessingActions.replaceCodeBlocksWithPlaceholders(markdown)
            const splitTokens = this.preProcessingActions.splitIntoBlockTokens(processedString)
            const filteredTokens = this.preProcessingActions.filterWhitespaceTokens(splitTokens)
            const finalTokens = this.preProcessingActions.restoreCodeBlocksFromPlaceholders(filteredTokens, extractedCodeBlocks)

            return finalTokens
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
                const codeBlockMatch = BaseMarkdownParser.execFn.codeBlock(currentToken)
                if (codeBlockMatch) {
                    // Flush any pending list items before processing code block
                    this.parsers.flushPendingList(listItems, listStartIndex, htmlElements)
                    listItems = []
                    listStartIndex = -1

                    const [, codeContent] = codeBlockMatch
                    htmlElements.push(`<pre data-line='${tokenIndex}'><code>${codeContent}</code></pre>`)
                    continue
                }

                // 2. List Processing (ol/ul) - collect items for batch processing
                if (BaseMarkdownParser.execFn.ol(currentToken) || BaseMarkdownParser.execFn.ul(currentToken)) {
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
                const headingMatch = BaseMarkdownParser.execFn.heading(currentToken)
                if (headingMatch) {
                    const [, headingLevel, headingText] = headingMatch
                    const processedText = this.parsers.processInlineFormatting(headingText)

                    const tagName = `h${headingLevel.length}`
                    htmlElements.push(`<${tagName} data-line='${tokenIndex}'>${processedText}</${tagName}>`)
                    continue
                }

                // 4. Blockquote Processing
                const blockquoteMatch = BaseMarkdownParser.execFn.blockquote(currentToken)
                if (blockquoteMatch) {
                    const [, blockquoteText] = blockquoteMatch
                    htmlElements.push(`<blockquote data-line='${tokenIndex}'>${blockquoteText}</blockquote>`)
                    continue
                }

                // 5. Horizontal Rule Processing
                const hrMatch = BaseMarkdownParser.execFn.hr(currentToken)
                if (hrMatch) {
                    htmlElements.push(`<hr data-line='${tokenIndex}'/>`)
                    continue
                }

                // 6. Paragraph Processing (default case)
                this.parsers.processParagraphToken(currentToken, tokenIndex, htmlElements)
            }

            // Flush any remaining list items
            this.parsers.flushPendingList(listItems, listStartIndex, htmlElements)

            return htmlElements.join("\n")
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
            const paragraphSections = token.split("\n\n")

            for (const section of paragraphSections) {
                const trimmedSection = section.trim()
                if (!trimmedSection) continue

                // Check if content is already a valid HTML tag
                const htmlTagMatch = BaseMarkdownParser.execFn.htmlTag(trimmedSection)
                if (htmlTagMatch) {
                    const [htmlTag] = htmlTagMatch
                    htmlElements.push(htmlTag)
                } else {
                    // Process as regular paragraph with inline formatting
                    const processedContent = this.parsers.processInlineFormatting(trimmedSection)
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
                const listHtml = ListParser.parse(listItems, startIndex, this.parsers.processInlineFormatting)
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
            processedContent = processedContent.replace(BaseMarkdownParser.rules.inlineItem.image, `<img src='$2' alt='$1' $3 />`)
            processedContent = processedContent.replace(BaseMarkdownParser.rules.inlineItem.codeBlock, '<code>$1</code>')
            processedContent = processedContent.replace(BaseMarkdownParser.rules.inlineItem.code, '<code>$1</code>')
            processedContent = processedContent.replace(BaseMarkdownParser.rules.inlineItem.bold, '<strong>$1</strong>')
            processedContent = processedContent.replace(BaseMarkdownParser.rules.inlineItem.italic, '<em>$1</em>')
            processedContent = processedContent.replace(BaseMarkdownParser.rules.inlineItem.link, '<a href="$2">$1</a>')

            return processedContent
        }
    }

    /**
     * Main public method to parse markdown string to HTML
     * 
     * @param markdown - Raw markdown string to parse
     * @returns Parsed HTML string
     */
    parse(markdown: RawMarkdownString): ParsedHtml {
        const tokens = this.parsers.preProcessMarkdown(markdown)
        return this.parsers.convertTokensToHtml(tokens)
    }
}
