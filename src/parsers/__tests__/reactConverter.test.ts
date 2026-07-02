import { describe, it, expect } from 'vitest'
import { MarkdownParser } from '../index'

describe('MarkdownParser - convertHtmlToReactNode', () => {
   const parser = new MarkdownParser()

   it('converts basic HTML strings to React-like objects', () => {
      const htmlElements = ['<h1>Title</h1>', '<p>Paragraph</p>']
      const reactNodes = parser.parsers.convertHtmlToReactNode(htmlElements)

      // Based on typical convertDomToReact implementation, it returns an array of nodes
      expect(Array.isArray(reactNodes)).toBe(true)
      expect(reactNodes.length).toBe(2)

      // Verify node types (Assuming conversion returns objects with 'type')
      const types = reactNodes.map((n: any) => n.type)
      expect(types).toContain('h1')
      expect(types).toContain('p')
   })

   it('returns an empty array for empty input', () => {
      const reactNodes = parser.parsers.convertHtmlToReactNode([])
      expect(reactNodes).toEqual([])
   })
})
