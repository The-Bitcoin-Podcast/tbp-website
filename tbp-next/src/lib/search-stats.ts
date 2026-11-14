import fs from "fs";
import path from "path";

const TRANSCRIPTS_DIR = path.join(process.cwd(), "data", "transcripts");

export interface SearchStats {
  episodes: number;
  clips: number;
}

/** Counts what the clip search covers, read from the transcript files at build time. */
export function getSearchStats(): SearchStats {
  const stats: SearchStats = { episodes: 0, clips: 0 };
  if (!fs.existsSync(TRANSCRIPTS_DIR)) return stats;

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".json") && !entry.name.startsWith("_")) {
        try {
          const transcript = JSON.parse(fs.readFileSync(full, "utf-8"));
          stats.episodes += 1;
          stats.clips += Array.isArray(transcript.segments) ? transcript.segments.length : 0;
        } catch {
          // A transcript still being written is skipped until the next build.
        }
      }
    }
  };
  walk(TRANSCRIPTS_DIR);
  return stats;
}
