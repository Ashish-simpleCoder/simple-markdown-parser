import { ListItemToken, MarkdownToken } from '../BaseMarkdownParser'
import { EXEC_FN } from '../constants/execFn.constant'

type ParentNodeType = 'ol' | 'ul'

/**
 * Represents a list item node in the tree structure
 * Contains all necessary information to build hierarchical lists
 */
type ListNode = {
   id: number // Unique identifier for this node
   parentNodeId: number // ID of the parent node (-1 for root)
   parentNodeType: ParentNodeType // Whether parent is ordered (ol) or unordered (ul) list
   elementType: 'li' // Always "li" for list items
   text: string | null // Text content of the list item
   element: HTMLElement // The actual HTML <li> element
   indentLevel: number // Indentation level (0 = root level)
   children: number[] // Array of child node IDs
} | null

type NodeMap = Map<number, ListNode>

// Constants for tree structure
const ROOT_ID = -1 // Special ID for the root node
const DEFAULT_INDENT_LEVEL = 2 // Default indentation size for nested lists

/**
 * Parser class for converting markdown list tokens into HTML list structures
 * Handles nested lists, mixed ordered/unordered lists, and checkboxes
 */
export class ListParser {
   /**
    * Execution functions that test and extract content from markdown tokens
    * Each function returns regex match results or null
    */
   execFn = EXEC_FN

   constructor() {}

   actions = {
      /**
       * Finds the appropriate parent node for a new list item based on indentation
       * Traverses up the tree until finding a node with less indentation than the new item
       *
       * @param nodeMap - The current tree structure
       * @param previousNode - The last inserted node (starting point for search)
       * @param targetIndentLevel - Indentation level of new item
       * @returns The parent node that should contain the new list item
       */
      findParentByIndentLevel: ({
         nodeMap,
         previousNode,
         targetIndentLevel,
      }: {
         nodeMap: NodeMap
         previousNode: ListNode
         targetIndentLevel: number
      }): ListNode => {
         let candidateParent: ListNode | undefined = previousNode

         // Traverse upward the tree to find appropriate parent
         while (candidateParent) {
            // If candidate has less indentation, it is eligible to become parent
            if (candidateParent.indentLevel < targetIndentLevel) {
               break
            }
            // Move upward by one level in the tree
            if (candidateParent.parentNodeId) {
               candidateParent = nodeMap.get(candidateParent.parentNodeId)
            }
         }

         // If no suitable parent found, attach to root
         if (!candidateParent) {
            return nodeMap.get(ROOT_ID)!
         }
         return candidateParent!
      },

      /**
       * Converts the flat node map into a hierarchical HTML structure
       * Creates proper <ol>/<ul> containers and nests list items correctly
       *
       * @param nodeMap - Map containing all list nodes
       * @returns DocumentFragment containing the complete HTML list structure
       */
      buildHTMLTree: (nodeMap: NodeMap) => {
         // Start with root's children
         let processingQueue = nodeMap.get(ROOT_ID)!.children

         const rootFragment = new DocumentFragment()
         let currentContainer: HTMLElement | null = null
         let currentContainerParentId = ROOT_ID

         // Process all nodes breadth-first
         while (processingQueue.length > 0) {
            let didCreateNewContainer = false
            let currentNode = nodeMap.get(processingQueue.shift() as any)

            // Skip invalid nodes
            if (!currentNode) {
               continue
            }

            const parentNode = nodeMap.get(currentNode.parentNodeId)

            // Skip nodes without valid parents
            if (!parentNode) {
               continue
            }

            // Create initial container for the first list item
            if (!currentContainer) {
               currentContainer = document.createElement(currentNode.parentNodeType)
               rootFragment.appendChild(currentContainer)

               didCreateNewContainer = true
               currentContainerParentId = currentNode.parentNodeId
            }
            // Create new container when parent changes or list type changes (ol/ul)
            else if (
               currentContainerParentId != currentNode.parentNodeId ||
               currentContainer.nodeName.toLowerCase() != currentNode.parentNodeType
            ) {
               currentContainer = document.createElement(currentNode.parentNodeType)

               didCreateNewContainer = true
               currentContainerParentId = currentNode.parentNodeId
            }

            if (!currentContainer) {
               continue
            }

            // Add the list item to its container
            currentContainer.appendChild(currentNode.element)

            // Set data-line attribute on container (only once)
            if (!currentContainer.getAttribute('data-line')) {
               //@ts-expect-error No need to check for null value.
               currentContainer.setAttribute('data-line', currentNode.element.getAttribute('data-line'))
            }

            // Attach the newly created container to the appropriate location
            if (didCreateNewContainer) {
               if (currentNode.indentLevel == 0) {
                  // Top-level list goes to root fragment
                  rootFragment.appendChild(currentContainer)
               } else {
                  // Nested list goes inside the parent list item
                  parentNode.element.appendChild(currentContainer)
               }
            }

            // Add current item's children to processing queue
            if (currentNode.children.length > 0) {
               processingQueue.push(...currentNode.children)
            }
         }

         return rootFragment
      },
   }

