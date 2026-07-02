import { describe, it, expect } from 'vitest'
import { MarkdownParser } from '../index'

describe('MarkdownParser - preParse', () => {
   const parser = new MarkdownParser()

   it('filters out whitespace-only tokens', () => {
      const input = 'line1\n\n\n\nline2'
      const tokens = parser.parsers.preParse(input)
      // Should result in ["line1", "line2"]
      expect(tokens).toEqual(['line1', 'line2'])
   })

   it('correctly extracts and restores code blocks', () => {
      const input = 'paragraph\n\n```code\ncontent\n```\n\nmore text'
      const tokens = parser.parsers.preParse(input)

      // Check that code block content was preserved and restored
      const codeBlockContent = parser.preParserLane.extractedCodeBlocks[0]
      expect(codeBlockContent).toContain('content')

      // The tokens array should contain the code block placeholder or content
      expect(tokens.join('\n')).toContain('content')
   })

   it('splits block elements correctly', () => {
      const input = '# Heading\n\n- List Item\n\nParagraph'
      const tokens = parser.parsers.preParse(input)
      expect(tokens).toHaveLength(3)
      expect(tokens[0]).toBe('# Heading')
      expect(tokens[1]).toBe('- List Item')
      expect(tokens[2]).toBe('Paragraph')
   })
})
