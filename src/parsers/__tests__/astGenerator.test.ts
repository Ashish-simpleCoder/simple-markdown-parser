import { describe, it, expect, beforeEach } from 'vitest'
import { ASTGenerator } from '../utils/AstGenerator'

describe('ASTGenerator', () => {
   let generator: ASTGenerator

   beforeEach(() => {
      generator = new ASTGenerator()
   })

   it('correctly maps code blocks', () => {
      const tokens = ['```\nconst x = 1;\n```']
      const root = generator.parse(tokens)
      const node = generator.AstMap.get(root.children[0])

      expect(node?.nodeType).toBe('codeblock')
      expect(node?.textContent).toContain('const x = 1;')
   })

   it('correctly maps lists (ol and ul)', () => {
      const tokens = ['1. Item 1', '- Item 2']
      generator.parse(tokens)

      const node1 = generator.AstMap.get(0)
      const node2 = generator.AstMap.get(1)

      expect(node1?.nodeType).toBe('ol')
      expect(node2?.nodeType).toBe('ul')
   })

   it('correctly maps headings (h1, h2, h3)', () => {
      const tokens = ['# H1', '## H2', '### H3']
      generator.parse(tokens)

      expect(generator.AstMap.get(0)?.nodeType).toBe('h1')
      expect(generator.AstMap.get(1)?.nodeType).toBe('h2')
      expect(generator.AstMap.get(2)?.nodeType).toBe('h3')
   })

   it('correctly maps blockquotes', () => {
      const tokens = ['> Quote']
      generator.parse(tokens)

      expect(generator.AstMap.get(0)?.nodeType).toBe('blockquote')
      expect(generator.AstMap.get(0)?.textContent).toBe('Quote')
   })

   it('correctly maps horizontal rules', () => {
      const tokens = ['---']
      generator.parse(tokens)

      expect(generator.AstMap.get(0)?.nodeType).toBe('hr')
   })

   it('handles single line text tokens in paragraphs', () => {
      const tokens = ['Just regular text']
      generator.parse(tokens)

      expect(generator.AstMap.get(0)?.nodeType).toBe('p')
      expect(generator.AstMap.get(0)?.textContent).toBe('Just regular text')
   })

   it('handles multi-line text tokens in paragraphs', () => {
      const tokens = ['Line one\nLine two']
      generator.parse(tokens)

      expect(generator.AstMap.get(0)?.nodeType).toBe('p')
      expect(generator.AstMap.get(0)?.textContent).toBe('Line one\nLine two')
   })

   it('handles complex code blocks with multiple lines', () => {
      const tokens = ['```\nfunction hello() {\n  console.log("world");\n}\n```']
      generator.parse(tokens)

      const node = generator.AstMap.get(0)
      expect(node?.nodeType).toBe('codeblock')
      expect(node?.textContent).toContain('function hello() {')
      expect(node?.textContent).toContain('console.log("world");')
      expect(node?.textContent).toContain('}')
   })
})
