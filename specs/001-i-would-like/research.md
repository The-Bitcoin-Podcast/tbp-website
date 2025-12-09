# Research: Podcast Landing Page

**Feature**: 001-i-would-like
**Date**: 2025-10-04
**Status**: Complete

## Research Questions

### 1. Quartz Component Architecture Patterns

**Decision**: Implement as custom page component using QuartzComponent interface

**Rationale**:
- Quartz uses Preact functional components with a standard interface (`QuartzComponent`)
- Existing page components (Content.tsx, FolderContent.tsx, TagContent.tsx) follow consistent patterns:
  - Export named component function with `QuartzComponentConstructor` signature
  - Use `QuartzComponentProps` for standardized props (fileData, allFiles, cfg, tree, etc.)
  - Export component metadata (componentType, css, beforeDOMLoaded, afterDOMLoaded)
- Landing page should follow same pattern for consistency and compatibility

**Alternatives considered**:
- Static HTML template: Rejected - doesn't integrate with Quartz's build system and theming
- React-based separate app: Rejected - introduces dependency conflicts and build complexity

**References**:
- `/quartz/components/pages/Content.tsx` - Standard single-page component
- `/quartz/components/pages/FolderContent.tsx` - Example of querying and rendering multiple files
- `/quartz/components/types.ts` - QuartzComponent type definitions

---

### 2. Episode Data Model and Frontmatter Schema

**Decision**: Use YAML frontmatter in markdown files with specific episode fields

**Rationale**:
- Quartz uses `gray-matter` to parse frontmatter from markdown files
- FrontMatter plugin (`Plugin.FrontMatter()`) already configured in quartz.config.ts
- Episodes should be markdown files in `content/episodes/` with frontmatter:
  ```yaml
  ---
  title: "Episode Title"
  date: 2025-10-04
  episodeNumber: 1
  duration: 45
  audioUrl: "https://example.com/episode-001.mp3"
  description: "Brief 2-3 sentence description"
  thumbnail: "/static/episodes/episode-001.jpg"
  guests:
    - name: "Guest Name"
      twitter: "@guesthandle"
      linkedin: "https://linkedin.com/in/guest"
  tags:
    - topic1
    - topic2
  ---

  Full episode show notes content...
  ```

**Alternatives considered**:
- JSON data files: Rejected - violates content-first principle, not searchable by Quartz
- Separate YAML config: Rejected - duplicates data, harder to maintain
- Embedded in index.md: Rejected - doesn't scale, harder to manage individual episodes

**Implementation notes**:
- Use `allFiles` prop to query episode files
- Filter by path prefix `content/episodes/`
- Sort by date (descending) to get latest episodes
- Frontmatter accessed via `file.frontmatter`

---

### 3. Custom Emitter Plugin for Root Route

**Decision**: Create custom emitter plugin `LandingPage` to generate index.html at root

**Rationale**:
- Quartz emitters control what HTML pages get generated and at what routes
- Existing emitters: ContentPage (individual pages), FolderPage (folder indexes), TagPage (tag indexes)
- Landing page needs custom route handling to override default behavior at `/`
- Emitter plugin pattern:
  - Export function returning `QuartzEmitterPlugin`
  - Implement `emit()` method that returns `FilePath[]`
  - Use `renderPage()` to generate HTML with component tree
  - Write output to `argv.output` directory

**Alternatives considered**:
- Override FolderPage emitter: Rejected - too invasive, affects other folders
- Use index.md with custom layout: Rejected - limited control over component composition
- Client-side routing: Rejected - violates static generation constraint

**Implementation notes**:
- Register in quartz.config.ts emitters array
- Emit single file: `index.html` at root
- Pass LandingPage component to renderPage()
- May need to configure order in emitters array to take precedence

**References**:
- `/quartz/plugins/emitters/contentPage.tsx` - Standard page emitter
- `/quartz/plugins/emitters/folderPage.tsx` - Multi-file querying example

---

### 4. Responsive CSS Strategy

**Decision**: Use SCSS with mobile-first breakpoints, leverage Quartz theme variables

**Rationale**:
- Quartz uses esbuild-sass-plugin for SCSS compilation
- Existing components use SCSS in `/quartz/components/styles/`
- Theme colors available as CSS variables (defined in theme config)
- Mobile-first approach aligns with requirement for 320px-1024px+ support
- Breakpoints:
  - Mobile: default (320px+)
  - Tablet: `@media (min-width: 768px)`
  - Desktop: `@media (min-width: 1024px)`

**Implementation pattern**:
```scss
.landing-page {
  // Mobile styles (default)

  @media (min-width: 768px) {
    // Tablet overrides
  }

  @media (min-width: 1024px) {
    // Desktop overrides
  }
}
```

