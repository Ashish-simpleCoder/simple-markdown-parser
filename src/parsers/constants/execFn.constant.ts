import { MarkdownToken } from '../'
import { PARSER_TOKENS } from './placeholder-tokens.constant'

/**
 * Exec functions that test and extract content from markdown tokens.
 *
 * Each function returns either regex match results or null.
 */
export const EXEC_FN = {
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
   htmlBlock: (token: MarkdownToken) =>
      new RegExp(`${PARSER_TOKENS.fullHtmlPlaceholder}(\\d+)${PARSER_TOKENS.fullHtmlPlaceholder}`, 'g').exec(token),
}
