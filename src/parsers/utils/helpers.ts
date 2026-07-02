import type { MarkdownToken, RawMarkdownString } from '..'
import { EXEC_FN } from '../constants/execFn.constant'
import { PARSER_TOKENS } from '../constants/placeholder-tokens.constant'
import { BLOCK_ITEMS_REGX_RULES } from '../constants/regxRules.constant'

/**
 * Encodes angle brackets in markdown to prevent them from being treated as HTML tags
 *
 * @param markdown - Raw markdown string
 * @returns Encoded markdown string
 */
export function encodeAngleBrackets(markdown: RawMarkdownString) {
   markdown = markdown
      .replace(/&/g, '&amp;') // must be first
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
   return markdown
}

/**
 * Decodes angle brackets in markdown to restore their original form
 *
 * @param markdown - Raw markdown string
 * @returns Decoded markdown string
 */
export function decodeAngleBrackets(markdown: RawMarkdownString) {
   markdown = markdown
      .replace(/&amp;/g, '&') // must be first
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
   return markdown
}

/**
 * Encodes code content in code to prevent it from being treated as markdown
 *
 * @param markdown - Raw markdown string
 * @returns Encoded markdown string
 */
export function encodeCodeContent(markdown: RawMarkdownString) {
   markdown = markdown.replace(/`(.+?)`/gm, (match) => {
      match = encodeAngleBrackets(match)
      return match
   })
   return markdown
}

/**
 * Temporarily replaces code blocks with numbered placeholders.
 *
 * This prevents code block content from being processed as markdown.
 *
 * @param markdown - Raw markdown string
 * @returns Replaced markdown string with code block placeholders
 */
export function replaceCodeBlocksWithPlaceholders(
   this: { extractedCodeBlocks: string[] },
   markdown: RawMarkdownString,
   encode = true
): string {
   const processedMarkdown = markdown.replace(/\`{3}[\s\S]*?\`{3}/gm, (match) => {
      this.extractedCodeBlocks.push(!encode ? match : encodeAngleBrackets(match))
      return `${PARSER_TOKENS.codeBlockPlaceholder}${this.extractedCodeBlocks.length - 1}${PARSER_TOKENS.codeBlockPlaceholder}`
   })

   return processedMarkdown
}
/**
 * Restores original code blocks from numbered placeholders.
 *
 * Final step in pre-processing that puts code blocks back.
 *
 * @param tokens - Array of tokens
 * @returns Array of tokens with restored code blocks
 */
export function restoreCodeBlocksFromPlaceholders(
   this: { extractedCodeBlocks: string[] },
   tokens: MarkdownToken[]
): MarkdownToken[] {
   return tokens.map((token) => {
      return token.replace(
         new RegExp(`${PARSER_TOKENS.codeBlockPlaceholder}(\\d+)${PARSER_TOKENS.codeBlockPlaceholder}`, 'g'),
         (_match, index) => this.extractedCodeBlocks[index]
      )
   })
}

/**
 * Temporarily replaces HTML blocks with numbered placeholders.
 *
 * @param markdown - Raw markdown string
 * @returns Replaced markdown string with HTML block placeholders
 */
export function replaceHtmlBlocksWithPlaceholders(
   this: { extractedHtmlBlocks: string[] },
   markdown: RawMarkdownString,
   encode = true
): string {
   const processedMarkdown = markdown.replace(BLOCK_ITEMS_REGX_RULES.htmlBlock, (match, tag, content) => {
      this.extractedHtmlBlocks.push(!encode ? match : encodeAngleBrackets(match))
      return `${PARSER_TOKENS.fullHtmlPlaceholder}${this.extractedHtmlBlocks.length - 1}${PARSER_TOKENS.fullHtmlPlaceholder}`
   })
   return processedMarkdown
}

/**
 * Restores HTML blocks from their numbered placeholders
 *
 * @param token - Markdown token containing HTML block placeholders
 * @returns Token with HTML blocks restored
 */
export function restoreHtmlBlocksFromPlaceholders(
   this: { extractedHtmlBlocks: string[] },
   token: MarkdownToken
): MarkdownToken {
   return token.replace(
      new RegExp(`${PARSER_TOKENS.fullHtmlPlaceholder}(\\d+)${PARSER_TOKENS.fullHtmlPlaceholder}`, 'g'),
      (_match, index) => decodeAngleBrackets(this.extractedHtmlBlocks[index])
   )
}

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
export function splitIntoBlockTokens(markdown: RawMarkdownString): MarkdownToken[] {
   const blockSplitPattern =
      /^(#{1,3} .+$|> *.+$|[\s]*[-*_]{3,}[\s]*$|[\s]{0,}[\-\*\+] +.+$|[\s]{0,}\d+. .+$|[.+\n]|###CODEBLOCK###\d+###CODEBLOCK###$)/gm

   const res = markdown.split(blockSplitPattern).map((token) => trimLineFeedChar(token))
   return res
}

/**
 * Removes tokens that contain only whitespace characters
 *
 * Cleans up the token array after splitting
 *
 * @param tokens - Array of markdown tokens
 * @returns Filtered array without whitespace-only tokens
 */
export function filterWhitespaceTokens(tokens: MarkdownToken[]): MarkdownToken[] {
   return tokens.filter((token) => {
      return !EXEC_FN.newLine(token)
   })
}

/**
 * Trims the line feed character from a token
 *
 * @param token - The token to trim
 * @returns The token with the line feed character removed
 */
export function trimLineFeedChar(token: MarkdownToken): MarkdownToken {
   return token.replaceAll(/\n/gm, '')
}
