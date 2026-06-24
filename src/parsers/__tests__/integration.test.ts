import { describe, it, expect } from 'vitest'
import { MarkdownParser } from '../index'

describe('MarkdownParser - Full Integration', () => {
   const parser = new MarkdownParser()

   it('correctly produces an ordered structure of React nodes with mixed content', () => {
      const input = `
# Title

- List 1
- List 2

> Blockquote

\`\`\`
Code
\`\`\`

Paragraph with **bold**.
---
`
      const result = parser.parse(input)

      // result is an array of React elements.
      // We look for common props or types that your convertDomToReact produces.
      // Assuming your convertDomToReact creates objects with a 'type' property (e.g., 'h1', 'ul', 'p', 'blockquote', 'pre', 'hr')
      const nodeTypes = result.map((node: any) => node.type)

      // Assert expected order and presence
      expect(nodeTypes).toEqual(['h1', 'ul', 'blockquote', 'pre', 'p', 'hr'])

      // Verify detail within the bold paragraph
      const paragraph = result.find((node: any) => node.type === 'p')
      expect(JSON.stringify(paragraph)).toContain('strong')
   })
})
