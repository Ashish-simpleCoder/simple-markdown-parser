import { BaseMarkdownParser, MarkdownToken } from './BaseMarkdownParser'
import { EXEC_FN } from './constants/execFn.constant'

export type AstMap = Map<string | number, AstNode>
export type AstNode = {
   id: string | number
   dataLine: number
   nodeType:
      | 'root'
      | 'codeblock'
      | 'ol'
      | 'ul'
      | `h${number}`
      | 'blockquote'
      | 'hr'
      | 'img'
      | 'code'
      | 'bold'
      | 'italic'
      | 'bold-italic'
      | 'a'
      | 'p'
   children: (string | number)[]
   textContent?: string
   parentId?: string | number
   prevSiblingId?: number
   nextSiblingId?: number
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
export class ASTGenerator {
   /**
    * A map of AST nodes to their corresponding IDs.
    */
   AstMap: AstMap = new Map()
   execFn = EXEC_FN

   #generateAST(tokens: MarkdownToken[]) {
      let astNode: AstNode = {
         id: -1,
         dataLine: -1,
         nodeType: 'root',
         children: [],
      }

      let currentToken: MarkdownToken | null = null

      for (let i = 0; i < tokens.length; i++) {
         currentToken = tokens[i]
         const nodeId = i
         astNode.children.push(nodeId)

         // 1. Code Block Processing (highest priority - no further parsing)
         const codeBlockMatch = this.execFn.codeBlock(currentToken)
         if (codeBlockMatch) {
            const [, content] = codeBlockMatch

            this.AstMap.set(nodeId, {
               id: nodeId,
               dataLine: i,
               nodeType: 'codeblock',
               children: [],
               textContent: content,
            })
            continue
         }

         // 2. List Processing (ol/ul) - collect items for batch processing
         const olMatch = this.execFn.ol(currentToken)
         if (olMatch) {
            const [content] = olMatch
            this.AstMap.set(nodeId, {
               id: nodeId,
               dataLine: i,
               nodeType: 'ol',
               children: [],
               textContent: content,
            })
            continue
         }

         const ulMatch = this.execFn.ul(currentToken)
         if (ulMatch) {
            const [content] = ulMatch
            this.AstMap.set(nodeId, {
               id: nodeId,
               dataLine: i,
               nodeType: 'ul',
               children: [],
               textContent: content,
            })
            continue
         }

         // 3. Heading Processing (h1-h3)
         const headingMatch = this.execFn.heading(currentToken)
         if (headingMatch) {
            const [, headingLevel, content] = headingMatch
            const nodeType: `h${number}` = `h${headingLevel.length}`

            this.AstMap.set(nodeId, {
               id: nodeId,
               dataLine: i,
               nodeType: nodeType,
               children: [],
               textContent: content,
            })
            continue
         }

         // 4. Blockquote Processing
         const blockquoteMatch = this.execFn.blockquote(currentToken)
         if (blockquoteMatch) {
            const [, content] = blockquoteMatch

            this.AstMap.set(nodeId, {
               id: nodeId,
               dataLine: i,
               nodeType: 'blockquote',
               children: [],
               textContent: content,
            })
            continue
         }

         // 5. Horizontal Rule Processing
         const hrMatch = this.execFn.hr(currentToken)
         if (hrMatch) {
            this.AstMap.set(nodeId, {
               id: nodeId,
               dataLine: i,
               nodeType: 'hr',
               children: [],
            })
            continue
         }

         // 6. Paragraph Processing (default case)
         this.AstMap.set(nodeId, {
            id: nodeId,
            dataLine: i,
            nodeType: 'p',
            children: [],
            textContent: currentToken,
         })
      }
      return astNode
   }

   /**
    * Main public method to parse markdown string and generate AST
    *
    * @param markdown - Raw markdown string to parse
    * @returns An AST representation of the parsed markdown
    */
   parse(markdown: MarkdownToken[]): AstNode {
      return this.#generateAST(markdown)
   }
}
