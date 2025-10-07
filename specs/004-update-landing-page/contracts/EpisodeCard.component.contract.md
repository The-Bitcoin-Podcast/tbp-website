# Contract: EpisodeCard Component

## Component Signature
```typescript
function EpisodeCard({ episode }: EpisodeCardProps): JSX.Element
```

## Purpose
Renders an individual episode card with thumbnail, metadata, description, and link to full episode page. Handles optional fields gracefully.

## Input Contract (Props)

### EpisodeCardProps
```typescript
{
  episode: EpisodeCard
}
```

### EpisodeCard Type
```typescript
{
  title: string          // Episode title
  date: string           // ISO 8601 date string
  duration: number | string // Duration (minutes or "MM:SS")
  slug: string           // Episode URL slug
  description?: string   // Optional brief description
  thumbnail: string      // Thumbnail image URL/path
  audioUrl?: string      // Optional audio file URL
  guestNames?: string    // Optional comma-separated guest names
}
```

## Output Contract (Rendered HTML)

### Full Card (All Optional Fields Present)
```html
<article class="episode-card">
  <img src="{thumbnail}" alt="{title}" loading="lazy" />
  <div class="episode-meta">
    <h3>{title}</h3>
    <time datetime="{date}">{formattedDate}</time>
    <span> • {duration} min</span>
  </div>
  <p>{description}</p>
  <p class="guests">With {guestNames}</p>
  <a href="/{slug}">Listen →</a>
</article>
```

### Minimal Card (No Optional Fields)
```html
<article class="episode-card">
  <img src="{thumbnail}" alt="{title}" loading="lazy" />
  <div class="episode-meta">
    <h3>{title}</h3>
    <time datetime="{date}">{formattedDate}</time>
    <span> • {duration}</span>
  </div>
  <a href="/{slug}">Listen →</a>
</article>
```

## Behavior Contract

### Required Elements (Always Rendered)
- `<img>` - Episode thumbnail
- `<h3>` - Episode title
- `<time>` - Publication date (formatted)
- Duration display (after bullet)
- `<a>` - Link to episode page

### Optional Elements (Conditionally Rendered)

#### Description
- **Show when**: `episode.description` is defined and non-empty
- **Render**: `<p>{description}</p>`
- **Hide when**: `episode.description` is undefined or empty string

#### Guest Names
- **Show when**: `episode.guestNames` is defined and non-empty
- **Render**: `<p class="guests">With {guestNames}</p>`
- **Hide when**: `episode.guestNames` is undefined or empty string

### Date Formatting
- **Input**: ISO 8601 string (e.g., "2015-06-23")
- **Output**: Localized format (e.g., "June 23, 2015")
- **Function**: `formatDate(episode.date)` utility
- **Locale**: "en-US"
- **Format**: Long month, numeric day, numeric year

### Duration Display
- **If number**: Display as "{duration} min" (e.g., "54 min")
- **If string**: Display as-is (e.g., "54:01")
- **Logic**: Type-agnostic display

### Link Generation
- **Pattern**: `/{slug}` (leading slash added)
- **Example**: slug "episodes/001-title" → href "/episodes/001-title"
- **Text**: "Listen →" (with arrow)

### Image Loading
- **Lazy loading**: `loading="lazy"` attribute
- **Alt text**: Episode title
- **No fallback**: Assumes thumbnail URL is valid

## Edge Cases

### Missing Description
- **Input**: `episode.description = undefined`
- **Output**: Description `<p>` not rendered

### Missing Guest Names
- **Input**: `episode.guestNames = undefined`
- **Output**: Guests `<p>` not rendered

### Empty String Description
- **Input**: `episode.description = ""`
- **Output**: Description `<p>` not rendered (Preact/React behavior)

### Duration as String
- **Input**: `episode.duration = "54:01"`
- **Output**: Displayed as "• 54:01" (no " min" suffix)

### Duration as Number
- **Input**: `episode.duration = 54`
- **Output**: Displayed as "• 54 min"

### Invalid Date String
- **Input**: `episode.date = "invalid"`
- **Output**: formatDate returns "Invalid Date" or similar
- **Behavior**: Rendered as-is (no error thrown)

### Long Title
- **Input**: Very long title (>150 chars)
- **Output**: Rendered fully, CSS handles wrapping/truncation

### Broken Thumbnail URL
- **Input**: `episode.thumbnail = "https://invalid.url/image.jpg"`
- **Output**: Browser shows broken image icon
- **No fallback**: Component doesn't handle

## Visual Contract

### CSS Classes
- `episode-card` - Card wrapper
- `episode-meta` - Title and date container
- `guests` - Guest names paragraph

### Image
- Displayed at top of card
- Aspect ratio preserved
- Lazy loaded for performance

### Metadata Layout
- Title as `<h3>` (largest text)
- Date and duration on same line
- Bullet separator between date and duration

### Link Styling
- "Listen →" with right arrow
- Positioned at bottom of card
- Styled as call-to-action

## Accessibility Requirements

### Semantic HTML
- `<article>` for card semantics
- `<h3>` for episode title (heading hierarchy)
- `<time>` with datetime attribute for dates
- `<a>` for navigation (keyboard accessible)

### Image Accessibility
- Alt text set to episode title
- Decorative images still get meaningful alt

### Screen Reader Support
- Time element with datetime attribute (machine-readable)
- Link text descriptive ("Listen" + episode context from title)

## Testing Requirements

### Unit Tests Required
1. ✅ Renders all required elements (image, title, date, duration, link)
2. ✅ Shows description when present
3. ✅ Hides description when undefined
4. ✅ Shows guest names when present
5. ✅ Hides guest names when undefined
6. ✅ Formats date correctly
7. ✅ Handles duration as number (with " min")
8. ✅ Handles duration as string (without " min")
9. ✅ Link href matches slug with leading slash
10. ✅ Image has lazy loading attribute
11. ✅ Time element has datetime attribute

### Visual Tests Required
1. Snapshot with all fields
2. Snapshot with minimal fields
3. Snapshot with long title
4. Snapshot with multiple guests

## Props Validation

### Required Props
- `episode` - Must be EpisodeCard object (enforced by TypeScript)
- `episode.title` - Must be string
- `episode.date` - Must be string
- `episode.duration` - Must be number or string
- `episode.slug` - Must be string
- `episode.thumbnail` - Must be string

### Optional Props
- `episode.description` - May be undefined
- `episode.audioUrl` - May be undefined (currently unused in component)
- `episode.guestNames` - May be undefined

## Performance Expectations
- **Rendering**: O(1) - Fixed complexity
- **Re-renders**: Only when episode prop changes
- **Memory**: Minimal - stateless functional component
- **Images**: Lazy loaded to improve page load time

## Dependencies
- `formatDate` utility from `quartz/components/utils/landingPageUtils`
- `EpisodeCard` type from `quartz/components/types/landingPage`
- Preact `JSX.Element`

## Related Contracts
- `EpisodeGrid.component.contract.md` - Parent component
- `getLatestEpisodes.contract.md` - Produces episode data
- `formatDate.contract.md` - Date formatting utility
