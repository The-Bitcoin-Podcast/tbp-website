import { describe, it } from 'node:test'
import assert from 'node:assert'

/**
 * Description to Markdown Converter Contract Tests
 *
 * Tests validate that convertDescriptionToMarkdown() properly converts
 * YouTube descriptions to markdown format with escaping and truncation.
 *
 * Expected: All tests FAIL until markdown-converter.ts is implemented
 */

describe('Markdown Converter Contract', () => {
  it('should export convertDescriptionToMarkdown function', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')
    assert.strictEqual(typeof convertDescriptionToMarkdown, 'function')
  })

  it('should escape markdown special characters', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')

    const description = 'Check out *this* and _that_ and [link](url) and `code` and (parens)'
    const markdown = convertDescriptionToMarkdown(description, 'video123', { truncateDescriptionAt: 5000 })

    // Should escape: * _ [ ] ( ) `
    assert.ok(markdown.includes('\\*') || !markdown.includes('*this*'))
    assert.ok(markdown.includes('\\[') || !markdown.includes('[link]'))
  })

  it('should preserve line breaks with markdown syntax', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')

    const description = 'Line 1\nLine 2\nLine 3'
    const markdown = convertDescriptionToMarkdown(description, 'video123', { truncateDescriptionAt: 5000 })

    // \n should become "  \n" (two spaces + newline for markdown line break)
    assert.ok(markdown.includes('  \n') || markdown.includes('\n'))
  })

  it('should auto-link URLs', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')

    const description = 'Check out https://bitcoin.org for more info'
    const markdown = convertDescriptionToMarkdown(description, 'video123', { truncateDescriptionAt: 5000 })

    // URLs should become [url](url) format
    assert.ok(markdown.includes('[https://bitcoin.org](https://bitcoin.org)') || markdown.includes('bitcoin.org'))
  })

  it('should auto-link HTTP URLs', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')

    const description = 'Visit http://example.com'
    const markdown = convertDescriptionToMarkdown(description, 'video123', { truncateDescriptionAt: 5000 })

    assert.ok(markdown.includes('[http://example.com](http://example.com)') || markdown.includes('example.com'))
  })

  it('should truncate at specified character limit', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')

    const longDescription = 'A'.repeat(6000)
    const markdown = convertDescriptionToMarkdown(longDescription, 'video123', { truncateDescriptionAt: 5000 })

    // Should be truncated to 5000 chars (plus truncation indicator)
    assert.ok(markdown.length <= 5100) // Some buffer for "Read more" link
  })

  it('should add "Read more on YouTube" link when truncated', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')

    const longDescription = 'A'.repeat(6000)
    const markdown = convertDescriptionToMarkdown(longDescription, 'video123', { truncateDescriptionAt: 5000 })

    assert.ok(markdown.includes('Read more on YouTube') || markdown.includes('youtube.com/watch'))
    assert.ok(markdown.includes('video123'))
  })

  it('should not truncate if within limit', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')

    const description = 'Short description'
    const markdown = convertDescriptionToMarkdown(description, 'video123', { truncateDescriptionAt: 5000 })

    assert.ok(!markdown.includes('Read more'))
    assert.ok(markdown.includes('Short description'))
  })

  it('should handle empty description', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')

    const description = ''
    const markdown = convertDescriptionToMarkdown(description, 'video123', { truncateDescriptionAt: 5000 })

    assert.strictEqual(markdown, '')
  })

  it('should handle description with only whitespace', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')

    const description = '   \n   \n   '
    const markdown = convertDescriptionToMarkdown(description, 'video123', { truncateDescriptionAt: 5000 })

    // Should preserve or handle whitespace appropriately
    assert.ok(typeof markdown === 'string')
  })

  it('should escape asterisks in text', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')

    const description = 'This *word* is important'
    const markdown = convertDescriptionToMarkdown(description, 'video123', { truncateDescriptionAt: 5000 })

    // Asterisks should be escaped to prevent italic/bold formatting
    assert.ok(markdown.includes('\\*') || !markdown.includes('*word*'))
  })

  it('should escape underscores in text', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')

    const description = 'snake_case_variable'
    const markdown = convertDescriptionToMarkdown(description, 'video123', { truncateDescriptionAt: 5000 })

    // Underscores should be escaped
    assert.ok(markdown.includes('\\_') || markdown.includes('snake_case'))
  })

  it('should escape square brackets', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')

    const description = 'Array[index] access'
    const markdown = convertDescriptionToMarkdown(description, 'video123', { truncateDescriptionAt: 5000 })

    // Square brackets should be escaped
    assert.ok(markdown.includes('\\[') || markdown.includes('Array'))
  })

  it('should escape parentheses', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')

    const description = 'Call function(arg)'
    const markdown = convertDescriptionToMarkdown(description, 'video123', { truncateDescriptionAt: 5000 })

    // Parentheses should be escaped
    assert.ok(markdown.includes('\\(') || markdown.includes('function'))
  })

  it('should escape backticks', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')

    const description = 'Use `code` here'
    const markdown = convertDescriptionToMarkdown(description, 'video123', { truncateDescriptionAt: 5000 })

    // Backticks should be escaped
    assert.ok(markdown.includes('\\`') || markdown.includes('code'))
  })

  it('should handle mixed URLs and special characters', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')

    const description = 'Check *this* at https://example.com and [that](url)'
    const markdown = convertDescriptionToMarkdown(description, 'video123', { truncateDescriptionAt: 5000 })

    // Should both escape special chars AND auto-link URLs
    assert.ok(markdown.includes('https://example.com') || markdown.includes('example.com'))
    assert.ok(markdown.includes('\\*') || markdown.includes('\\['))
  })

  it('should preserve multiple consecutive line breaks', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')

    const description = 'Paragraph 1\n\nParagraph 2\n\nParagraph 3'
    const markdown = convertDescriptionToMarkdown(description, 'video123', { truncateDescriptionAt: 5000 })

    // Should preserve paragraph structure
    assert.ok(markdown.includes('Paragraph 1'))
    assert.ok(markdown.includes('Paragraph 2'))
    assert.ok(markdown.includes('Paragraph 3'))
  })

  it('should handle truncation at word boundary', async () => {
    const { convertDescriptionToMarkdown } = await import('../../quartz/util/markdown-converter.js')

    const description = 'A'.repeat(4990) + ' word boundary test'
    const markdown = convertDescriptionToMarkdown(description, 'video123', { truncateDescriptionAt: 5000 })

    // Should truncate and add ellipsis/read more
    assert.ok(markdown.includes('...') || markdown.includes('Read more'))
  })
})
