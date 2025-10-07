# Contract: EpisodeGrid Component

## Component Signature
```typescript
function EpisodeGrid({ 
  episodes, 
  archiveUrl 
}: EpisodeGridProps): JSX.Element
```

## Purpose
Renders the "Recent Episodes" section with episode cards and archive link. Displays empty state when no episodes are available.

## Input Contract (Props)

### EpisodeGridProps
```typescript
{
  episodes: EpisodeCard[]  // Array of episodes to display (0-5 typically)
  archiveUrl: string       // URL to full episode archive page
}
```

### EpisodeCard Type
```typescript
{
  title: string
  date: string
  duration: number | string
  slug: string
  description?: string      // Optional
  thumbnail: string
  audioUrl?: string         // Optional
  guestNames?: string       // Optional
}
```

## Output Contract (Rendered HTML)

### Normal State (episodes.length > 0)
```html
<section class="episode-section">
  <h2>Recent Episodes</h2>
  <div class="episode-grid">
    <!-- EpisodeCard components for each episode -->
  </div>
  <a href="{archiveUrl}" class="episodes-archive-link">
    View All Episodes →
  </a>
</section>
```

### Empty State (episodes.length === 0)
```html
<section class="episode-section">
  <h2>Recent Episodes</h2>
  <p class="no-episodes-message">
    No episodes available yet. Check back soon!
  </p>
</section>
```

## Behavior Contract

### Episode Display
- **When**: `episodes.length > 0`
- **Renders**: 
  - Section heading "Recent Episodes"
  - Grid container with episode cards
  - Archive link with text "View All Episodes →"
- **Each Card**: Rendered via `<EpisodeCard>` component

### Empty State Display
- **When**: `episodes.length === 0`
- **Renders**:
  - Section heading "Recent Episodes"
  - Message "No episodes available yet. Check back soon!"
  - NO archive link
  - NO episode grid

### Archive Link Visibility
- **Show**: When `episodes.length > 0`
- **Hide**: When `episodes.length === 0`
- **href**: Value of `archiveUrl` prop
- **Text**: "View All Episodes →" (with arrow)

## Visual Contract

### Layout
- Section spans full width of container
- Grid displays episode cards in responsive layout
- Archive link centered below grid

### CSS Classes
- `episode-section` - Section wrapper
- `episode-grid` - Grid container for cards
- `episodes-archive-link` - Archive link styling
- `no-episodes-message` - Empty state message styling (NEW)

### Responsive Behavior
- Desktop: Cards in multi-column grid
- Tablet: Fewer columns
- Mobile: Single column
- **Note**: Grid styling handled by SCSS, not component

## Edge Cases

### Zero Episodes
- **Input**: `episodes = []`
- **Output**: Empty state message, no archive link

### Single Episode
- **Input**: `episodes = [oneEpisode]`
- **Output**: Grid with 1 card, archive link shown

### Maximum Episodes (5)
- **Input**: `episodes = [ep1, ep2, ep3, ep4, ep5]`
- **Output**: Grid with 5 cards, archive link shown

### Episodes Missing Optional Fields
- **Input**: Episodes without `description`, `audioUrl`, or `guestNames`
- **Output**: Cards render without those fields (handled by EpisodeCard component)

### Invalid Archive URL
- **Input**: `archiveUrl = ""`
- **Output**: Link rendered but may be non-functional

## Accessibility Requirements

### Semantic HTML
- `<section>` for semantic structure
- `<h2>` for section heading (heading hierarchy)
- `<a>` for archive link (keyboard navigable)

### Screen Reader Support
- Section heading announces "Recent Episodes"
- Empty state message readable
- Archive link text descriptive ("View All Episodes" not just "click here")

## Testing Requirements

### Unit Tests Required
1. ✅ Renders section heading "Recent Episodes"
2. ✅ Renders episode cards when episodes provided
3. ✅ Renders archive link when episodes.length > 0
4. ✅ Does NOT render archive link when episodes.length === 0
5. ✅ Renders empty state message when episodes.length === 0
6. ✅ Passes correct props to EpisodeCard components
7. ✅ Archive link has correct href from archiveUrl prop
8. ✅ Archive link text is "View All Episodes →"
9. ✅ Correct CSS classes applied

### Visual Tests Required
1. Snapshot test with 0 episodes
2. Snapshot test with 1 episode
3. Snapshot test with 5 episodes
4. Mobile viewport rendering
5. Desktop viewport rendering

## Props Validation

### Required Props
- `episodes` - Must be array (enforced by TypeScript)
- `archiveUrl` - Must be string (enforced by TypeScript)

### Optional Props
- None

### Default Values
- None (all props required)

## Performance Expectations
- **Rendering**: O(n) where n = episodes.length (typically 5)
- **Re-renders**: Only when props change
- **Memory**: Minimal - stateless functional component

## Dependencies
- `EpisodeCard` component (child component)
- `EpisodeCard` type from `quartz/components/types/landingPage`
- Preact `JSX.Element`

## Related Contracts
- `EpisodeCard.component.contract.md` - Child component contract
- `getLatestEpisodes.contract.md` - Produces episodes prop
- `LandingPage.component.contract.md` - Parent component
