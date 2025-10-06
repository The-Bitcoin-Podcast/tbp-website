import { google } from '@googleapis/youtube'
import type { youtube_v3 } from '@googleapis/youtube'

/**
 * Create authenticated YouTube Data API v3 client
 */
function createYouTubeClient(apiKey: string) {
  return google.youtube({
    version: 'v3',
    auth: apiKey,
  })
}

/**
 * Search for videos from a specific YouTube channel
 *
 * @param channelId - Channel ID or @username (e.g., "@thebtcpodcast")
 * @param options - Search options (maxResults, pageToken, publishedAfter)
 * @returns Search response with video list
 */
export async function searchChannelVideos(
  channelId: string,
  options: {
    apiKey: string
    maxResults?: number
    pageToken?: string
    publishedAfter?: string
  }
): Promise<youtube_v3.Schema$SearchListResponse> {
  const youtube = createYouTubeClient(options.apiKey)

  try {
    const response = await youtube.search.list({
      part: ['id', 'snippet'],
      channelId: channelId,
      type: ['video'],
      order: 'date',
      maxResults: options.maxResults || 25,
      pageToken: options.pageToken,
      publishedAfter: options.publishedAfter,
    })

    return response.data
  } catch (error: any) {
    // Handle specific error cases
    if (error.code === 403) {
      throw new Error('YouTube API quota exceeded. Try again later.')
    }
    if (error.code === 400) {
      throw new Error('Invalid YouTube API key. Check your YOUTUBE_API_KEY environment variable.')
    }
    throw error
  }
}

/**
 * Get detailed information for specific video IDs
 *
 * @param videoIds - Array of video IDs or comma-separated string
 * @param apiKey - YouTube Data API key
 * @returns Videos response with complete metadata
 */
export async function getVideoDetails(
  videoIds: string[] | string,
  apiKey: string
): Promise<youtube_v3.Schema$VideoListResponse> {
  const youtube = createYouTubeClient(apiKey)

  const ids = Array.isArray(videoIds) ? videoIds.join(',') : videoIds

  try {
    const response = await youtube.videos.list({
      part: ['snippet', 'contentDetails', 'status'],
      id: [ids],
    })

    return response.data
  } catch (error: any) {
    if (error.code === 403) {
      throw new Error('YouTube API quota exceeded. Try again later.')
    }
    if (error.code === 400) {
      throw new Error('Invalid YouTube API key or video IDs.')
    }
    throw error
  }
}

/**
 * Verify that a YouTube channel exists
 *
 * @param channelId - Channel ID or @username
 * @param apiKey - YouTube Data API key
 * @returns Channel response with channel details
 */
export async function verifyChannel(
  channelId: string,
  apiKey: string
): Promise<youtube_v3.Schema$ChannelListResponse> {
  const youtube = createYouTubeClient(apiKey)

  try {
    const response = await youtube.channels.list({
      part: ['snippet', 'contentDetails'],
      forUsername: channelId.startsWith('@') ? channelId.slice(1) : undefined,
      id: channelId.startsWith('@') ? undefined : [channelId],
    })

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error(`Channel not found: ${channelId}`)
    }

    return response.data
  } catch (error: any) {
    if (error.code === 403) {
      throw new Error('YouTube API quota exceeded. Try again later.')
    }
    if (error.code === 400) {
      throw new Error('Invalid YouTube API key or channel ID.')
    }
    throw error
  }
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Function to retry
 * @param delays - Array of delay times in milliseconds [60000, 300000, 900000]
 * @returns Result of function call
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  delays: number[] = [60000, 300000, 900000]
): Promise<T> {
  let lastError: Error | undefined

  for (let i = 0; i < delays.length + 1; i++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // Don't retry on invalid API key
      if (error.message?.includes('Invalid YouTube API key')) {
        throw error
      }

      // If this was the last attempt, throw
      if (i === delays.length) {
        throw error
      }

      // Wait before retry
      const delay = delays[i]
      console.log(`Retry ${i + 1}/${delays.length} after ${delay}ms...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Retry failed')
}
