import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"
import { globby } from "globby"

/**
 * Script to automatically set socialImage field for podcast episodes
 *
 * This script scans all episode markdown files and sets the `socialImage`
 * frontmatter field to match the `thumbnail` field (YouTube thumbnail URL).
 *
 * Episodes with socialImage will use their YouTube thumbnails for OG images
 * when links are shared on social media, instead of auto-generated images.
 *
 * The script is idempotent - it only updates files that need updating.
 */

async function setEpisodeSocialImages() {
  console.log("🔍 Scanning for episode files...")

  // Find all episode markdown files
  const episodeFiles = await globby("content/episodes/**/*.md", {
    cwd: process.cwd(),
    ignore: ["**/index.md"],
  })

  console.log(`📝 Found ${episodeFiles.length} episode file(s)`)

  let updatedCount = 0
  let skippedCount = 0
  let noThumbnailCount = 0

  for (const filePath of episodeFiles) {
    try {
      const fullPath = path.resolve(process.cwd(), filePath)
      const content = await fs.readFile(fullPath, "utf-8")
      const parsed = matter(content)

      // Check if has thumbnail but no socialImage
      if (parsed.data.thumbnail && !parsed.data.socialImage) {
        // Set socialImage to thumbnail URL
        parsed.data.socialImage = parsed.data.thumbnail

        // Write back to file
        const updated = matter.stringify(parsed.content, parsed.data)
        await fs.writeFile(fullPath, updated, "utf-8")

        updatedCount++
        console.log(`  ✅ Updated: ${filePath}`)
      } else if (parsed.data.socialImage) {
        skippedCount++
      } else if (!parsed.data.thumbnail) {
        noThumbnailCount++
        console.log(`  ⚠️  No thumbnail: ${filePath}`)
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${filePath}:`, error)
    }
  }

  console.log("\n📊 Summary:")
  console.log(`  ✅ Updated: ${updatedCount} file(s)`)
  console.log(`  ⏭️  Skipped (already has socialImage): ${skippedCount} file(s)`)
  console.log(`  ⚠️  No thumbnail field: ${noThumbnailCount} file(s)`)
  console.log(`  📚 Total: ${episodeFiles.length} file(s)`)

  if (updatedCount > 0) {
    console.log("\n✨ Episode social images have been set successfully!")
  } else {
    console.log("\n✨ All episodes already have social images configured!")
  }
}

// Run the script
setEpisodeSocialImages().catch((error) => {
  console.error("❌ Script failed:", error)
  process.exit(1)
})
