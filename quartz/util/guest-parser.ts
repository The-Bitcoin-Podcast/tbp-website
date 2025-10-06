import type { Guest } from '../types/youtube-sync.js'

/**
 * Regex patterns for parsing guest names from YouTube video descriptions
 * Tried in priority order - first match wins
 */
const GUEST_PATTERNS = [
  /(?:Guest|Guests):\s*([^\n]+)/i,
  /(?:Featuring|ft\.|feat\.|ft|feat):\s*([^\n]+)/i,
  /with\s+@(\w+)/gi,
  /Interview with\s+([^\n]+)/i,
]

/**
 * Parse guest information from YouTube video description
 *
 * Supports multiple patterns:
 * - "Guest: Name" or "Guests: Name1, Name2"
 * - "Featuring: Name" or "ft. Name" or "feat. Name"
 * - "with @username" (extracts Twitter handle)
 * - "Interview with Name"
 *
 * @param description - YouTube video description text
 * @returns Array of Guest objects with name and optional twitter handle
 */
export function parseGuests(description: string): Guest[] {
  if (!description) {
    return []
  }

  // Try each pattern in priority order
  for (const pattern of GUEST_PATTERNS) {
    const match = description.match(pattern)
    if (match) {
      const guestString = match[1]?.trim()
      if (!guestString) continue

      // Check if this is a Twitter mention pattern
      if (pattern.source.includes('@')) {
        // Twitter mention - extract username
        const guests: Guest[] = []
        const mentions = description.matchAll(/with\s+@(\w+)/gi)
        for (const mention of mentions) {
          const username = mention[1]
          guests.push({
            name: username,
            twitter: username,
          })
        }
        return guests.length > 0 ? guests : []
      }

      // Regular pattern - split by comma or ampersand
      const names = guestString.split(/[,&]/).map((name) => name.trim()).filter(Boolean)

      return names.map((name) => ({ name }))
    }
  }

  // No pattern matched
  return []
}
