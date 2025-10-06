# YouTube Data API v3 Contract

**Service**: YouTube Data API v3
**Base URL**: `https://www.googleapis.com/youtube/v3`
**Authentication**: API Key (query parameter or header)

## Contract: Search Channel Videos

**Endpoint**: `GET /search`

**Purpose**: Retrieve list of video IDs from a specific channel

**Request**:
```typescript
interface SearchRequest {
  part: 'id,snippet'           // Required fields
  channelId: string            // Target channel (e.g., @thebtcpodcast)
  type: 'video'                // Only videos, not playlists/channels
  order: 'date'                // Sort by upload date
  maxResults: number           // 1-50, default 25
  pageToken?: string           // For pagination
  publishedAfter?: string      // ISO 8601 datetime filter
  key: string                  // API key
}
```

**Response** (Success - 200 OK):
```typescript
interface SearchResponse {
  kind: 'youtube#searchListResponse'
  etag: string
  nextPageToken?: string
  prevPageToken?: string
  pageInfo: {
    totalResults: number
    resultsPerPage: number
  }
  items: Array<{
    kind: 'youtube#searchResult'
    etag: string
    id: {
      kind: 'youtube#video'
      videoId: string          // Use this to fetch details
    }
    snippet: {
      publishedAt: string      // ISO 8601
      channelId: string
      title: string
      description: string      // May be truncated
      thumbnails: {
        default: { url: string, width: number, height: number }
        medium: { url: string, width: number, height: number }
        high: { url: string, width: number, height: number }
        standard?: { url: string, width: number, height: number }
        maxres?: { url: string, width: number, height: number }
      }
      channelTitle: string
    }
  }>
}
```

**Response** (Error - 4xx/5xx):
```typescript
interface ErrorResponse {
  error: {
    code: number               // HTTP status code
    message: string
    errors: Array<{
      domain: string
      reason: string           // e.g., "quotaExceeded", "keyInvalid"
      message: string
    }>
  }
}
```

**Quota Cost**: 100 units per request

---

## Contract: Get Video Details

**Endpoint**: `GET /videos`

**Purpose**: Fetch complete metadata for specific video IDs

**Request**:
```typescript
interface VideosRequest {
  part: 'snippet,contentDetails,status'  // Required parts
  id: string                   // Comma-separated video IDs (max 50)
  key: string                  // API key
}
```

**Response** (Success - 200 OK):
```typescript
interface VideosResponse {
  kind: 'youtube#videoListResponse'
  etag: string
  items: Array<{
    kind: 'youtube#video'
    etag: string
    id: string                 // Video ID
    snippet: {
      publishedAt: string      // ISO 8601
      channelId: string
      title: string            // Full title (max 100 chars)
      description: string      // Full description (max 5000 chars)
      thumbnails: {
        // Same structure as SearchResponse
        maxres?: { url: string, width: number, height: number }
      }
      channelTitle: string
      tags?: string[]          // May be undefined
      categoryId: string
      liveBroadcastContent: 'none' | 'upcoming' | 'live'
      defaultLanguage?: string
    }
    contentDetails: {
      duration: string         // ISO 8601 duration (e.g., "PT1H23M45S")
      dimension: '2d' | '3d'
      definition: 'sd' | 'hd'
      caption: 'true' | 'false'
      licensedContent: boolean
      projection: 'rectangular' | '360'
    }
    status: {
      uploadStatus: string
      privacyStatus: 'public' | 'unlisted' | 'private'
      license: 'youtube' | 'creativeCommon'
      embeddable: boolean
      publicStatsViewable: boolean
    }
  }>
}
```

**Response** (Error): Same as SearchResponse error format

**Quota Cost**: 1 unit per video (part=snippet,contentDetails,status)

---

## Contract: Get Channel Info

**Endpoint**: `GET /channels`

**Purpose**: Verify channel exists and get metadata

**Request**:
```typescript
interface ChannelsRequest {
  part: 'snippet,contentDetails'
  forUsername?: string         // Channel username (e.g., "thebtcpodcast")
  id?: string                  // Channel ID (alternative to forUsername)
  key: string
}
```

**Response** (Success - 200 OK):
```typescript
interface ChannelsResponse {
  kind: 'youtube#channelListResponse'
  etag: string
  items: Array<{
    kind: 'youtube#channel'
    etag: string
    id: string                 // Channel ID
    snippet: {
      title: string
      description: string
      customUrl?: string       // @thebtcpodcast
      publishedAt: string
      thumbnails: { /* ... */ }
    }
    contentDetails: {
      relatedPlaylists: {
        uploads: string        // Playlist ID of all uploads
      }
    }
  }>
}
```

**Quota Cost**: 1 unit

---

## Error Handling Contract

**Rate Limit Errors** (403 Forbidden):
```json
{
  "error": {
    "code": 403,
    "message": "The request cannot be completed because you have exceeded your quota.",
    "errors": [{
      "domain": "youtube.quota",
      "reason": "quotaExceeded"
    }]
  }
}
```

**Expected Behavior**:
- Retry with exponential backoff: 1min, 5min, 15min
- Log quota exceeded error
- Provide quota reset time if available

**Invalid API Key** (400 Bad Request):
```json
{
  "error": {
    "code": 400,
    "message": "API key not valid. Please pass a valid API key.",
    "errors": [{
      "domain": "usageLimits",
      "reason": "keyInvalid"
    }]
  }
}
```

**Expected Behavior**:
- Fail fast - no retry
- Log clear error message
- Exit with error code

**Network Errors** (ECONNREFUSED, ETIMEDOUT):
**Expected Behavior**:
- Retry with exponential backoff
- Max 3 retries
- Log network error details

---

## Sync Flow Contract

**Full Sync Flow**:
1. `GET /channels` (verify channel exists)
2. `GET /search` (fetch all video IDs, paginated)
3. `GET /videos` (fetch details for IDs in batches of 50)

**Incremental Sync Flow**:
1. Get last sync timestamp from git
2. `GET /search` with `publishedAfter={lastSyncTimestamp}`
3. `GET /videos` (fetch details for new video IDs)

**Quota Budget** (for 500 videos initial sync):
- Channel verification: 1 unit
- Search pagination (500 videos ÷ 50/page): 100 × 10 pages = 1,000 units
- Video details (500 videos): 500 units
- **Total**: ~1,500 units (well under 10,000 daily limit)

**Incremental Sync** (5 new videos):
- Search: 100 units
- Video details: 5 units
- **Total**: 105 units

---

## Contract Tests Location

Tests implementing these contracts:
- `/home/petty/Github/tbp/quartz/tests/contract/youtube-api.test.ts`

Each test validates:
- Request format matches contract
- Response parsing handles expected structure
- Error responses trigger correct behavior
- Quota tracking is accurate
