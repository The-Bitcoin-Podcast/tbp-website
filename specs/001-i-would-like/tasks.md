# Tasks: Podcast Landing Page

**Feature**: 001-i-would-like
**Input**: Design documents from `/specs/001-i-would-like/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extract: TypeScript 5.9.2, Quartz 4.5.2, Preact, SCSS
2. Load design documents:
   → data-model.md: 4 entities (Episode, LandingPageConfig, Guest, SocialLink)
   → contracts/: types.ts, component-interface.ts
   → research.md: 7 technical decisions
   → quickstart.md: 10 test scenarios
3. Generate tasks by category:
   → Setup: Type definitions, content examples, styles foundation
   → Components: Utility functions, sub-components, main component
   → Integration: Emitter plugin, config registration
   → Testing: Component tests, integration tests, quickstart validation
4. Apply task rules:
   → Type defs, content, styles = [P] (different files)
   → Sub-components without dependencies = [P]
   → Main component depends on sub-components (sequential)
   → Tests can be written in parallel [P]
5. Number tasks sequentially (T001, T002...)
6. SUCCESS: 20 tasks ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 3.1: Foundation Setup

### T001 [P] Create TypeScript type definitions
**File**: `quartz/components/types/landingPage.ts`

Copy type definitions from `/specs/001-i-would-like/contracts/types.ts` into a new file at `quartz/components/types/landingPage.ts`. Ensure all types extend Quartz's built-in `QuartzPluginData` interface and export all interfaces.

**Acceptance**:
- File exists at `quartz/components/types/landingPage.ts`
- Exports: `EpisodeFrontmatter`, `LandingPageFrontmatter`, `Guest`, `SocialLink`, `EpisodeCard`, `NavLink`
- No TypeScript compilation errors (`npm run check`)

---

### T002 [P] Create example landing page content
**File**: `content/index.md`

Create the landing page configuration file with frontmatter containing podcast title, tagline, social URLs, and navigation URLs. Use the schema from `data-model.md` section "Landing Page Configuration".

**Content**:
```yaml
---
title: "The Bitcoin Podcast"
tagline: "Exploring Bitcoin, blockchain, and the future of decentralized money"
discordUrl: "https://discord.gg/tbp"
twitterUrl: "https://twitter.com/bitcoinpodcast"
youtubeUrl: "https://youtube.com/@bitcoinpodcast"
rssUrl: "/index.xml"
aboutUrl: "/about"
sponsorsUrl: "/sponsors"
contactUrl: "/contact"
guestsUrl: "/guests"
episodesArchiveUrl: "/episodes"
---

Welcome to The Bitcoin Podcast.
```

**Acceptance**:
- File exists at `content/index.md`
- YAML frontmatter is valid (build doesn't fail)
- All required fields present per data-model.md

---

### T003 [P] Create example episode content files
**Files**: `content/episodes/001-intro.md`, `content/episodes/002-basics.md`, `content/episodes/003-mining.md`, `content/episodes/004-wallets.md`, `content/episodes/005-future.md`

Create 5 example episode markdown files using the frontmatter schema from `data-model.md` section "Episode". Increment dates, episode numbers, and vary content.

**Example template** (adapt for each episode):
```yaml
---
title: "Introduction to Bitcoin"
date: 2025-09-15
episodeNumber: 1
duration: 45
audioUrl: "https://example.com/audio/ep001.mp3"
description: "A beginner-friendly introduction to Bitcoin, covering its history, technology, and why it matters."
thumbnail: "/static/tbp_logo.png"
guests:
  - name: "Alice Bitcoiner"
    twitter: "@alice"
tags:
  - bitcoin
  - introduction
---

# Episode 1: Introduction to Bitcoin

