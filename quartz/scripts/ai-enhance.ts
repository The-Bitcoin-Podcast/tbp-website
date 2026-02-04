#!/usr/bin/env node
/**
 * ai-enhance.ts
 * 
 * Uses local LLM (Ollama) to generate AI-enhanced content for episodes:
 * - Summary (2-3 paragraphs)
 * - Key topics/tags
 * - Notable quotes
 * 
 * Usage:
 *   npm run ai-enhance                       # Process all episodes with transcripts
 *   npm run ai-enhance -- --max 5            # Process max 5 episodes
 *   npm run ai-enhance -- --dry-run          # Preview without writing
 *   npm run ai-enhance -- --episode 990      # Process specific episode
 */

import "dotenv/config"
import { promises as fs } from "fs"
import { join, basename } from "path"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import matter from "gray-matter"
import { glob } from "glob"

// Configuration
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "glm-4.7-flash:q8_0"
const CONTENT_DIRS = [
  "content/episodes/tbp",
  "content/episodes/hio",
]

interface EpisodeFile {
  path: string
  frontmatter: Record<string, any>
  content: string
  transcript?: string
  hasAiSummary: boolean
}

interface AiEnhancement {
  summary: string
  topics: string[]
  quotes: { text: string; speaker?: string }[]
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
    description: "Re-generate AI content even if it exists",
    default: false,
  })
  .option("model", {
    type: "string",
    description: "Ollama model to use",
    default: OLLAMA_MODEL,
  })
  .help()
  .alias("help", "h")
  .parseSync()

/**
 * Extract transcript from episode content
 */
function extractTranscript(content: string): string | undefined {
  // Look for transcript in details/summary block
  const detailsMatch = content.match(/<details>[\s\S]*?<summary>.*?transcript.*?<\/summary>([\s\S]*?)<\/details>/i)
  if (detailsMatch) {
    return detailsMatch[1].trim()
  }
  
  // Look for ## Transcript section
  const sectionMatch = content.match(/## (?:Episode )?Transcript\n+([\s\S]+?)(?=\n## |$)/i)
  if (sectionMatch) {
    return sectionMatch[1].trim()
  }
  
  return undefined
}

/**
 * Scan episodes for AI enhancement
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
        
        const transcript = extractTranscript(content)
        const hasAiSummary = content.includes("## AI Summary") || 
                            frontmatter.aiSummary !== undefined
        
        episodes.push({
          path: filePath,
          frontmatter,
          content,
          transcript,
          hasAiSummary,
        })
      } catch (error) {
        console.error(`  ✗ Error reading ${filePath}:`, error)
      }
    }
  }
  
  return episodes
}

/**
 * Call Ollama API for text generation
 */
async function callOllama(prompt: string, model: string): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 2048,
      },
    }),
  })
  
  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`)
  }
  
  const data = await response.json()
  return data.response
}

/**
 * Generate AI enhancements from transcript
 */
async function generateEnhancements(
  title: string,
  description: string,
  transcript: string,
  model: string
): Promise<AiEnhancement> {
  // Truncate transcript if too long (keep first ~8000 chars)
  const truncatedTranscript = transcript.length > 8000 
    ? transcript.slice(0, 8000) + "...[truncated]"
    : transcript
  
  const prompt = `You are analyzing a podcast episode. Generate structured content.

EPISODE TITLE: ${title}

EPISODE DESCRIPTION: ${description}

TRANSCRIPT (may be truncated):
${truncatedTranscript}

---

Please provide:

1. SUMMARY: Write a 2-3 paragraph summary of this episode suitable for a website. Be specific about what topics were discussed and any key insights shared.

2. TOPICS: List 5-10 key topics or themes discussed (single words or short phrases, suitable as tags). Format as comma-separated.

3. QUOTES: Extract 3-5 notable or interesting quotes from the conversation. For each quote, include the text and speaker if identifiable.

Format your response exactly like this:

SUMMARY:
[Your 2-3 paragraph summary here]

TOPICS:
[topic1, topic2, topic3, ...]

