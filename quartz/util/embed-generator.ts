/**
 * Generate YouTube video embed HTML with responsive wrapper
 *
 * Creates iframe embed using youtube-nocookie.com domain for privacy.
 * Includes responsive 16:9 aspect ratio wrapper.
 *
 * @param videoId - YouTube video ID (11 characters)
 * @returns HTML string with responsive iframe embed
 *
 * @example
 * generateYouTubeEmbed("dQw4w9WgXcQ")
 * // Returns iframe with responsive wrapper
 */
export function generateYouTubeEmbed(videoId: string): string {
  if (!videoId || videoId.length !== 11) {
    throw new Error(`Invalid YouTube video ID: ${videoId}`)
  }

  return `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe
    src="https://www.youtube-nocookie.com/embed/${videoId}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
  ></iframe>
</div>`
}
