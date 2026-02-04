/**
 * Regex patterns for matching different markdown elements
 * Separated into block-level and inline elements for clarity
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

export const INLINE_ITEMS_REGX_RULES = {
   // Inline elements that can appear within other elements
   bold: /\*\*(.+?)\*\*/g,
   italic: /\*(.+?)\*/g,
   link: /\[(.+?)\]\((.+?)\)/g,
   code: /`(.+?)`/g,
   codeBlock: /```([\s\S]*?)```/g,
   image: /!\[(.+?)\]\((.+?)\)({(width=\d+ height=\d+)})?/g,
}
