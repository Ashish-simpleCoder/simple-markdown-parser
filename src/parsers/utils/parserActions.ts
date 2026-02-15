import { MarkdownToken, RawMarkdownString } from '../BaseMarkdownParser'
import { EXEC_FN } from '../constants/execFn.constant'
import { PARSER_TOKENS } from '../constants/placeholder-tokens.constant'

export const parserActions = {
   /**
    * Temporarily replaces code blocks with numbered placeholders
    * This prevents code block content from being processed as markdown
    *
    * @param markdown - Raw markdown string
    * @returns Object with processed string and array of extracted code blocks
    */
   replaceCodeBlocksWithPlaceholders({ markdown, encode = true }: { markdown: RawMarkdownString; encode?: boolean }): {
      processedMarkdown: string
      extractedCodeBlocks: string[]
   } {
      const extractedCodeBlocks: MarkdownToken[] = []

      const processedMarkdown = markdown.replace(/\`{3}[\s\S]*?\`{3}/gm, (match) => {
         extractedCodeBlocks.push(
            !encode
               ? match
               : match
                    .replace(/&/g, '&amp;') // must be first
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
         )
         return `${PARSER_TOKENS.codeBlockPlaceholder}${extractedCodeBlocks.length - 1}${PARSER_TOKENS.codeBlockPlaceholder}`
      })

      return { processedMarkdown, extractedCodeBlocks }
   },
   encodeCodeContent({ markdown }: { markdown: RawMarkdownString }) {
      markdown = markdown.replace(/`(.+?)`/gm, (match) => {
         match = match
            .replace(/&/g, '&amp;') // must be first
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
         return match
      })
      return markdown
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
   splitIntoBlockTokens({ markdown }: { markdown: RawMarkdownString }): MarkdownToken[] {
      const blockSplitPattern =
         /^(#{1,3} .+$|> *.+$|[\s]*[-*_]{3,}[\s]*$|[\s]{0,}[\-\*\+] +.+$|[\s]{0,}\d+. .+$|[.+\n]|###CODEBLOCK###\d+###CODEBLOCK###$)/gm

      return markdown.split(blockSplitPattern)
   },

   /**
    * Removes tokens that contain only whitespace characters
    * Cleans up the token array after splitting
    *
    * @param tokens - Array of markdown tokens
    * @returns Filtered array without whitespace-only tokens
    */
   filterWhitespaceTokens({ tokens }: { tokens: MarkdownToken[] }): MarkdownToken[] {
      return tokens.filter((token) => {
         return !EXEC_FN.newLine(token)
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
   restoreCodeBlocksFromPlaceholders({
      tokens,
      codeBlocks,
   }: {
      tokens: MarkdownToken[]
      codeBlocks: MarkdownToken[]
   }): MarkdownToken[] {
      return tokens.map((token) => {
         return token.replace(
            new RegExp(`${PARSER_TOKENS.codeBlockPlaceholder}(\\d+)${PARSER_TOKENS.codeBlockPlaceholder}`, 'g'),
            (match, index) => codeBlocks[index]
         )
      })
   },
}
