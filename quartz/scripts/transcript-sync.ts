#!/usr/bin/env node
/**
 * transcript-sync.ts
 * 
 * Extracts transcripts from YouTube videos and adds them to episode files.
 * Uses yt-dlp to fetch auto-generated captions.
 * 
 * Usage:
 *   npm run transcript-sync                    # Process all episodes missing transcripts
 *   npm run transcript-sync -- --max 5         # Process max 5 episodes
 *   npm run transcript-sync -- --dry-run       # Preview without writing
 *   npm run transcript-sync -- --episode 990   # Process specific episode
 */

import "dotenv/config"
import { promises as fs } from "fs"
import { join, basename } from "path"
import { execSync, spawn } from "child_process"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import matter from "gray-matter"
import { glob } from "glob"

// Configuration
const YT_DLP_PATH = "/home/petty/ComfyUI/venv/bin/yt-dlp"
const CONTENT_DIRS = [
  "content/episodes/tbp/s02",
  "content/episodes/hio",
]

interface EpisodeFile {
  path: string
  frontmatter: Record<string, any>
  content: string
  youtubeId?: string
  hasTranscript: boolean
}

const argv = yargs(hideBin(process.argv))
  .option("dry-run", {
    type: "boolean",
    description: "Preview changes without writing files",
    default: false,
  })
  .option("max", {
    type: "number",
    description: "Maximum number of episodes to process",
  })
  .option("episode", {
    type: "number",
    description: "Process specific episode number",
  })
  .option("dir", {
    type: "string",
    description: "Specific content directory to process",
  })
  .option("force", {
    type: "boolean",
    description: "Re-fetch transcripts even if they exist",
    default: false,
  })
  .help()
  .alias("help", "h")
  .parseSync()

/**
 * Find all episode files and check transcript status
 */
async function scanEpisodes(): Promise<EpisodeFile[]> {
  const episodes: EpisodeFile[] = []
  
  const dirs = argv.dir ? [argv.dir] : CONTENT_DIRS
  
  for (const dir of dirs) {
    const pattern = join(process.cwd(), dir, "*.md")
    const files = await glob(pattern)
    
    for (const filePath of files) {
      try {
        const raw = await fs.readFile(filePath, "utf-8")
        const { data: frontmatter, content } = matter(raw)
        
        // Check if episode has YouTube ID
        const youtubeId = frontmatter.youtubeId || extractYouTubeId(content)
        
        // Check if transcript section exists
        const hasTranscript = content.includes("## Transcript") || 
                              content.includes("## Episode Transcript")
        
        episodes.push({
          path: filePath,
          frontmatter,
          content,
          youtubeId,
          hasTranscript,
        })
      } catch (error) {
        console.error(`  ✗ Error reading ${filePath}:`, error)
      }
    }
  }
  
  return episodes
}

/**
 * Extract YouTube ID from embedded iframe or URL in content
 */
function extractYouTubeId(content: string): string | undefined {
  // Try iframe embed
  const iframeMatch = content.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/)
  if (iframeMatch) return iframeMatch[1]
  
  // Try watch URL
  const watchMatch = content.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/)
  if (watchMatch) return watchMatch[1]
  
  // Try youtu.be URL
  const shortMatch = content.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch) return shortMatch[1]
  
  return undefined
}

/**
 * Fetch transcript from YouTube using yt-dlp
 */
async function fetchYouTubeTranscript(videoId: string): Promise<string | null> {
  const url = `https://www.youtube.com/watch?v=${videoId}`
  const tempDir = `/tmp/yt-transcript-${videoId}`
  
  try {
    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true })
    
    // Fetch auto-generated captions (VTT format, no conversion)
    const cmd = `${YT_DLP_PATH} --skip-download --write-auto-subs --sub-lang en ` +
                `-o "${tempDir}/transcript.%(ext)s" "${url}" 2>&1`
    
    execSync(cmd, { timeout: 120000 })
    
    // Read the VTT file
    const vttPath = `${tempDir}/transcript.en.vtt`
    const vttContent = await fs.readFile(vttPath, "utf-8").catch(() => null)
    
    if (!vttContent) {
      console.log(`    No captions available for ${videoId}`)
      return null
    }
    
    // Convert VTT to plain text
    const transcript = vttToPlainText(vttContent)
    
    // Cleanup temp files
    await fs.rm(tempDir, { recursive: true, force: true })
    
    return transcript
  } catch (error: any) {
    console.log(`    Failed to fetch transcript: ${error.message}`)
    // Cleanup on error
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    return null
  }
}

/**
 * Convert VTT subtitle format to plain text
 */
