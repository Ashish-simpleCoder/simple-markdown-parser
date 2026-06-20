/**
 * Regex patterns for matching different markdown elements separated into block-level elements
 */
export const BLOCK_ITEMS_REGX_RULES = {
   h1: /^# (.+)$/gm,
   h2: /^## (.+)$/gm,
   h3: /^### (.+)$/gm,

   unorderedList: /^[\s]*[\-\*\+][\s]+(.+)$/gm,
   orderedList: /^[\s]*\d+\.[\s]+(.+)$/gm,

   blockquote: /^> (.+)$/g,
   hr: /^[\s]*[-*_]{3,}[\s]*$/g,
}

/**
 * Regex patterns for matching different markdown elements separated into inline elements
 */
export const INLINE_ITEMS_REGX_RULES = {
   bold: /\*\*(.+?)\*\*/g,
   italic: /\*(.+?)\*/g,
   link: /\[(.+?)\]\((.+?)\)/g,
   code: /`(.+?)`/g,
   codeBlock: /```([\s\S]*?)```/g,
   image: /!\[(.+?)\]\((.+?)\)({(width=\d+ height=\d+)})?/g,
}
