# Quickstart: Podcast Landing Page

**Feature**: 001-i-would-like
**Purpose**: End-to-end test scenario to validate the landing page implementation
**Audience**: Developers testing the feature after implementation

---

## Prerequisites

- Quartz 4.5.2+ installed and configured
- Node.js >=22, npm >=10.9.2
- Repository cloned and dependencies installed (`npm install`)
- Quartz build system functional (`npx quartz build` works)

---

## Test Scenario: Complete Landing Page Flow

This scenario validates all functional requirements from the specification.

### Setup (3 minutes)

1. **Create test content directory structure**:
```bash
mkdir -p content/episodes
touch content/index.md
touch content/about.md content/sponsors.md content/contact.md content/guests.md
```

2. **Configure landing page** (`content/index.md`):
```yaml
---
title: "The Bitcoin Podcast"
tagline: "Exploring Bitcoin, blockchain, and the future of decentralized money"
discordUrl: "https://discord.gg/tbp-test"
twitterUrl: "https://twitter.com/tbp_test"
youtubeUrl: "https://youtube.com/@tbp_test"
rssUrl: "/index.xml"
aboutUrl: "/about"
sponsorsUrl: "/sponsors"
contactUrl: "/contact"
guestsUrl: "/guests"
episodesArchiveUrl: "/episodes"
---

Landing page content (optional).
```

3. **Create test episodes** (create 5+ episode files):

`content/episodes/001-intro-bitcoin.md`:
```yaml
---
title: "Introduction to Bitcoin"
date: 2025-10-01
episodeNumber: 1
duration: 45
audioUrl: "https://example.com/audio/ep001.mp3"
description: "A beginner-friendly introduction to Bitcoin, covering its history, technology, and why it matters."
thumbnail: "https://via.placeholder.com/600x400/F7931A/000000?text=Episode+1"
guests:
  - name: "Alice Bitcoiner"
    twitter: "@alice"
    linkedin: "https://linkedin.com/in/alice"
tags:
  - bitcoin
  - introduction
---

# Show Notes

Full episode content here...
```

`content/episodes/002-blockchain-basics.md`:
```yaml
---
title: "Blockchain Basics"
date: 2025-10-02
episodeNumber: 2
duration: 38
audioUrl: "https://example.com/audio/ep002.mp3"
description: "Understanding how blockchain technology works under the hood, with practical examples."
thumbnail: "https://via.placeholder.com/600x400/F7931A/000000?text=Episode+2"
tags:
  - blockchain
  - technology
---

# Show Notes
...
```

**Repeat for episodes 3, 4, 5** with incremental dates and episode numbers.

4. **Update `quartz.config.ts`** to include the landing page emitter:
```typescript
import * as Plugin from "./quartz/plugins"

const config: QuartzConfig = {
  // ... existing config
  plugins: {
    // ... existing transformers and filters
    emitters: [
      Plugin.LandingPage(),  // ADD THIS - emits landing page at /
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      // ... rest of emitters
    ],
  },
}
```

---

### Test Execution (5 minutes)

**Step 1: Build the site**
```bash
npx quartz build
```

**Expected output**:
- Build completes without errors
- Console log: "Emitting landing page at /"
- Output directory contains `public/index.html`

**Validation**:
```bash
ls -lh public/index.html  # Should exist
```

---

**Step 2: Start development server**
```bash
npx quartz build --serve
```

**Expected output**:
- Server starts on http://localhost:8080
- Hot reload enabled
- No console errors

---

**Step 3: Validate Hero Section (FR-001)**

Open http://localhost:8080/ in browser.

**Visual checks**:
- [ ] Podcast title "The Bitcoin Podcast" is displayed prominently
- [ ] Tagline "Exploring Bitcoin..." is visible below title
- [ ] Audio player for latest episode (Episode 5) is embedded
- [ ] "Join Discord" call-to-action button is visible
- [ ] Button links to Discord URL (hover shows correct URL)

**Developer tools check**:
```javascript
// In browser console
document.querySelector('.hero-title').textContent
// Expected: "The Bitcoin Podcast"

document.querySelector('.hero-tagline').textContent
// Expected: "Exploring Bitcoin, blockchain, and the future of decentralized money"

document.querySelector('audio source').src
// Expected: "https://example.com/audio/ep005.mp3" (latest episode)

document.querySelector('.cta-button').href
// Expected: "https://discord.gg/tbp-test"
```

