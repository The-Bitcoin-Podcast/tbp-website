# Contract: buildNavLinks

## Function Signature
```typescript
function buildNavLinks(config: LandingPageFrontmatter): NavLink[]
```

## Purpose
Builds an array of navigation links for the landing page header, including the new Episodes link.

## Input Contract

### Parameters
- `config: LandingPageFrontmatter`
  - Landing page configuration from frontmatter
  - Required fields:
    - `episodesArchiveUrl: string` - Path to episodes archive
    - `aboutUrl: string` - Path to about page
    - `sponsorsUrl: string` - Path to sponsors page
    - `contactUrl: string` - Path to contact page
    - `guestsUrl: string` - Path to guests page

### Preconditions
- `config` must be a valid object with URL fields
- URLs may be any valid string (including "#" placeholder)

## Output Contract

### Return Value
- `NavLink[]`
  - Array of exactly 5 navigation links
  - Links in specific order: Episodes, About, Sponsors, Contact, Guests
  - Each link has label and url properties

### NavLink Structure
```typescript
{
  label: string  // Display label
  url: string    // Destination URL/path
}
```

### Expected Output
```typescript
[
  { label: "Episodes", url: config.episodesArchiveUrl },
  { label: "About", url: config.aboutUrl },
  { label: "Sponsors", url: config.sponsorsUrl },
  { label: "Contact", url: config.contactUrl },
  { label: "Guests", url: config.guestsUrl }
]
```

## Behavior Contract

### Link Order
1. Episodes (NEW)
2. About
3. Sponsors
4. Contact
5. Guests

**Rationale**: Episodes first because it's primary content for podcast site.

### Label Mapping
- `episodesArchiveUrl` → "Episodes"
- `aboutUrl` → "About"
- `sponsorsUrl` → "Sponsors"
- `contactUrl` → "Contact"
- `guestsUrl` → "Guests"

### URL Handling
- URLs passed through unchanged
- No validation or filtering applied
- Placeholder "#" URLs allowed (filtered by Navigation component if needed)

## Edge Cases

### Placeholder URLs
- **Input**: `config.aboutUrl = "#"`
- **Output**: `{ label: "About", url: "#" }`
- **Note**: Navigation component decides whether to render

### Empty String URLs
- **Input**: `config.contactUrl = ""`
- **Output**: `{ label: "Contact", url: "" }`
- **Behavior**: Link may be non-functional but included

### Relative vs Absolute URLs
- **Input**: Can be relative (`/about`) or absolute (`https://example.com/about`)
- **Output**: Preserved as-is
- **Behavior**: Browser handles navigation

## Testing Requirements

### Unit Tests Required
1. ✅ Returns array with 5 links
2. ✅ Episodes link appears first in array
3. ✅ All labels are correct
4. ✅ All URLs match config values
5. ✅ Link order is Episodes, About, Sponsors, Contact, Guests
6. ✅ Handles placeholder "#" URLs
7. ✅ Handles empty string URLs
8. ✅ Handles relative URLs
9. ✅ Handles absolute URLs

### Test Fixtures Needed
```typescript
const mockConfig: LandingPageFrontmatter = {
  episodesArchiveUrl: "/episodes",
  aboutUrl: "/about",
  sponsorsUrl: "/sponsors",
  contactUrl: "/contact",
  guestsUrl: "/guests",
  // ... other required fields
}
```

## Comparison with Previous Version

### Before (4 links)
```typescript
[
  { label: "About", url: config.aboutUrl },
  { label: "Sponsors", url: config.sponsorsUrl },
  { label: "Contact", url: config.contactUrl },
  { label: "Guests", url: config.guestsUrl }
]
```

### After (5 links)
```typescript
[
  { label: "Episodes", url: config.episodesArchiveUrl },  // ← NEW
  { label: "About", url: config.aboutUrl },
  { label: "Sponsors", url: config.sponsorsUrl },
  { label: "Contact", url: config.contactUrl },
  { label: "Guests", url: config.guestsUrl }
]
```

### Breaking Changes
- ❌ None - This is additive only
- Navigation component already handles variable link counts
- Existing tests may need updates to expect 5 instead of 4 links

## Performance Expectations
- **Time Complexity**: O(1) - Fixed 5 links
- **Space Complexity**: O(1) - Fixed array size
- **Expected Load**: Called once per page render, negligible performance impact

## Dependencies
- `LandingPageFrontmatter` from `quartz/components/types/landingPage`
- `NavLink` from `quartz/components/types/landingPage`

## Related Contracts
- `Navigation.component.contract.md` - Consumes this output
- `parseLandingConfig.contract.md` - Produces the input config
