import { describe, it, expect } from 'vitest'
import { MarkdownParser } from '../index'

describe('MarkdownParser - processInlineFormatting', () => {
   const parser = new MarkdownParser()

   it('correctly processes bold text', () => {
      const input = '**bold text**'
      const result = parser.parsers.processInlineFormatting(input)
      expect(result).toBe('<strong>bold text</strong>')
   })

   it('correctly processes italic text', () => {
      const input = '*italic text*'
      const result = parser.parsers.processInlineFormatting(input)
      expect(result).toBe('<em>italic text</em>')
   })

   it('correctly processes links', () => {
      const input = '[Google](https://google.com)'
      const result = parser.parsers.processInlineFormatting(input)
      expect(result).toBe('<a href="https://google.com" target="_blank" rel="noopener noreferrer">Google</a>')
   })

   it('correctly processes inline code', () => {
      const input = '`code`'
      const result = parser.parsers.processInlineFormatting(input)
      expect(result).toBe('<code>code</code>')
   })

   it('correctly processes images with width and height', () => {
      // Current regex: /!\[(.+?)\]\((.+?)\)({(width=\d+ height=\d+)})?/g
      const input = '![alt](https://example.com/img.png){width=100 height=200}'
      const result = parser.parsers.processInlineFormatting(input)

      expect(result).toContain("src='https://example.com/img.png'")
      expect(result).toContain("alt='alt'")
      expect(result).toContain('width=100 height=200')
   })

   it('handles multiple inline elements in a single line', () => {
      const input = '**bold** and *italic*'
      const result = parser.parsers.processInlineFormatting(input)
      expect(result).toBe('<strong>bold</strong> and <em>italic</em>')
   })
})
