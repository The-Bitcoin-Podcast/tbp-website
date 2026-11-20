# Then / Now: production pipeline

You record the narration. The pipeline does the rest: it keeps your best takes, cuts the archive clips, levels and masters the audio, and renders the YouTube video.

```
script.md + episode.yaml ─┐
your narration recording ─┼─► podcast/pipeline/make.py ─► episode.mp3   (Spotify / RSS host)
archive episode audio ────┘                              episode.mp4   (YouTube, 1080p)
                                                         captions.srt, chapters.txt, report.txt
```

## Making an episode

1. **Refresh the `[DATA]` numbers** in `script.md` and `episode.yaml` (prices, TVL). Each one says where it comes from.
2. **Record the narration.** Read every `NARRATOR:` passage, top to bottom, in one file. If you have to, split it across several files, named so they sort in order.
   - **Flub a line?** Pause, then say the whole sentence again. The pipeline keeps your *last* complete take of each sentence and drops everything else, including "uh, let me redo that".
   - Don't read the clips, `[CHART]` lines or `[DATA]` notes. Read everything under `NARRATOR:`.
   - Leave a breath between sentences. The pipeline removes long pauses, so take your time.
   - Record WAV or high-quality M4A, mono is fine. Use a quiet room with soft surfaces (a closet full of clothes works well), with the mic about a fist away and slightly off-axis.
3. **Build it** (from the repo root):

   ```bash
   tbp-next/.venv-tools/bin/python podcast/pipeline/make.py plans/episodes/01-the-dao-hack --narration ~/Desktop/ep01.wav
   ```

   Several files: `--narration take1.wav pickups.wav`. Audio only: add `--no-video`. A first run takes about 5 minutes; it downloads the source episodes once and caches them.
4. **Read `report.txt`.**
   - `MISSING` lines are sentences the pipeline couldn't find in your recording. Record just those into a pickups file, then re-run with both files.
   - `CHECK` lines matched loosely. Give them a listen.
   - `RETAKE` lines show which take was kept.
5. **Listen to `episode.mp3` all the way through** before publishing. That's the human sign-off.
6. **Publish.**
   - Upload `episode.mp3` to the podcast host, which feeds Spotify and Apple.
   - Upload `episode.mp4` to YouTube, with `captions.srt` as the captions file.
   - Paste `chapters.txt` into the YouTube description, along with the show notes from `fact-check-and-show-notes.md`.

## What it does

| Step | File | How |
|---|---|---|
| Read the script | `script_parse.py` | Sections, narration sentences, `[CLIP]`, `[CHART]` and `[STING]` cues. `[DATA]` notes are never read aloud. |
| Archive clips | `clips.py` | For each quote, transcribes a window of the source episode around the script timestamp (local Whisper), finds the exact words, and cuts just before the first word to just after the last. Two-part clips are joined with a breath. |
| Your narration | `narration.py` | Transcribes your recording, finds every script sentence in order, keeps the last good take, and joins sentences recorded back to back. Retakes, flubs and long pauses are cut out. |
| Assemble and master | `assemble.py` | Brings each piece to the same loudness so 2016 Skype calls sit level with you, puts everything in script order, and masters to -16 LUFS (the Spotify/Apple target) as a 160 kbps MP3. |
| Video | `video.py` | Draws section cards, archive-quote cards and the charts defined in `episode.yaml` (headless Chrome), adds a live waveform and burned-in captions, and writes `captions.srt` and YouTube chapters. |

## Per-episode files

- **`script.md`:** the words, as written. The format is described at the top of `script_parse.py`.
- **`episode.yaml`:** what the script can't say on its own: which archive episode each clip source means (`TBP68` → `tbp/066-tbp68-…`), and the data for each `[CHART]`. The chart types are `tiles`, `steps`, `fork`, `compare`, `bars` and `scorecard`.

## Music

The intro and outro stings are placeholder chimes. To use real ones, drop `sting.wav` and `outro.wav` into `podcast/assets/`. They must be properly licensed: royalty-free, or made for the show.

## Requirements

- ffmpeg (with libass and libx264), Google Chrome, and the `tbp-next/.venv-tools` Python environment. It already has `mlx_whisper`, which needs an Apple Silicon Mac.
- Output goes to `podcast/build/` and is not committed.
