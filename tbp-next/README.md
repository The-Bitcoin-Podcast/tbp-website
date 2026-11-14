# The Bitcoin Podcast site (Next.js)

The site that deploys to thebitcoinpodcast.com. It reads Markdown from `../content`
and is built as static files for GitHub Pages by `.github/workflows/deploy.yml`.

## Commands (run from `tbp-next/`)

```bash
npm ci
npm run dev      # local preview on http://localhost:3334
npm run build    # search index + static site into out/
```

## Previewing a pull request without building

Every pull request's "Deploy Next.js site to GitHub Pages" run attaches the built
site as `site-preview-pr-<number>`; the run's summary page links to it. Download
and unzip it, then:

```bash
npx serve <unzipped folder>
```

Open the address it prints. Opening `index.html` directly does not work.

## Clip search

Search goes from episodes down to moments. Episodes whose title, guests,
description or chapter list match come first, then episodes where the phrase was
only said out loud. Each episode shows a timeline with a tick wherever the phrase
was said, and every moment plays from that second. Wide screens show the episode
list and a live preview side by side; narrow screens show expandable cards.

Moments come from timestamped transcripts in `data/transcripts/`, which are
committed because CI cannot produce them. Episode headlines are read from the
Markdown in `content/episodes/` at build time.

```bash
npm run search:captions   # YouTube captions for episodes with a youtubeId
npm run search:whisper    # local Whisper for audio-only episodes (Apple Silicon)
npm run search:index      # rebuild public/pagefind (also part of npm run build)
```

The two transcript scripts need a Python venv at `.venv-tools` with `yt-dlp`,
`mlx-whisper` and `pyyaml`. Commit the new files in `data/transcripts/` afterwards.

## New episodes

Nobody adds episodes by hand. The `Sync new episodes` workflow
(`.github/workflows/sync-episodes.yml`) runs every hour and:

1. asks YouTube for the latest uploads on each channel in
   `scripts/sync/config.json` (1 unit of API quota per channel);
2. when there is something new, runs the repo's `youtube-sync` script and
   files the result (`scripts/sync/sync.mjs`):
   - clips under 3 minutes go to `content/episodes/shorts/` as drafts,
   - titles matching a `subShows` pattern go to that show's folder,
   - 📱 mobile versions take their full episode's number and stay drafts,
   - premieres and live streams that haven't aired are left for a later run,
   - everything else is published as the next numbered full episode;
3. fetches YouTube captions for recent episodes that have no transcript yet,
   retrying each hour for three weeks, since captions lag the upload;
4. commits to `main`, starts the deploy, and posts the new episode to Discord.

It needs two repository secrets: `YOUTUBE_API_KEY` (required) and
`DISCORD_WEBHOOK_URL` (optional; without it nothing is posted).

To change how videos are filed, edit `scripts/sync/config.json`. To fix a
misfiled episode, move or edit the Markdown file; a video already in
`content/episodes` is never synced twice. Run the workflow by hand from the
Actions tab with "Run workflow".

## Newsletter signup

Set `NEXT_PUBLIC_NEWSLETTER_FORM_ACTION` (see `.env.example`) to the email
service's form URL. Until it is set the form shows "Signups open soon."