Show notes content here...
```

**Acceptance**:
- 5 episode files exist in `content/episodes/`
- All have valid frontmatter with required fields
- Dates are sequential and recent
- Episode numbers 1-5

---

### T004 [P] Create base SCSS styles
**File**: `quartz/components/styles/landingPage.scss`

Create the base stylesheet with mobile-first responsive layout, TBP brand colors, and component structure placeholders. Use research.md section "Responsive CSS Strategy" for breakpoints.

**Structure**:
```scss
.landing-page {
  // Mobile base styles (320px+)

  .hero {
    // Hero section styles
  }

  .episode-grid {
    // Episode grid (1 column on mobile)
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  @media (min-width: 768px) {
    .episode-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .episode-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
}
```

**Acceptance**:
- File exists at `quartz/components/styles/landingPage.scss`
- Uses TBP colors: `var(--secondary)` for #F7931A
- Mobile-first breakpoints at 768px and 1024px
- No SCSS compilation errors

---

## Phase 3.2: Utility Functions

### T005 Create utility functions
**File**: `quartz/components/utils/landingPageUtils.ts`

Implement utility functions defined in `contracts/component-interface.ts`: `getLatestEpisodes`, `parseLandingConfig`, `buildSocialLinks`, `buildNavLinks`.

**Functions to implement**:
1. `getLatestEpisodes(allFiles, limit = 5)` - Query and filter episodes from data-model.md "Query: Get Latest 5 Episodes"
2. `parseLandingConfig(frontmatter)` - Parse config with defaults
3. `buildSocialLinks(config)` - Generate social link array
4. `buildNavLinks(config)` - Generate nav link array

**Acceptance**:
- File exists at `quartz/components/utils/landingPageUtils.ts`
- All 4 functions exported
- TypeScript types match contracts/component-interface.ts
- No compilation errors

---

## Phase 3.3: Sub-Components

### T006 [P] Create Hero component
**File**: `quartz/components/LandingPageHero.tsx`

Create hero section component that displays podcast title, tagline, latest episode audio player, and Discord CTA button. Reference `contracts/component-interface.ts` for `HeroComponent` interface.

**Component structure**:
```tsx
export function Hero({ title, tagline, latestEpisode, discordUrl }: HeroProps) {
  return (
    <section class="hero">
      <h1>{title}</h1>
      <p class="tagline">{tagline}</p>
      {latestEpisode && (
        <audio controls preload="metadata" aria-label={`Play ${latestEpisode.title}`}>
          <source src={latestEpisode.audioUrl} type="audio/mpeg" />
        </audio>
      )}
      <a href={discordUrl} class="cta-button" aria-label="Join our Discord community">
        Join Discord
      </a>
    </section>
  )
}
```

**Acceptance**:
- File exists at `quartz/components/LandingPageHero.tsx`
- Exports `Hero` function
- Matches `HeroComponent` type from contracts
- Includes ARIA labels for accessibility

---

### T007 [P] Create EpisodeCard component
**File**: `quartz/components/EpisodeCard.tsx`

Create episode card component that displays thumbnail, title, date, duration, description, and link. Use `EpisodeCardComponent` interface from contracts.

**Component structure**:
```tsx
export function EpisodeCard({ episode }: EpisodeCardProps) {
  return (
    <article class="episode-card">
      <img src={episode.thumbnail} alt={episode.title} loading="lazy" />
      <div class="episode-meta">
        <h3>{episode.title}</h3>
        <time datetime={episode.date}>{formatDate(episode.date)}</time>
        <span> • {episode.duration} min</span>
      </div>
      <p>{episode.description}</p>
      {episode.guestNames && <p class="guests">With {episode.guestNames}</p>}
      <a href={`/${episode.slug}`}>Listen →</a>
    </article>
  )
}
```

**Acceptance**:
- File exists at `quartz/components/EpisodeCard.tsx`
- Exports `EpisodeCard` function
- Matches `EpisodeCardComponent` type
- Includes semantic HTML (`<article>`, `<time>`)

---

### T008 [P] Create EpisodeGrid component
**File**: `quartz/components/EpisodeGrid.tsx`

Create episode grid component that renders array of EpisodeCard components and "View All" link. Use `EpisodeGridComponent` interface from contracts.

**Component structure**:
```tsx
import { EpisodeCard } from "./EpisodeCard"

export function EpisodeGrid({ episodes, archiveUrl }: EpisodeGridProps) {
  return (
    <section class="episode-section">
      <h2>Recent Episodes</h2>
      <div class="episode-grid">
        {episodes.map(ep => <EpisodeCard episode={ep} />)}
      </div>
      <a href={archiveUrl} class="episodes-archive-link">View All Episodes →</a>
    </section>
  )
}
```

**Acceptance**:
- File exists at `quartz/components/EpisodeGrid.tsx`
- Exports `EpisodeGrid` function
- Maps over episodes array
- Imports and uses `EpisodeCard`

---

### T009 [P] Create SocialLinks component
**File**: `quartz/components/SocialLinks.tsx`

Create social links component with inline SVG icons for Discord, Twitter, YouTube, RSS. Use `SocialLinksComponent` interface from contracts. SVG icons from research.md "Social Link Icon Strategy".

**Component structure**:
```tsx
const icons = {
  discord: <svg>...</svg>,
  twitter: <svg>...</svg>,
  youtube: <svg>...</svg>,
  rss: <svg>...</svg>,
}

export function SocialLinks({ links }: SocialLinksProps) {
  return (
    <div class="social-links">
      {links.map(link => (
        <a href={link.url} aria-label={link.ariaLabel}>
          {icons[link.platform]}
        </a>
      ))}
    </div>
  )
}
```

**Acceptance**:
- File exists at `quartz/components/SocialLinks.tsx`
- Exports `SocialLinks` function
- Includes inline SVG for all 4 platforms
- ARIA labels on links

---

### T010 [P] Create Navigation component
**File**: `quartz/components/LandingPageNav.tsx`

Create navigation component with desktop nav bar and mobile hamburger menu. Use `NavigationComponent` interface from contracts.

**Component structure**:
```tsx
export function Navigation({ links, currentSlug }: NavigationProps) {
  return (
    <nav class="landing-nav">
      <ul class="desktop-nav">
        {links.map(link => (
          <li>
            <a href={link.url} class={currentSlug === link.url ? 'active' : ''}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      {/* Mobile hamburger menu */}
      <div class="mobile-nav">
        <button aria-label="Toggle menu">☰</button>
        <ul>
          {links.map(link => <li><a href={link.url}>{link.label}</a></li>)}
        </ul>
      </div>
    </nav>
  )
}
```

**Acceptance**:
- File exists at `quartz/components/LandingPageNav.tsx`
- Exports `Navigation` function
- Desktop and mobile versions
- Accessible hamburger menu

---

## Phase 3.4: Main Component

### T011 Create LandingPage main component
**File**: `quartz/components/pages/LandingPage.tsx`

Create main landing page component following Quartz `QuartzComponent` pattern. Import and compose all sub-components (Hero, EpisodeGrid, SocialLinks, Navigation). Use utility functions from T005.

**Component structure**:
```tsx
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { Hero } from "../LandingPageHero"
import { EpisodeGrid } from "../EpisodeGrid"
import { SocialLinks } from "../SocialLinks"
import { Navigation } from "../LandingPageNav"
import { getLatestEpisodes, parseLandingConfig, buildSocialLinks, buildNavLinks } from "../utils/landingPageUtils"

export default ((userOpts) => {
  function LandingPage({ fileData, allFiles, cfg }: QuartzComponentProps) {
    const config = parseLandingConfig(fileData.frontmatter)
    const episodes = getLatestEpisodes(allFiles, 5)
    const socialLinks = buildSocialLinks(config)
    const navLinks = buildNavLinks(config)
    const latestEpisode = episodes[0]

    return (
      <div class="landing-page">
        <Navigation links={navLinks} currentSlug="/" />
        <Hero
          title={config.title}
          tagline={config.tagline}
          latestEpisode={latestEpisode}
          discordUrl={config.discordUrl}
        />
        <EpisodeGrid episodes={episodes} archiveUrl={config.episodesArchiveUrl} />
        <SocialLinks links={socialLinks} />
      </div>
    )
  }

  LandingPage.css = "styles/landingPage.scss"
  return LandingPage
}) satisfies QuartzComponentConstructor
```

**Acceptance**:
- File exists at `quartz/components/pages/LandingPage.tsx`
- Follows Quartz component pattern (default export, constructor function)
- Imports all sub-components and utilities
- Sets `css` property to SCSS file
- No TypeScript errors

---

## Phase 3.5: Emitter Plugin

### T012 Create landing page emitter plugin
**File**: `quartz/plugins/emitters/landingPage.tsx`

Create custom emitter plugin to generate `index.html` at root route using the LandingPage component. Follow Quartz emitter pattern from existing emitters (see research.md "Custom Emitter Plugin for Root Route").

**Plugin structure**:
```tsx
import { QuartzEmitterPlugin } from "../types"
import { FilePath, FullSlug } from "../../util/path"
import { renderPage } from "../../components/renderPage"
import LandingPage from "../../components/pages/LandingPage"

export const LandingPageEmitter: QuartzEmitterPlugin = () => {
  return {
    name: "LandingPageEmitter",
    async emit(ctx, content, resources): Promise<FilePath[]> {
      const cfg = ctx.cfg.configuration
      const slug = "index" as FullSlug

      // Find index.md file
      const indexFile = content.find(f => f.slug === slug)
      if (!indexFile) return []

      // Render landing page
      const html = renderPage(cfg, slug, LandingPage, {
        fileData: indexFile,
        allFiles: content,
        cfg,
        tree: indexFile.htmlAst,
      })

      // Write to output
      const fp = "index.html" as FilePath
      await fs.promises.writeFile(path.join(ctx.argv.output, fp), html)
      return [fp]
    },
  }
}
```

**Acceptance**:
- File exists at `quartz/plugins/emitters/landingPage.tsx`
- Exports `LandingPageEmitter` function
- Returns QuartzEmitterPlugin object
- Emits `index.html` at root

---

### T013 Register emitter plugin in config
**File**: `quartz.config.ts`

Add the LandingPageEmitter to the emitters array in quartz.config.ts. Place it before or after ContentPage emitter (test both orders if conflicts arise).

**Changes**:
```typescript
import { LandingPageEmitter } from "./quartz/plugins/emitters/landingPage"

// In plugins.emitters array:
emitters: [
  LandingPageEmitter(),  // ADD THIS
  Plugin.AliasRedirects(),
  Plugin.ComponentResources(),
  Plugin.ContentPage(),
  // ... rest
]
```

**Acceptance**:
- `quartz.config.ts` imports LandingPageEmitter
- Plugin added to emitters array
- Build runs without errors (`npx quartz build`)

---

## Phase 3.6: Testing & Validation

### T014 [P] Create component unit tests
**File**: `tests/landingPage.test.ts`

Write unit tests for utility functions and component logic using tsx test runner. Test episode querying, sorting, config parsing, link building.

**Test cases**:
```typescript
import { describe, it } from "node:test"
import assert from "node:assert"
import { getLatestEpisodes, parseLandingConfig, buildSocialLinks } from "../quartz/components/utils/landingPageUtils"

describe("Landing Page Utils", () => {
  it("getLatestEpisodes returns max 5 episodes", () => {
    // Mock allFiles with 10 episodes
    // Assert result.length === 5
  })

  it("getLatestEpisodes sorts by date descending", () => {
    // Mock episodes with different dates
    // Assert newest first
  })

  it("parseLandingConfig provides defaults", () => {
    // Test with empty frontmatter
    // Assert defaults applied
  })

  it("buildSocialLinks excludes empty URLs", () => {
    // Config with some empty URLs
    // Assert only non-empty included
  })
})
```

**Acceptance**:
- File exists at `tests/landingPage.test.ts`
- At least 4 test cases
- Tests pass: `npm test`

---

### T015 Validate responsive design
**Manual test** (use quickstart.md Step 7)

Open dev server (`npx quartz build --serve`) and test responsive breakpoints:
- Mobile (320px): Single column, hamburger menu
- Tablet (768px): 2-column grid
- Desktop (1024px): 3-column grid

**Acceptance**:
- All breakpoints render correctly
- No horizontal scroll on mobile
- Episode cards resize appropriately

---

### T016 Validate hero section (FR-001)
**Manual test** (use quickstart.md Step 3)

Open http://localhost:8080/ and validate:
- Podcast title displayed
- Tagline visible
- Audio player for latest episode
- Discord CTA button functional

**Acceptance**:
- All hero elements present
- Audio player has correct src
- CTA links to Discord URL

---

### T017 Validate episode grid (FR-002, FR-010)
**Manual test** (use quickstart.md Step 4)

Validate episode display:
- 5 episodes shown
- Reverse chronological order
- Each card: thumbnail, title, date, duration, description
- Orange accent color (#F7931A)
- "View All" link present

**Acceptance**:
- 5 episode cards render
- Correct order (newest first)
- All metadata visible
- Brand colors applied

---

### T018 Validate accessibility
**Automated + Manual** (use quickstart.md Step 10)

Run Lighthouse accessibility audit:
```bash
npx lighthouse http://localhost:8080 --only-categories=accessibility --output=html --output-path=./lighthouse-report.html
```

Manual keyboard navigation test:
- Tab through all interactive elements
- Audio player keyboard accessible
- Screen reader announces content

**Acceptance**:
- Lighthouse score ≥90
- Keyboard navigation functional
- ARIA labels present

---

### T019 Validate build performance
**Performance test** (use quickstart.md "Performance Validation")

Measure build time and hot reload:
```bash
time npx quartz build
```

Edit `content/index.md` and measure reload time.

**Acceptance**:
- Build completes in <5 seconds
- Hot reload <1 second
- No performance regressions

---

### T020 Complete quickstart validation
**Integration test** (use quickstart.md all steps)

Execute all 10 quickstart steps and validate all functional requirements (FR-001 through FR-014).

**Acceptance**:
- All quickstart steps pass
- All 14 functional requirements validated
- Zero console errors
- All checkboxes marked ✅

---

## Dependencies

**Setup (T001-T004)** → Must complete first (parallel execution OK)

**Utilities (T005)** → Blocks T011 (main component needs utils)

**Sub-components (T006-T010)** → Block T011 (main component imports them)
- Can run in parallel [P] with each other
- Must complete before T011

**Main component (T011)** → Blocks T012 (emitter needs component)

**Emitter (T012)** → Blocks T013 (config needs emitter)

**Config (T013)** → Blocks T015-T020 (tests need working build)

**Testing (T014-T020)** → Can run in parallel [P] after T013

---

## Parallel Execution Examples

**Phase 3.1 Foundation (all parallel)**:
```bash
# Run T001-T004 simultaneously
Task: "Create TypeScript type definitions at quartz/components/types/landingPage.ts"
Task: "Create landing page content at content/index.md"
Task: "Create 5 episode files in content/episodes/"
Task: "Create base SCSS at quartz/components/styles/landingPage.scss"
```

**Phase 3.3 Sub-components (all parallel after T005)**:
```bash
# Run T006-T010 simultaneously
Task: "Create Hero component at quartz/components/LandingPageHero.tsx"
Task: "Create EpisodeCard component at quartz/components/EpisodeCard.tsx"
Task: "Create EpisodeGrid component at quartz/components/EpisodeGrid.tsx"
Task: "Create SocialLinks component at quartz/components/SocialLinks.tsx"
Task: "Create Navigation component at quartz/components/LandingPageNav.tsx"
```

**Phase 3.6 Testing (parallel after T013)**:
```bash
# T014 can run while manual tests T015-T020 execute
Task: "Create component unit tests at tests/landingPage.test.ts"
```

---

## Validation Checklist

**GATE: All must pass before marking feature complete**

- [x] All contracts have corresponding tests (T014)
- [x] All entities have implementations (Episode, LandingPageConfig via T002-T003)
- [x] All components created (T006-T011)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [ ] All 20 tasks completed (check during execution)
- [ ] Quickstart validation passes (T020)
- [ ] Build succeeds with no errors
- [ ] All 14 functional requirements validated

---

## Notes

- **[P] tasks** = different files, no dependencies, safe to run in parallel
- **Sequential tasks** = dependencies or same file modifications
- Commit after each completed task for rollback safety
- If a test fails in T014-T020, fix the corresponding implementation task
- Use `npm run check` frequently to catch TypeScript errors early

---

**Total tasks**: 20
**Estimated completion time**: 4-6 hours
**Parallelization potential**: ~12 tasks can run in parallel (T001-T004, T006-T010, T014)
