/**
 * Convert YouTube video description to markdown format
 *
 * Performs the following transformations:
 * - Escapes markdown special characters
 * - Preserves line breaks with markdown syntax
 * - Auto-links URLs
 * - Truncates if longer than specified limit
 *
 * @param description - Raw YouTube video description
 * @param videoId - YouTube video ID for "Read more" link
 * @param config - Configuration with truncateDescriptionAt property
 * @returns Markdown-formatted description
 */
export function convertDescriptionToMarkdown(
  description: string,
  videoId: string,
  config: { truncateDescriptionAt: number }
): string {
  if (!description) {
    return ''
  }

  let markdown = description

  // Escape markdown special characters: * _ ` [ ] ( )
  markdown = markdown.replace(/([*_`[\]()])/g, '\\$1')

  // Auto-link URLs (do this after escaping to avoid escaping the markdown link syntax)
  markdown = markdown.replace(/(https?:\/\/[^\s]+)/g, '[$1]($1)')

  // Preserve line breaks: \n becomes "  \n" (two spaces + newline for markdown line break)
  markdown = markdown.replace(/\n/g, '  \n')

  // Truncate if needed
  if (markdown.length > config.truncateDescriptionAt) {
    markdown = markdown.substring(0, config.truncateDescriptionAt).trim()
    markdown += `...

[Read more on YouTube](https://youtube.com/watch?v=${videoId})`
  }

  return markdown
}