---

**Step 4: Validate Episode Grid (FR-002, FR-010)**

Scroll down to episode section.

**Visual checks**:
- [ ] 5 episode cards are displayed
- [ ] Episodes are in reverse chronological order (5, 4, 3, 2, 1)
- [ ] Each card shows: thumbnail, title, date, duration, description
- [ ] Orange accent color (#F7931A) is used for emphasis
- [ ] Cards are in upper third of page (after hero)
- [ ] "View All Episodes" link is visible below cards

**Developer tools check**:
```javascript
document.querySelectorAll('.episode-card').length
// Expected: 5

Array.from(document.querySelectorAll('.episode-card h3')).map(el => el.textContent)
// Expected: ["Episode 5 Title", "Episode 4 Title", ..., "Introduction to Bitcoin"]

document.querySelector('.episodes-archive-link').href
// Expected: "/episodes"
```

---

**Step 5: Validate Navigation (FR-003-006, FR-013)**

**Visual checks**:
- [ ] Header navigation bar contains: About, Sponsors, Contact Us, Guests links
- [ ] Links have clear labels
- [ ] On mobile (resize to <768px): hamburger menu appears
- [ ] Mobile menu contains same navigation links

**Developer tools check**:
```javascript
Array.from(document.querySelectorAll('nav a')).map(a => ({ text: a.textContent, href: a.href }))
// Expected:
// [
//   { text: "About", href: "/about" },
//   { text: "Sponsors", href: "/sponsors" },
//   { text: "Contact Us", href: "/contact" },
//   { text: "Guests", href: "/guests" }
// ]
```

---

**Step 6: Validate Social Links (FR-007-009)**

**Visual checks**:
- [ ] Social media icons visible (Discord, Twitter, YouTube, RSS)
- [ ] Icons are SVG (not images)
- [ ] Hover shows platform name or URL

**Developer tools check**:
```javascript
Array.from(document.querySelectorAll('.social-links a')).map(a => ({
  platform: a.getAttribute('aria-label'),
  url: a.href
}))
// Expected:
// [
//   { platform: "Visit our Discord", url: "https://discord.gg/tbp-test" },
//   { platform: "Visit our Twitter", url: "https://twitter.com/tbp_test" },
//   { platform: "Visit our YouTube", url: "https://youtube.com/@tbp_test" },
//   { platform: "Subscribe via RSS", url: "/index.xml" }
// ]
```

---

**Step 7: Validate Responsive Design (FR-011)**

Resize browser window to test breakpoints:

**Mobile (320px-767px)**:
- [ ] Single column layout
- [ ] Episode cards stack vertically
- [ ] Hero text readable (no overflow)
- [ ] Hamburger menu functional
- [ ] Audio player controls accessible

**Tablet (768px-1023px)**:
- [ ] Two-column episode grid
- [ ] Navigation bar visible (no hamburger)
- [ ] Readable font sizes

**Desktop (1024px+)**:
- [ ] Three-column episode grid (or 2 wider cards)
- [ ] Full navigation bar
- [ ] Optimal spacing and typography

**Developer tools**:
```javascript
// Resize to 375px width (mobile)
window.innerWidth = 375
// Visual check: cards stack vertically

// Resize to 800px width (tablet)
window.innerWidth = 800
// Visual check: 2-column grid

// Resize to 1280px width (desktop)
window.innerWidth = 1280
// Visual check: 3-column grid
```

---

**Step 8: Validate Brand Colors (FR-012)**

**Visual checks**:
- [ ] TBP logo in header
- [ ] Orange (#F7931A) used for accents (buttons, highlights)
- [ ] Black (#000000) and white (#FFFFFF) base colors
- [ ] Consistent with quartz.config.ts theme.colors

**Developer tools check**:
```javascript
getComputedStyle(document.querySelector('.cta-button')).backgroundColor
// Expected: "rgb(247, 147, 26)" (which is #F7931A)

getComputedStyle(document.documentElement).getPropertyValue('--secondary')
// Expected: "#F7931A"
```

---

**Step 9: Validate Graceful Degradation (FR-014)**

**Test with empty sponsors**:

Remove `content/sponsors.md` or make it empty.

```bash
rm content/sponsors.md
npx quartz build --serve
```

**Expected**:
- [ ] Landing page still renders
- [ ] Sponsors link hidden or shows "Coming soon" state
- [ ] No broken links or console errors

**Test with no episodes**:

```bash
rm content/episodes/*.md
npx quartz build --serve
```

**Expected**:
- [ ] Landing page renders
- [ ] Episode section shows empty state message
- [ ] No JavaScript errors
- [ ] Featured player in hero shows fallback (or is hidden)

---

**Step 10: Validate Accessibility**

**Automated check** (using axe DevTools or Lighthouse):
```bash
npx lighthouse http://localhost:8080 --only-categories=accessibility --output=html --output-path=./lighthouse-report.html
```

**Expected**:
- Accessibility score ≥90
- No critical WCAG violations

**Manual keyboard navigation**:
- [ ] Tab through navigation links (visible focus indicators)
- [ ] Tab to episode cards and audio player
- [ ] Space/Enter activates links and buttons
- [ ] Audio player controls keyboard accessible

**Screen reader test** (VoiceOver on Mac or NVDA on Windows):
- [ ] Hero title and tagline announced
- [ ] Episode cards announced with title, date, duration
- [ ] Social links announced with platform name
- [ ] Audio player has accessible label

---

### Performance Validation

**Build time**:
```bash
time npx quartz build
```

**Expected**: <5 seconds for site with 5 episodes

**Dev server hot reload**:
1. Edit `content/index.md` (change tagline)
2. Save file

**Expected**: Page reloads in <1 second with updated content

---

### Integration Tests

**Test episode frontmatter validation**:

Create invalid episode: `content/episodes/invalid.md`
```yaml
---
title: "Missing required fields"
date: 2025-10-10
# Missing: episodeNumber, duration, audioUrl, description, thumbnail
---
```

**Expected**:
- Episode excluded from landing page
- Console warning: "Episode invalid.md missing required fields"
- Build does not fail

---

**Test draft episode**:

Create draft episode: `content/episodes/draft.md`
```yaml
---
title: "Draft Episode"
date: 2025-10-11
episodeNumber: 99
duration: 30
audioUrl: "https://example.com/draft.mp3"
description: "This is a draft."
thumbnail: "https://via.placeholder.com/600x400"
draft: true
---
```

**Expected**:
- Episode NOT shown on landing page
- Only published episodes appear

---

### Success Criteria

All checkboxes above marked ✅ **AND**:
- Zero console errors in browser DevTools
- Zero TypeScript compilation errors
- Lighthouse accessibility score ≥90
- Build time <5 seconds
- Hot reload <1 second
- All 14 functional requirements (FR-001 through FR-014) validated

---

## Cleanup

```bash
# Stop dev server (Ctrl+C)

# Remove test content (if desired)
rm -rf content/episodes/
rm content/index.md content/about.md content/sponsors.md content/contact.md content/guests.md

# Restore original content
git checkout content/
```

---

## Troubleshooting

**Issue**: Landing page not generated at `/`
- Check: `quartz.config.ts` emitters array includes `Plugin.LandingPage()`
- Check: Order in array (should be before or after `ContentPage`)

**Issue**: Episodes not showing
- Check: Episode files in `content/episodes/` directory
- Check: Frontmatter has all required fields
- Check: `draft: true` not set
- Check: Console for validation warnings

**Issue**: Audio player not working
- Check: `audioUrl` is valid URL
- Check: Audio file is MP3 format
- Check: CORS headers if audio hosted externally

**Issue**: Styles not applied
- Check: `landingPage.scss` imported in component
- Check: esbuild-sass-plugin configured in quartz.config.ts
- Check: Browser DevTools for CSS loading errors

**Issue**: Build fails
- Check: TypeScript compilation errors (`npm run check`)
- Check: YAML syntax in frontmatter (use YAML linter)
- Check: Node.js version >=22

---

**Quickstart validated**: If all steps pass, the landing page feature is complete and ready for production use.
