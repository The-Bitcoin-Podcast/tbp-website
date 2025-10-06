/**
 * Format ISO 8601 duration to human-readable time string
 *
 * Converts YouTube's ISO 8601 duration format (PT1H23M45S) to
 * human-readable format (1:23:45 or 45:30)
 *
 * @param iso8601Duration - ISO 8601 duration string (e.g., "PT1H23M45S")
 * @returns Formatted duration string (HH:MM:SS or MM:SS)
 *
 * @example
 * formatDuration("PT1H23M45S") // "1:23:45"
 * formatDuration("PT45M30S")   // "45:30"
 * formatDuration("PT30S")      // "0:30"
 */
export function formatDuration(iso8601Duration: string): string {
  // Parse ISO 8601 duration format: PT[hours]H[minutes]M[seconds]S
  const pattern = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/
  const match = iso8601Duration.match(pattern)

  if (!match) {
    throw new Error(`Invalid ISO 8601 duration format: ${iso8601Duration}`)
  }

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)

  // Format based on whether hours are present
  if (hours > 0) {
    // HH:MM:SS format
    const mm = String(minutes).padStart(2, '0')
    const ss = String(seconds).padStart(2, '0')
    return `${hours}:${mm}:${ss}`
  } else {
    // MM:SS format
    const ss = String(seconds).padStart(2, '0')
    return `${minutes}:${ss}`
  }
}
