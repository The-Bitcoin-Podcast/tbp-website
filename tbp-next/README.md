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

## Newsletter signup

Set `NEXT_PUBLIC_NEWSLETTER_FORM_ACTION` (see `.env.example`) to the email
service's form URL. Until it is set the form shows "Signups open soon."
