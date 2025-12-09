# Contract: getLatestEpisodes

## Function Signature
```typescript
function getLatestEpisodes(
  allFiles: QuartzPluginData[],
  limit: number = 5
): EpisodeCard[]
```

## Purpose
Filters, validates, sorts, and returns the latest N podcast episodes for display on the landing page.

## Input Contract

### Parameters
- `allFiles: QuartzPluginData[]`
  - Array of all site content files
  - May include non-episode files
  - May include draft episodes
  - Required fields vary by file type

- `limit: number`
  - Maximum number of episodes to return
  - Default: 5
  - Must be positive integer
  - If more episodes exist, only first N returned after sorting

### Preconditions
- `allFiles` must be a valid array (may be empty)
- `limit` must be >= 0

## Output Contract

### Return Value
- `EpisodeCard[]`
  - Array of 0 to N episode cards (where N = limit)
  - Sorted by publication date (newest first)
  - Only published episodes (draft: false or undefined)
  - Only episodes with required fields

### EpisodeCard Structure
```typescript
{
  title: string          // Episode title
  date: string           // ISO 8601 date string
  duration: number | string // Duration (minutes or "MM:SS")
  slug: string           // Episode URL slug (e.g., "episodes/001-title")
  description?: string   // Optional brief description
  thumbnail: string      // Thumbnail image URL/path
  audioUrl?: string      // Optional audio file URL
  guestNames?: string    // Optional comma-separated guest names
}
```

## Behavior Contract

### Filtering Rules (Applied in Order)
1. **Episode Files Only**: Include only files where `slug` starts with "episodes/"
2. **Published Only**: Exclude files where `frontmatter.draft === true`
3. **Required Fields**: Include only files with ALL of:
   - `frontmatter.title` (string)
   - `frontmatter.date` (string)
   - `frontmatter.episodeNumber` (defined, any value)
   - `frontmatter.thumbnail` (string)
   - `frontmatter.duration` (defined, any value)
4. **Optional Fields** (NOT filtered):
   - `frontmatter.audioUrl` (may be undefined)
   - `frontmatter.description` (may be undefined)
   - `frontmatter.guests` (may be undefined or empty array)

### Sorting Rule
- Sort by `frontmatter.date` in **descending** order (newest first)
- Date parsed as `new Date(frontmatter.date)`
- Invalid dates sorted to end (by JavaScript Date behavior)

### Limiting Rule
- After filtering and sorting, return first `limit` episodes
- If fewer than `limit` episodes available, return all available
- If no episodes match criteria, return empty array `[]`

### Transformation Rules
- `guestNames`: If `frontmatter.guests` array exists, join names with ", "
- `guestNames`: If no guests or empty array, set to `undefined`
- `slug`: Preserve original file slug unchanged
- `description`: Copy from frontmatter if present, else `undefined`
- `audioUrl`: Copy from frontmatter if present, else `undefined`

## Edge Cases

### Empty Input
- **Input**: `allFiles = []`
- **Output**: `[]`

### No Episodes Match Criteria
- **Input**: Files exist but none have "episodes/" slug prefix
- **Output**: `[]`

### All Episodes Are Drafts
- **Input**: 10 episode files, all with `draft: true`
- **Output**: `[]`

### Fewer Than Limit Episodes
- **Input**: 3 episodes exist, `limit = 5`
- **Output**: Array with 3 episodes

### Episodes Missing Optional Fields
- **Input**: Episode without `audioUrl` or `description`
- **Output**: Episode included in results with those fields set to `undefined`

### Episodes With Invalid Dates
- **Input**: Episode with `date: "invalid"`
- **Output**: Episode included but sorted unpredictably (per JS Date behavior)

### Limit = 0
- **Input**: `limit = 0`
- **Output**: `[]`

### Limit > Available Episodes
- **Input**: 3 episodes, `limit = 100`
- **Output**: Array with 3 episodes

## Error Handling

### Invalid Input Types
- **If `allFiles` is not an array**: Throws TypeError (JavaScript default)
- **If `limit` is not a number**: Behavior undefined (caller responsibility)

### Malformed Episode Data
- **Missing required fields**: Episode filtered out (not included)
- **Wrong field types**: Episode may fail validation, filtered out
- **Null/undefined frontmatter**: Episode filtered out

## Performance Expectations
- **Time Complexity**: O(n log n) where n = number of episode files
  - Filter: O(n)
  - Sort: O(n log n)
  - Slice: O(1)
  - Map: O(n)
- **Space Complexity**: O(n) for intermediate arrays
- **Expected Load**: 100s of episodes, completes in milliseconds

## Testing Requirements

### Unit Tests Required
1. ✅ Returns empty array when no files provided
2. ✅ Returns empty array when no episodes match "episodes/" prefix
3. ✅ Filters out draft episodes
4. ✅ Filters out episodes missing required fields
5. ✅ Includes episodes missing optional fields (audioUrl, description)
6. ✅ Sorts episodes by date descending
7. ✅ Limits results to specified limit
8. ✅ Returns all episodes when fewer than limit available
9. ✅ Transforms guest array to comma-separated string
10. ✅ Returns undefined guestNames when no guests

### Test Fixtures Needed
- Episode with all fields (including optional)
- Episode without audioUrl and description
- Episode without guests
- Episode with draft: true
- Episode with missing required field (title)
- Non-episode file (different slug prefix)
- Multiple episodes with different dates

## Dependencies
- `QuartzPluginData` from `quartz/plugins/vfile`
- `EpisodeCard`, `EpisodeFrontmatter`, `Guest` from `quartz/components/types/landingPage`

## Related Contracts
- `buildNavLinks.contract.md` - Navigation generation
- `EpisodeCard.component.contract.md` - Display contract
