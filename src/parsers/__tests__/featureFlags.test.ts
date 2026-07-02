import { describe, it, expect } from 'vitest'
import { MarkdownParser } from '../index'

describe('MarkdownParser - Feature Flags & Pipeline', () => {
   it('correctly configures preParserLane based on codeBlock flag', () => {
      // Default: codeBlock = true
      const defaultParser = new MarkdownParser()
      expect(defaultParser.preParserLane.includes(null)).toBe(false)

      // Disabled
      const disabledParser = new MarkdownParser({ codeBlock: false })
      // When codeBlock is false, the null entry remains or index 1 is not replaced
      expect(disabledParser.preParserLane[1]).toBe(null)
   })

   it('ignores heading parsing when flag is false', () => {
      const parser = new MarkdownParser({ heading: false })
      const input = '# Heading'
      const htmlOutput = parser.parsers.convertTokensToHtml(parser.parsers.preParse(input))

      // Should be parsed as a paragraph, not an h1
      expect(htmlOutput.some((s) => s.includes('<p data-line='))).toBe(true)
      expect(htmlOutput.some((s) => s.includes('<h1>'))).toBe(false)
   })

   it('ignores blockquote parsing when flag is false', () => {
      const parser = new MarkdownParser({ blockquote: false })
      const input = '> Quote'
      const htmlOutput = parser.parsers.convertTokensToHtml(parser.parsers.preParse(input))

      // Should be parsed as a paragraph
      expect(htmlOutput.some((s) => s.includes('<p data-line='))).toBe(true)
      expect(htmlOutput.some((s) => s.includes('<blockquote>'))).toBe(false)
   })
})
