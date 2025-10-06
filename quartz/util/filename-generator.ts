import GithubSlugger from 'github-slugger'

/**
 * Generate episode filename from episode number and title
 *
 * Format: {number}-{slug}.md
 * - Number is zero-padded to 3 digits (001, 042, etc.)
 * - Title is slugified using github-slugger
 *
 * @param episodeNumber - Sequential episode number (1, 2, 3, ...)
 * @param title - Episode title from YouTube
 * @returns Filename string (e.g., "042-bitcoin-basics.md")
 *
 * @example
 * generateFileName(1, "Bitcoin Basics") // "001-bitcoin-basics.md"
 * generateFileName(42, "The Future of Money") // "042-the-future-of-money.md"
 */
export function generateFileName(episodeNumber: number, title: string): string {
  if (episodeNumber <= 0) {
    throw new Error(`Episode number must be positive, got: ${episodeNumber}`)
  }

  if (!title || title.trim().length === 0) {
    throw new Error('Title cannot be empty')
  }

  // Zero-pad episode number to 3 digits
  const paddedNumber = String(episodeNumber).padStart(3, '0')

  // Slugify title
  const slugger = new GithubSlugger()
  const slug = slugger.slug(title)

  // Combine: number-slug.md
  return `${paddedNumber}-${slug}.md`
}
