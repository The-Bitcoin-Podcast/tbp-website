import { describe, it } from 'node:test'
import assert from 'node:assert'

/**
 * Guest Parser Contract Tests
 *
 * Tests validate that parseGuests() correctly extracts guest information
 * from YouTube video descriptions using pattern matching.
 *
 * Expected: All tests FAIL until guest-parser.ts is implemented
 */

describe('Guest Parser Contract', () => {
  it('should export parseGuests function', async () => {
    const { parseGuests } = await import('../../quartz/util/guest-parser.js')
    assert.strictEqual(typeof parseGuests, 'function')
  })

  it('should parse "Guest: Name" pattern', async () => {
    const { parseGuests } = await import('../../quartz/util/guest-parser.js')

    const description = 'Guest: Alice Johnson'
    const guests = parseGuests(description)

    assert.strictEqual(guests.length, 1)
    assert.strictEqual(guests[0].name, 'Alice Johnson')
  })

  it('should parse "Guests: Name1, Name2" pattern', async () => {
    const { parseGuests } = await import('../../quartz/util/guest-parser.js')

    const description = 'Guests: Alice Johnson, Bob Smith'
    const guests = parseGuests(description)

    assert.strictEqual(guests.length, 2)
    assert.strictEqual(guests[0].name, 'Alice Johnson')
    assert.strictEqual(guests[1].name, 'Bob Smith')
  })

  it('should parse "Featuring: Name" pattern', async () => {
    const { parseGuests } = await import('../../quartz/util/guest-parser.js')

    const description = 'Featuring: Charlie Davis'
    const guests = parseGuests(description)

    assert.strictEqual(guests.length, 1)
    assert.strictEqual(guests[0].name, 'Charlie Davis')
  })

  it('should parse "ft. Name" pattern', async () => {
    const { parseGuests } = await import('../../quartz/util/guest-parser.js')

    const description = 'ft. Diana Evans'
    const guests = parseGuests(description)

    assert.strictEqual(guests.length, 1)
    assert.strictEqual(guests[0].name, 'Diana Evans')
  })

  it('should parse "with @username" pattern and extract Twitter handle', async () => {
    const { parseGuests } = await import('../../quartz/util/guest-parser.js')

    const description = 'Interview with @alice'
    const guests = parseGuests(description)

    assert.strictEqual(guests.length, 1)
    assert.strictEqual(guests[0].name, 'alice')
    assert.strictEqual(guests[0].twitter, 'alice')
  })

  it('should parse "Interview with Name" pattern', async () => {
    const { parseGuests } = await import('../../quartz/util/guest-parser.js')

    const description = 'Interview with Frank Garcia'
    const guests = parseGuests(description)

    assert.strictEqual(guests.length, 1)
    assert.strictEqual(guests[0].name, 'Frank Garcia')
  })

  it('should parse multiple guests separated by commas', async () => {
    const { parseGuests } = await import('../../quartz/util/guest-parser.js')

    const description = 'Guests: Alice, Bob, Charlie'
    const guests = parseGuests(description)

    assert.strictEqual(guests.length, 3)
    assert.strictEqual(guests[0].name, 'Alice')
    assert.strictEqual(guests[1].name, 'Bob')
    assert.strictEqual(guests[2].name, 'Charlie')
  })

  it('should parse multiple guests separated by ampersands', async () => {
    const { parseGuests } = await import('../../quartz/util/guest-parser.js')

    const description = 'Featuring: Alice & Bob & Charlie'
    const guests = parseGuests(description)

    assert.strictEqual(guests.length, 3)
    assert.strictEqual(guests[0].name, 'Alice')
    assert.strictEqual(guests[1].name, 'Bob')
    assert.strictEqual(guests[2].name, 'Charlie')
  })

  it('should trim whitespace from guest names', async () => {
    const { parseGuests } = await import('../../quartz/util/guest-parser.js')

    const description = 'Guests:   Alice Johnson  ,  Bob Smith  '
    const guests = parseGuests(description)

    assert.strictEqual(guests[0].name, 'Alice Johnson')
    assert.strictEqual(guests[1].name, 'Bob Smith')
  })

  it('should handle case-insensitive matching', async () => {
    const { parseGuests } = await import('../../quartz/util/guest-parser.js')

    const description1 = 'GUEST: Alice Johnson'
    const description2 = 'guest: Bob Smith'

    const guests1 = parseGuests(description1)
    const guests2 = parseGuests(description2)

    assert.strictEqual(guests1[0].name, 'Alice Johnson')
    assert.strictEqual(guests2[0].name, 'Bob Smith')
  })

  it('should return empty array when no pattern matches', async () => {
    const { parseGuests } = await import('../../quartz/util/guest-parser.js')

    const description = 'Today we discuss Bitcoin and decentralization.'
    const guests = parseGuests(description)

    assert.strictEqual(guests.length, 0)
    assert.ok(Array.isArray(guests))
  })

  it('should filter out empty strings from guest list', async () => {
    const { parseGuests } = await import('../../quartz/util/guest-parser.js')

    const description = 'Guests: Alice,  , Bob'
    const guests = parseGuests(description)

    // Should not include empty string
    assert.strictEqual(guests.length, 2)
    assert.strictEqual(guests[0].name, 'Alice')
    assert.strictEqual(guests[1].name, 'Bob')
  })

  it('should use first matching pattern (priority order)', async () => {
    const { parseGuests } = await import('../../quartz/util/guest-parser.js')

    // If multiple patterns present, use first match
    const description = 'Guest: Alice\nFeaturing: Bob'
    const guests = parseGuests(description)

    // Should only match "Guest: Alice" (first pattern)
    assert.strictEqual(guests.length, 1)
    assert.strictEqual(guests[0].name, 'Alice')
  })

  it('should handle guests with titles/credentials', async () => {
    const { parseGuests } = await import('../../quartz/util/guest-parser.js')

    const description = 'Guest: Dr. Alice Johnson (CEO)'
    const guests = parseGuests(description)

    assert.strictEqual(guests.length, 1)
    assert.strictEqual(guests[0].name, 'Dr. Alice Johnson (CEO)')
  })

  it('should handle multiline descriptions', async () => {
    const { parseGuests } = await import('../../quartz/util/guest-parser.js')

    const description = `
Today's episode is special!
Guest: Alice Johnson
We discuss Bitcoin fundamentals.
`
    const guests = parseGuests(description)

    assert.strictEqual(guests.length, 1)
    assert.strictEqual(guests[0].name, 'Alice Johnson')
  })

  it('should extract Twitter handle without @ prefix', async () => {
    const { parseGuests } = await import('../../quartz/util/guest-parser.js')

    const description = 'with @alice123'
    const guests = parseGuests(description)

    assert.strictEqual(guests[0].twitter, 'alice123')
    // Twitter handle should not include @ in stored value
    assert.ok(!guests[0].twitter?.includes('@'))
  })
})
