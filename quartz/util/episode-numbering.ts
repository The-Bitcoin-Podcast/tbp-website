import { promises as fs } from "fs"
import { join, basename } from "path"
import { glob } from "glob"
import matter from "gray-matter"

/**
 * Get the highest episode number from existing files in a directory
 * 
 * Scans markdown files in the output directory and extracts episode numbers
 * from filenames (format: ##-slug.md or ###-slug.md)
 * 
 * @param outputDirectory - Directory to scan for episode files
 * @returns Highest episode number found, or 0 if none
 */
export async function getHighestEpisodeNumber(outputDirectory: string): Promise<number> {
  const cwd = process.cwd()
  const pattern = join(cwd, outputDirectory, "*.md")
  
  try {
    const files = await glob(pattern)
    
    if (files.length === 0) {
      return 0
    }
    
    let highest = 0
    
    for (const filePath of files) {
      const filename = basename(filePath)
      
      // Match patterns like "01-title.md", "17-title.md", "125-title.md"
      // Exclude index.md and other non-episode files
      const match = filename.match(/^(\d+)-/)
      
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > highest) {
          highest = num
        }
      }
    }
    
    return highest
  } catch (error) {
    console.warn(`Failed to scan directory ${outputDirectory}:`, error)
    return 0
  }
}

/**
 * Generate the next episode number for a new sync
 *
 * @param outputDirectory - Directory containing existing episodes
 * @returns Next sequential episode number
 */
export async function getNextEpisodeNumber(outputDirectory: string): Promise<number> {
  const highest = await getHighestEpisodeNumber(outputDirectory)
  return highest + 1
}

/**
 * Find an episode number by matching a title against existing files' frontmatter.
 *
 * Reads all markdown files in the output directory, parses their frontmatter,
 * and returns the episodeNumber of the first file whose title matches (case-insensitive).
 *
 * @param title - The title to search for
 * @param outputDirectory - Directory to scan for episode files
 * @returns The matching episode number, or undefined if not found
 */
export async function findEpisodeNumberByTitle(
  title: string,
  outputDirectory: string,
): Promise<number | undefined> {
  const cwd = process.cwd()
  const pattern = join(cwd, outputDirectory, "*.md")

  try {
    const files = await glob(pattern)
    const normalizedTitle = title.trim().toLowerCase()

    for (const filePath of files) {
      // Skip mobile variant files to match against main episodes only
      if (basename(filePath).includes("-mobile")) continue

      const content = await fs.readFile(filePath, "utf-8")
      const { data } = matter(content)

      if (
        typeof data.title === "string" &&
        data.title.trim().toLowerCase() === normalizedTitle &&
        typeof data.episodeNumber === "number"
      ) {
        return data.episodeNumber
      }
    }

    return undefined
  } catch (error) {
    console.warn(`Failed to search for episode by title in ${outputDirectory}:`, error)
    return undefined
  }
}
