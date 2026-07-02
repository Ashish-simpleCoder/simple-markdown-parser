import { describe, it, expect } from 'vitest'
import { MarkdownParser } from '../index'

describe('MarkdownParser - HTML Conversion', () => {
   const parser = new MarkdownParser()

   it('batches consecutive list items into a single UL/OL block', () => {
      const input = '- Item 1\n- Item 2'
      const htmlOutput = parser.parsers.convertTokensToHtml(parser.parsers.preParse(input))

      // Check if the result array contains the list string
      const listString = htmlOutput.find((s) => s.includes('<ul')) || ''

      expect(listString).toMatch(/<ul data-line="\d+">/)
      expect(listString).toContain('<li data-line="0">Item 1</li>')
      expect(listString).toContain('<li data-line="1">Item 2</li>')
      expect(listString).toContain('</ul>')
   })

   it('flushes list when a paragraph follows', () => {
      const input = '- List Item\n\nParagraph text'
      const htmlOutput = parser.parsers.convertTokensToHtml(parser.parsers.preParse(input))

      // We use regex matching because the list items now have dynamic data-line attributes
      expect(htmlOutput.some((s) => s.includes('<ul'))).toBe(true)
      expect(htmlOutput.some((s) => /<li data-line="\d+">List Item<\/li>/.test(s))).toBe(true)
      expect(htmlOutput.some((s) => s.includes('</ul>'))).toBe(true)
      expect(htmlOutput.some((s) => s.includes('<p data-line='))).toBe(true)
      expect(htmlOutput.some((s) => s.includes('Paragraph text</p>'))).toBe(true)
   })

   it('includes data-line attributes', () => {
      const input = '# Heading'
      const htmlOutput = parser.parsers.convertTokensToHtml(parser.parsers.preParse(input))

      // Check if data-line attribute exists
      expect(htmlOutput.some((s) => s.includes('data-line='))).toBe(true)
   })

   it('handles inline formatting inside list items', () => {
      const input = '- **Bold** and *Italic*'
      const htmlOutput = parser.parsers.convertTokensToHtml(parser.parsers.preParse(input))

      expect(htmlOutput.some((s) => s.includes('<strong>Bold</strong>'))).toBe(true)
      expect(htmlOutput.some((s) => s.includes('<em>Italic</em>'))).toBe(true)
   })

   it('passes through raw HTML tags as identified by execFn.htmlTag', () => {
      const input = '<div>Raw HTML</div>'
      const htmlOutput = parser.parsers.convertTokensToHtml(parser.parsers.preParse(input))

      expect(htmlOutput.some((s) => s.includes('<div>Raw HTML</div>'))).toBe(true)
   })

   it('handles broken/unclosed formatting gracefully', () => {
      const input = '**unclosed bold'
      const htmlOutput = parser.parsers.convertTokensToHtml(parser.parsers.preParse(input))

      // Depending on expected behavior: either leave as plain text or partial match
      // Assuming it shouldn't crash
      expect(htmlOutput.some((s) => s.includes('<p'))).toBe(true)
   })

   it('respects feature flags for parsing', () => {
      // Disable list parsing
      const customParser = new MarkdownParser({ ulParsing: false })
      const input = '- List Item'
      const htmlOutput = customParser.parsers.convertTokensToHtml(customParser.parsers.preParse(input))

      // Should be a paragraph instead of a list
      expect(htmlOutput.some((s) => s.includes('<p data-line='))).toBe(true)
      expect(htmlOutput.some((s) => s.includes('<ul>'))).toBe(false)
   })
})