**Alternatives considered**:
- Tailwind CSS: Rejected - not part of Quartz stack, adds build complexity
- CSS-in-JS: Rejected - Quartz uses static SCSS compilation
- Inline styles: Rejected - no media query support, poor maintainability

**Theme integration**:
- Use `var(--secondary)` for TBP orange (#F7931A)
- Use `var(--dark)`, `var(--light)` for black/white
- Respect dark mode via existing theme variables

---

### 5. Audio Player Embed Options

**Decision**: Use HTML5 `<audio>` element with custom controls

**Rationale**:
- Native HTML5 audio works across all browsers without dependencies
- Lightweight, accessible (ARIA labels), keyboard navigable
- Fits within static generation constraints (no external player SDKs)
- Can be styled to match TBP brand

**Implementation**:
```tsx
<audio controls preload="metadata" aria-label={`Play ${episodeTitle}`}>
  <source src={audioUrl} type="audio/mpeg" />
  Your browser does not support the audio element.
</audio>
```

**Alternatives considered**:
- External embed (Spotify, Apple Podcasts): Rejected - requires iframe, privacy concerns, slower load
- Custom JavaScript player: Rejected - adds complexity, WCAG compliance burden
- Podcast player widget (podbean, etc.): Rejected - third-party dependency, tracking/ads

**Accessibility notes**:
- Include transcript link in episode page
- ARIA labels on controls
- Keyboard accessible (native browser controls)

---

### 6. Social Link Icon Strategy

**Decision**: Use SVG icons inline, no icon library dependency

**Rationale**:
- Quartz minimizes dependencies for build performance
- 4 social platforms (Discord, Twitter, YouTube, RSS) = small icon set
- Inline SVG allows styling via CSS (color, hover effects)
- No external requests, better performance

**Implementation**:
```tsx
const SocialIcon = ({ platform, url }: SocialLinkProps) => (
  <a href={url} aria-label={`Visit our ${platform}`}>
    <svg>{/* platform-specific path */}</svg>
  </a>
)
```

**Icon sources**:
- Simple Icons (MIT licensed SVGs)
- Copy SVG paths for Discord, Twitter, YouTube, RSS icons

**Alternatives considered**:
- FontAwesome: Rejected - adds 100KB+ for 4 icons
- React Icons: Rejected - not in Quartz stack, build time increase
- Image files: Rejected - additional HTTP requests, harder to style

---

### 7. Episode Card Design Pattern

**Decision**: Reuse and adapt Quartz `PageList` component pattern

**Rationale**:
- Existing `PageList.tsx` component already handles:
  - Sorting files by date
  - Rendering list of content items
  - Responsive grid layout
- Can be adapted or used as reference for episode cards
- Maintains visual consistency with rest of Quartz site

**Episode card structure**:
```tsx
<article class="episode-card">
  <img src={thumbnail} alt={title} />
  <div class="episode-meta">
    <h3>{title}</h3>
    <time>{date}</time> • <span>{duration} min</span>
  </div>
  <p>{description}</p>
  <a href={episodeUrl}>Listen →</a>
</article>
```

**Grid layout**:
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns (or 2 wider cards)

**Alternatives considered**:
- Full PageList reuse: Rejected - episode cards need custom layout (thumbnail, audio, duration)
- Custom from scratch: Accepted but use PageList patterns as reference
- Slider/carousel: Rejected - adds JavaScript complexity, accessibility concerns

---

## Technical Decisions Summary

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Component Type | QuartzComponent page component | Integrates with Quartz architecture |
| Data Storage | Markdown + YAML frontmatter | Content-first, searchable, portable |
| Routing | Custom emitter plugin | Control over root route generation |
| Styling | SCSS with theme variables | Existing Quartz pattern, responsive |
| Audio | HTML5 `<audio>` element | Accessible, lightweight, native |
| Icons | Inline SVG (4 icons) | No dependencies, styleable |
| Episode Display | Adapted PageList pattern | Consistency, proven approach |

---

## Implementation Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Emitter plugin conflicts with default index generation | High | Test emitter order in config, may need to disable default |
| Large number of episodes slows build | Medium | Limit to 5 latest, rest on archive page |
| Audio embeds increase page size | Low | Use preload="metadata" not preload="auto" |
| Custom CSS conflicts with theme | Medium | Use BEM naming, scope styles to .landing-page |

---

## Dependencies Verified

All required dependencies already present in package.json:
- ✅ `preact` 10.27.2 - Component rendering
- ✅ `gray-matter` 4.0.3 - Frontmatter parsing
- ✅ `esbuild-sass-plugin` 3.3.1 - SCSS compilation
- ✅ `github-slugger` 2.0.0 - URL slug generation
- ✅ No new dependencies required

---

**Status**: All research complete, no NEEDS CLARIFICATION items remaining. Ready for Phase 1 (Design & Contracts).