QUOTES:
- "[quote text]" - Speaker Name
- "[quote text]" - Speaker Name
`

  const response = await callOllama(prompt, model)
  
  // Parse the response
  const summaryMatch = response.match(/SUMMARY:\s*([\s\S]*?)(?=TOPICS:|$)/i)
  const topicsMatch = response.match(/TOPICS:\s*([\s\S]*?)(?=QUOTES:|$)/i)
  const quotesMatch = response.match(/QUOTES:\s*([\s\S]*?)$/i)
  
  const summary = summaryMatch?.[1]?.trim() || "Summary generation failed."
  
  const topicsRaw = topicsMatch?.[1]?.trim() || ""
  const topics = topicsRaw
    .split(/[,\n]/)
    .map(t => t.trim().replace(/^[-•]\s*/, ""))
    .filter(t => t.length > 0 && t.length < 50)
  
  const quotesRaw = quotesMatch?.[1]?.trim() || ""
  const quoteLines = quotesRaw.split("\n").filter(l => l.trim().startsWith("-") || l.trim().startsWith('"'))
  const quotes = quoteLines.map(line => {
    const match = line.match(/"([^"]+)"(?:\s*[-–—]\s*(.+))?/)
    if (match) {
      return {
        text: match[1].trim(),
        speaker: match[2]?.trim(),
      }
    }
    return null
  }).filter((q): q is { text: string; speaker?: string } => q !== null)
  
  return { summary, topics, quotes }
}

/**
 * Update episode file with AI enhancements
 */
async function updateEpisodeWithAi(
  episode: EpisodeFile,
  enhancements: AiEnhancement
): Promise<string> {
  const { data: frontmatter, content } = matter(await fs.readFile(episode.path, "utf-8"))
  
  // Update frontmatter
  frontmatter.aiEnhancedAt = new Date().toISOString()
  if (enhancements.topics.length > 0) {
    frontmatter.aiTopics = enhancements.topics
  }
  
  // Find where to insert AI content (after description, before transcript)
  let newContent = content
  
  // Remove existing AI Summary section if present
  newContent = newContent.replace(/## AI Summary[\s\S]*?(?=## |$)/, "")
  newContent = newContent.replace(/## Key Topics[\s\S]*?(?=## |$)/, "")
  newContent = newContent.replace(/## Notable Quotes[\s\S]*?(?=## |$)/, "")
  
  // Build AI sections
  let aiSections = "\n\n## AI Summary\n\n"
  aiSections += enhancements.summary + "\n"
  
  if (enhancements.topics.length > 0) {
    aiSections += "\n## Key Topics\n\n"
    aiSections += enhancements.topics.map(t => `\`${t}\``).join(" • ") + "\n"
  }
  
  if (enhancements.quotes.length > 0) {
    aiSections += "\n## Notable Quotes\n\n"
    for (const quote of enhancements.quotes) {
      aiSections += `> "${quote.text}"\n`
      if (quote.speaker) {
        aiSections += `> — ${quote.speaker}\n`
      }
      aiSections += "\n"
    }
  }
  
  // Insert before Transcript section if it exists
  const transcriptIndex = newContent.indexOf("## Transcript")
  if (transcriptIndex !== -1) {
    newContent = newContent.slice(0, transcriptIndex) + aiSections + "\n" + newContent.slice(transcriptIndex)
  } else {
    // Append at end
    newContent = newContent.trim() + aiSections
  }
  
  return matter.stringify(newContent, frontmatter)
}

/**
 * Main execution
 */
async function main() {
  console.log("🤖 TBP AI Enhancement")
  console.log("=" .repeat(50))
  console.log(`   Model: ${argv.model}`)
  
  // Check Ollama connectivity
  try {
    const healthCheck = await fetch(`${OLLAMA_URL}/api/tags`)
    if (!healthCheck.ok) throw new Error("Ollama not responding")
    console.log("   ✓ Ollama connected")
  } catch (error) {
    console.error("   ✗ Cannot connect to Ollama at", OLLAMA_URL)
    console.error("     Make sure Ollama is running: ollama serve")
    process.exit(1)
  }
  
  // Scan episodes
  console.log("\n📂 Scanning episodes...")
  const allEpisodes = await scanEpisodes()
  console.log(`   Found ${allEpisodes.length} total episodes`)
  
  // Filter to episodes with transcripts but no AI summary
  let episodes = allEpisodes.filter(ep => {
    // Must have transcript
    if (!ep.transcript) return false
    
    // Skip if already has AI summary (unless --force)
    if (ep.hasAiSummary && !argv.force) return false
    
    // Filter by specific episode number if provided
    if (argv.episode && ep.frontmatter.episodeNumber !== argv.episode) return false
    
    return true
  })
  
  console.log(`   ${episodes.length} episodes ready for AI enhancement`)
  
  // Apply max limit
  if (argv.max && episodes.length > argv.max) {
    episodes = episodes.slice(0, argv.max)
    console.log(`   Processing first ${argv.max} episodes`)
  }
  
  if (episodes.length === 0) {
    console.log("\n✅ All episodes with transcripts have AI summaries!")
    return
  }
  
  // Process each episode
  console.log("\n🔄 Generating AI content...")
  let successCount = 0
  let failCount = 0
  
  for (const episode of episodes) {
    const epNum = episode.frontmatter.episodeNumber || "?"
    const title = episode.frontmatter.title || "Untitled"
    
    console.log(`\n  [${epNum}] ${title.slice(0, 50)}...`)
    console.log(`       Transcript: ${episode.transcript!.length} chars`)
    
    try {
      // Generate AI enhancements
      console.log("       🤖 Generating summary...")
      const enhancements = await generateEnhancements(
        title,
        episode.frontmatter.description || "",
        episode.transcript!,
        argv.model as string
      )
      
      console.log(`       ✓ Summary: ${enhancements.summary.length} chars`)
      console.log(`       ✓ Topics: ${enhancements.topics.join(", ")}`)
      console.log(`       ✓ Quotes: ${enhancements.quotes.length} found`)
      
      if (argv.dryRun) {
        console.log("       [dry-run] Would update file")
        successCount++
        continue
      }
      
      // Update the episode file
      const updatedContent = await updateEpisodeWithAi(episode, enhancements)
      await fs.writeFile(episode.path, updatedContent)
      console.log("       ✓ Updated episode file")
      successCount++
      
    } catch (error: any) {
      console.log(`       ✗ Failed: ${error.message}`)
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
