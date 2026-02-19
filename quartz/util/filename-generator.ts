import GithubSlugger from 'github-slugger'

/**
 * Generate episode filename from episode number and title
 *
 * Format: {number}-{slug}.md or {number}-{slug}-mobile.md
 * - Number is zero-padded to 2 digits (01, 42, etc.)
 * - Title is slugified using github-slugger
 * - Mobile variants get a "-mobile" suffix before .md
 *
 * @param episodeNumber - Sequential episode number (1, 2, 3, ...)
 * @param title - Episode title from YouTube (should already be cleaned of emoji for mobile)
 * @param options - Optional settings
 * @param options.isMobile - If true, appends "-mobile" to filename
 * @returns Filename string (e.g., "42-bitcoin-basics.md" or "42-bitcoin-basics-mobile.md")
 *
 * @example
 * generateFileName(1, "Bitcoin Basics") // "01-bitcoin-basics.md"
 * generateFileName(22, "Can Bitcoin Beat Quantum?", { isMobile: true }) // "22-can-bitcoin-beat-quantum-mobile.md"
 */
export function generateFileName(
  episodeNumber: number,
  title: string,
  options?: { isMobile?: boolean },
): string {
  if (episodeNumber <= 0) {
    throw new Error(`Episode number must be positive, got: ${episodeNumber}`)
  }

  if (!title || title.trim().length === 0) {
    throw new Error('Title cannot be empty')
  }

  // Zero-pad episode number to 2 digits (matches existing s02 pattern)
  const paddedNumber = String(episodeNumber).padStart(2, '0')

  // Slugify title
  const slugger = new GithubSlugger()
  const slug = slugger.slug(title)

  // Append -mobile suffix for mobile variants
  const suffix = options?.isMobile ? '-mobile' : ''

  // Combine: number-slug[-mobile].md
  return `${paddedNumber}-${slug}${suffix}.md`
}
