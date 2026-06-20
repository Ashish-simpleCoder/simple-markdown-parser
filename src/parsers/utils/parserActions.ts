import { MarkdownToken, RawMarkdownString } from '../BaseMarkdownParser'
import { EXEC_FN } from '../constants/execFn.constant'
import { PARSER_TOKENS } from '../constants/placeholder-tokens.constant'

export const parserActions = {
   extractedCodeBlocks: [] as MarkdownToken[],
   /**
    * Temporarily replaces code blocks with numbered placeholders
    *
    * This prevents code block content from being processed as markdown
    *
    * @param markdown - Raw markdown string
    * @returns Replaced markdown string with code block placeholders
    */
   replaceCodeBlocksWithPlaceholders(markdown: [RawMarkdownString], encode = true) {
      const processedMarkdown = markdown[0].replace(/\`{3}[\s\S]*?\`{3}/gm, (match) => {
         this.extractedCodeBlocks.push(
            !encode
               ? match
               : match
                    .replace(/&/g, '&amp;') // must be first
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
         )
         return `${PARSER_TOKENS.codeBlockPlaceholder}${this.extractedCodeBlocks.length - 1}${PARSER_TOKENS.codeBlockPlaceholder}`
      })

      return [processedMarkdown]
   },
   /**
    * Encodes code content in code to prevent it from being treated as markdown
    *
    * @param markdown - Raw markdown string
    * @returns Encoded markdown string
    */
   encodeCodeContent(markdown: RawMarkdownString) {
      markdown = markdown[0].replace(/`(.+?)`/gm, (match) => {
         match = match
            .replace(/&/g, '&amp;') // must be first
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
         return match
      })
      return [markdown]
   },
   /**
    * Splits markdown into tokens based on block-level elements
    *
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
    * @returns Array of splitted markdown tokens
    */
   splitIntoBlockTokens(markdown: [RawMarkdownString]): MarkdownToken[] {
      const blockSplitPattern =
         /^(#{1,3} .+$|> *.+$|[\s]*[-*_]{3,}[\s]*$|[\s]{0,}[\-\*\+] +.+$|[\s]{0,}\d+. .+$|[.+\n]|###CODEBLOCK###\d+###CODEBLOCK###$)/gm

      const res = markdown[0].split(blockSplitPattern)
      return res
   },

   /**
    * Removes tokens that contain only whitespace characters
    *
    * Cleans up the token array after splitting
    *
    * @param tokens - Array of markdown tokens
    * @returns Filtered array without whitespace-only tokens
    */
   filterWhitespaceTokens(tokens: MarkdownToken[]): MarkdownToken[] {
      return tokens.filter((token) => {
         return !EXEC_FN.newLine(token)
      })
   },

   /**
    * Restores original code blocks from numbered placeholders
    * Final step in pre-processing that puts code blocks back
    *
    * @param tokens - Array of tokens
    * @returns Array of tokens with restored code blocks
    */
   restoreCodeBlocksFromPlaceholders(tokens: MarkdownToken[]): MarkdownToken[] {
      return tokens.map((token) => {
         return token.replace(
            new RegExp(`${PARSER_TOKENS.codeBlockPlaceholder}(\\d+)${PARSER_TOKENS.codeBlockPlaceholder}`, 'g'),
            (_match, index) => this.extractedCodeBlocks[index]
         )
      })
   },
}