   /**
    * Main parsing function that converts markdown list tokens to HTML
    *
    * @param tokens - Array of parsed markdown list tokens
    * @param startingLineNumber - Starting line number for data-line attributes
    * @returns HTML string of the complete list structure, or null if no valid tokens
    */
   parse(
      tokens: ListItemToken[],
      startingLineNumber: number,
      processInlineFormatting: (token: MarkdownToken) => string
   ): string | null {
      // Validate input
      if (!tokens || tokens.length == 0) {
         return null
      }

      // Initialize the tree structure with a root node
      const nodeMap = new Map() as NodeMap
      // @ts-expect-error Bypassing the type only for root - root node has special properties
      nodeMap.set(ROOT_ID, { parentNodeId: null, children: [] })

      let lastInsertedNode: ListNode | undefined
      let nextNodeId = 1
      let currentLineNumber = startingLineNumber

      // Process each markdown list token sequentially
      while (tokens.length > 0) {
         let token = tokens.shift()

         let listNodeType: ParentNodeType | null = null
         let newNode: ListNode = null

         if (!token) {
            continue
         }

         // Determine if this is an ordered or unordered list item
         if (this.execFn.ol(token)) {
            listNodeType = 'ol'
         }
         if (this.execFn.ul(token)) {
            listNodeType = 'ul'
         }

         // Skip tokens that aren't valid list items
         if (!listNodeType) {
            continue
         }

         // Extract components from the markdown token using regex
         const regexMatch = this.execFn[listNodeType](token)
         if (!regexMatch) {
            continue
         }

         // Parse the regex match groups:
         // Group 1: Indentation (spaces/tabs)
         // Group 2: Checkbox syntax ([x], [ ], etc.)
         // Group 3: Text content
         const [fullMatch, indentGroup, checkboxGroup, contentGroup] = regexMatch
         // Parse inline markdown within the list item content
         const parsedContent = processInlineFormatting(contentGroup)

         // Create the HTML list item element
         const listElement = document.createElement('li')

         // @ts-expect-error Not needed to parse number as string. Implicit coercion will be done
         listElement.setAttribute('data-line', currentLineNumber)

         // Handle checkbox syntax or plain content
         if (!checkboxGroup) {
            // Regular list item - just add the parsed content
            listElement.innerHTML = parsedContent
         } else {
            // Checkbox list item - create checkbox input with appropriate checked state
            let checkboxInput = `<input type='checkbox' />`
            if (checkboxGroup == '[x]') {
               checkboxInput = `<input type='checkbox' checked />`
            }

            listElement.innerHTML = `${checkboxInput}${parsedContent}`
         }

         // Determine the parent and position for this list item based on indentation

         // Case 1: First item or no indentation - attach to root
         if (!indentGroup || !lastInsertedNode) {
            newNode = {
               id: nextNodeId,
               parentNodeId: ROOT_ID,
               parentNodeType: listNodeType,
               elementType: 'li',
               text: listElement.textContent,
               element: listElement,
               indentLevel: 0,
               children: [],
            }
         } else {
            const currentIndentLevel = indentGroup.length

            // Case 2: Same indentation level - sibling to previous item
            if (lastInsertedNode.indentLevel == currentIndentLevel) {
               newNode = {
                  id: nextNodeId,
                  parentNodeId: lastInsertedNode.parentNodeId,
                  parentNodeType: listNodeType,
                  elementType: 'li',
                  text: listElement.textContent,
                  element: listElement,
                  indentLevel: currentIndentLevel,
                  children: [],
               }
            }
            // Case 3: Less indentation - find appropriate parent up the tree
            else if (currentIndentLevel < lastInsertedNode.indentLevel) {
               const parentNode = this.actions.findParentByIndentLevel({
                  nodeMap: nodeMap,
                  previousNode: lastInsertedNode,
                  targetIndentLevel: currentIndentLevel,
               })!

               newNode = {
                  id: nextNodeId,
                  parentNodeId: parentNode.id,
                  parentNodeType: listNodeType,
                  elementType: 'li',
                  text: listElement.textContent,
                  element: listElement,
                  indentLevel: currentIndentLevel,
                  children: [],
               }
            }
            // Case 4: More indentation - child of previous item
            else if (currentIndentLevel >= lastInsertedNode.indentLevel + DEFAULT_INDENT_LEVEL) {
               newNode = {
                  id: nextNodeId,
                  parentNodeId: lastInsertedNode.id,
                  parentNodeType: listNodeType,
                  elementType: 'li',
                  text: listElement.textContent,
                  element: listElement,
                  indentLevel: currentIndentLevel,
                  children: [],
               }
            }
         }

         // Add the new node to the tree structure
         if (newNode) {
            // Add this node's ID to its parent's children array
            nodeMap.get(newNode.parentNodeId)?.children.push(nextNodeId)
            // Store the node in the tree map
            nodeMap.set(newNode.id, newNode)
            // Update reference to last inserted node
            lastInsertedNode = newNode
         }

         // Increment counters for next iteration
         nextNodeId++
         currentLineNumber++
      }

      // Return null if no valid nodes were created
      if (nodeMap.size == 0) {
         return null
      }

      // Generate the final HTML structure from the node tree
      const htmlTree = this.actions.buildHTMLTree(nodeMap)
      if (!htmlTree) {
         return null
      }

      // Wrap in a div and return as HTML string
      const wrapper = document.createElement('div')
      wrapper.appendChild(htmlTree)
      return wrapper.innerHTML
   }
}