function vttToPlainText(vtt: string): string {
  const lines = vtt.split("\n")
  const textLines: string[] = []
  let lastLine = ""
  
  for (const line of lines) {
    // Skip WEBVTT header and metadata
    if (line.startsWith("WEBVTT")) continue
    if (line.startsWith("Kind:")) continue
    if (line.startsWith("Language:")) continue
    
    // Skip timestamp lines (00:00:00.000 --> 00:00:10.669)
    if (/^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->/.test(line.trim())) continue
    
    // Skip empty lines
    if (!line.trim()) continue
    
    // Skip lines with just positioning info
    if (line.includes("align:") && line.includes("position:") && !line.match(/[a-zA-Z]{2,}/)) continue
    
    // Remove VTT tags like <c> </c> and timing tags like <00:00:00.000>
    let text = line
      .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, "")  // Remove timing tags
      .replace(/<\/?c>/g, "")                        // Remove <c> tags
      .replace(/<[^>]+>/g, "")                       // Remove other HTML tags
      .replace(/\[.*?\]/g, "")                       // Remove [brackets]
      .trim()
    
    // Skip if just whitespace or positioning
    if (!text || text.match(/^align:|^position:/)) continue
    
    // Skip duplicates (YouTube repeats lines for progressive display)
    if (text && text !== lastLine) {
      textLines.push(text)
      lastLine = text
    }
  }
  
  // Join and clean up - deduplicate consecutive similar lines
  const cleanedLines: string[] = []
  for (const line of textLines) {
    // If the previous line is contained in this one, skip it (progressive reveal)
    if (cleanedLines.length > 0) {
      const prev = cleanedLines[cleanedLines.length - 1]
      if (line.startsWith(prev) || prev.startsWith(line)) {
        // Keep the longer one
        if (line.length > prev.length) {
          cleanedLines[cleanedLines.length - 1] = line
        }
        continue
      }
    }
    cleanedLines.push(line)
  }
  
  return cleanedLines.join(" ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Add transcript section to episode markdown
 */
async function updateEpisodeWithTranscript(
  episode: EpisodeFile,
  transcript: string
): Promise<string> {
  const { data: frontmatter, content } = matter(await fs.readFile(episode.path, "utf-8"))
  
  // Add transcript metadata to frontmatter
  frontmatter.hasTranscript = true
  frontmatter.transcriptSyncedAt = new Date().toISOString()
  
  // Build new content with transcript section
  let newContent = content.trim()
  
  // Add transcript section at the end
  newContent += "\n\n## Transcript\n\n"
  newContent += "<details>\n"
  newContent += "<summary>Click to expand transcript</summary>\n\n"
  newContent += transcript + "\n\n"
  newContent += "</details>\n"
  
  // Reconstruct the file
  return matter.stringify(newContent, frontmatter)
}

/**
 * Main execution
 */
async function main() {
  console.log("🎙️  TBP Transcript Sync")
  console.log("=" .repeat(50))
  
  // Scan episodes
  console.log("\n📂 Scanning episodes...")
  const allEpisodes = await scanEpisodes()
  console.log(`   Found ${allEpisodes.length} total episodes`)
  
  // Filter to episodes needing transcripts
  let episodes = allEpisodes.filter(ep => {
    // Must have YouTube ID
    if (!ep.youtubeId) return false
    
    // Skip if already has transcript (unless --force)
    if (ep.hasTranscript && !argv.force) return false
    
    // Filter by specific episode number if provided
    if (argv.episode && ep.frontmatter.episodeNumber !== argv.episode) return false
    
    return true
  })
  
  console.log(`   ${episodes.length} episodes need transcripts`)
  
  // Apply max limit
  if (argv.max && episodes.length > argv.max) {
    episodes = episodes.slice(0, argv.max)
    console.log(`   Processing first ${argv.max} episodes`)
  }
  
  if (episodes.length === 0) {
    console.log("\n✅ All episodes have transcripts!")
    return
  }
  
  // Process each episode
  console.log("\n🔄 Fetching transcripts...")
  let successCount = 0
  let failCount = 0
  
  for (const episode of episodes) {
    const filename = basename(episode.path)
    const epNum = episode.frontmatter.episodeNumber || "?"
    
    console.log(`\n  [${epNum}] ${episode.frontmatter.title?.slice(0, 50)}...`)
    console.log(`       YouTube: ${episode.youtubeId}`)
    
    // Fetch transcript
    const transcript = await fetchYouTubeTranscript(episode.youtubeId!)
    
    if (!transcript) {
      failCount++
      continue
    }
    
    console.log(`       ✓ Got transcript (${transcript.length} chars)`)
    
    if (argv.dryRun) {
      console.log("       [dry-run] Would update file")
      successCount++
      continue
    }
    
    // Update the episode file
    try {
      const updatedContent = await updateEpisodeWithTranscript(episode, transcript)
      await fs.writeFile(episode.path, updatedContent)
      console.log("       ✓ Updated episode file")
      successCount++
    } catch (error: any) {
      console.log(`       ✗ Failed to update: ${error.message}`)
      failCount++
    }
  }
  
  // Summary
  console.log("\n" + "=".repeat(50))
  console.log(`✅ Processed: ${successCount} episodes`)
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount} episodes`)
  }
  if (argv.dryRun) {
    console.log("📝 Dry run - no files were modified")
  }
}

main().catch(console.error)
