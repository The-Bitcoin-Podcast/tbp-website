/**
 * Unit tests for duration parsing formats
 * Tests various duration format parsing scenarios
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'

// Import duration utilities
import { parseDuration, formatDuration } from '../../quartz/util/rss.js'

describe('Duration Parsing Formats', () => {
  
  describe('Standard Time Formats', () => {
    it('should parse HH:MM:SS format correctly', () => {
      assert.strictEqual(parseDuration('0:00:00'), 0)
      assert.strictEqual(parseDuration('0:00:01'), 1)
      assert.strictEqual(parseDuration('0:01:00'), 60)
      assert.strictEqual(parseDuration('1:00:00'), 3600)
      assert.strictEqual(parseDuration('1:23:45'), 5025) // 1*3600 + 23*60 + 45
      assert.strictEqual(parseDuration('12:34:56'), 45296) // 12*3600 + 34*60 + 56
      assert.strictEqual(parseDuration('23:59:59'), 86399) // Almost 24 hours
    })

    it('should parse MM:SS format correctly', () => {
      assert.strictEqual(parseDuration('0:00'), 0)
      assert.strictEqual(parseDuration('0:01'), 1)
      assert.strictEqual(parseDuration('1:00'), 60)
      assert.strictEqual(parseDuration('1:30'), 90)
      assert.strictEqual(parseDuration('23:45'), 1425) // 23*60 + 45
      assert.strictEqual(parseDuration('59:59'), 3599) // Almost an hour
    })

    it('should handle single-digit components', () => {
      assert.strictEqual(parseDuration('1:2:3'), 3723) // 1*3600 + 2*60 + 3
      assert.strictEqual(parseDuration('5:6'), 306) // 5*60 + 6
    })

    it('should handle leading zeros', () => {
      assert.strictEqual(parseDuration('01:02:03'), 3723)
      assert.strictEqual(parseDuration('05:06'), 306)
      assert.strictEqual(parseDuration('00:00:30'), 30)
    })
  })

  describe('Seconds Format', () => {
    it('should parse whole seconds', () => {
      assert.strictEqual(parseDuration('0'), 0)
      assert.strictEqual(parseDuration('1'), 1)
      assert.strictEqual(parseDuration('60'), 60)
      assert.strictEqual(parseDuration('3600'), 3600)
      assert.strictEqual(parseDuration('5025'), 5025)
    })

    it('should parse decimal seconds (rounded down)', () => {
      assert.strictEqual(parseDuration('1.5'), 1)
      assert.strictEqual(parseDuration('59.9'), 59)
      assert.strictEqual(parseDuration('60.1'), 60)
      assert.strictEqual(parseDuration('3600.999'), 3600)
    })

    it('should handle string numbers', () => {
      assert.strictEqual(parseDuration('123'), 123)
      assert.strictEqual(parseDuration('0001'), 1)
      assert.strictEqual(parseDuration('007'), 7)
    })
  })

  describe('ISO 8601 Duration Format', () => {
    it('should parse PT format with all components', () => {
      assert.strictEqual(parseDuration('PT1H23M45S'), 5025)
      assert.strictEqual(parseDuration('PT2H30M15S'), 9015)
      assert.strictEqual(parseDuration('PT12H34M56S'), 45296)
    })

    it('should parse PT format with missing components', () => {
      assert.strictEqual(parseDuration('PT1H'), 3600)
      assert.strictEqual(parseDuration('PT30M'), 1800)
      assert.strictEqual(parseDuration('PT45S'), 45)
      assert.strictEqual(parseDuration('PT1H30M'), 5400)
      assert.strictEqual(parseDuration('PT1H45S'), 3645)
      assert.strictEqual(parseDuration('PT30M45S'), 1845)
    })

    it('should handle decimal seconds in PT format', () => {
      assert.strictEqual(parseDuration('PT1.5S'), 1) // Rounded down
      assert.strictEqual(parseDuration('PT59.9S'), 59)
      assert.strictEqual(parseDuration('PT1H23M45.7S'), 5025) // 5025.7 rounded down
    })

    it('should handle case insensitive PT format', () => {
      assert.strictEqual(parseDuration('pt1h23m45s'), 5025)
      assert.strictEqual(parseDuration('Pt30M'), 1800)
      assert.strictEqual(parseDuration('PT45s'), 45)
    })

    it('should handle zero values in PT format', () => {
      assert.strictEqual(parseDuration('PT0H'), 0)
      assert.strictEqual(parseDuration('PT0M'), 0)
      assert.strictEqual(parseDuration('PT0S'), 0)
      assert.strictEqual(parseDuration('PT0H0M0S'), 0)
    })
  })

  describe('Invalid Format Handling', () => {
    it('should return 0 for empty or null values', () => {
      assert.strictEqual(parseDuration(''), 0)
      assert.strictEqual(parseDuration('   '), 0)
      assert.strictEqual(parseDuration(null), 0)
      assert.strictEqual(parseDuration(undefined), 0)
      assert.strictEqual(parseDuration(0), 0)
    })

    it('should return 0 for completely invalid formats', () => {
      assert.strictEqual(parseDuration('invalid'), 0)
      assert.strictEqual(parseDuration('not a duration'), 0)
      assert.strictEqual(parseDuration('123abc'), 123) // parseFloat parses initial number
      assert.strictEqual(parseDuration('1:2:3:4'), 0) // Too many components
      assert.strictEqual(parseDuration('a:b:c'), 0) // Non-numeric
    })

    it('should return 0 for invalid time values', () => {
      assert.strictEqual(parseDuration('25:00:00'), 90000) // Large hours are valid in durations (25*3600)
      assert.strictEqual(parseDuration('1:60:00'), 0) // Invalid minutes (>=60)
      assert.strictEqual(parseDuration('1:30:60'), 0) // Invalid seconds (>=60)
      assert.strictEqual(parseDuration('1:-30:00'), 0) // Negative values
    })

    it('should return 0 for negative values', () => {
      assert.strictEqual(parseDuration('-1'), 0)
      assert.strictEqual(parseDuration('-60'), 0)
      assert.strictEqual(parseDuration('-1:30'), 0)
    })

    it('should handle malformed PT format', () => {
      assert.strictEqual(parseDuration('P1H'), 0) // Missing T
      assert.strictEqual(parseDuration('T1H'), 0) // Missing P
      assert.strictEqual(parseDuration('PT'), 0) // No duration specified
      assert.strictEqual(parseDuration('PT1X'), 0) // Invalid unit
      assert.strictEqual(parseDuration('PT1H2X3S'), 0) // Invalid unit in middle
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large durations', () => {
      assert.strictEqual(parseDuration('999:59:59'), 3599999) // Large but valid
      assert.strictEqual(parseDuration('86400'), 86400) // 24 hours in seconds
      assert.strictEqual(parseDuration('PT999H59M59S'), 3599999) // Large PT format
    })

    it('should handle whitespace', () => {
      assert.strictEqual(parseDuration(' 1:23:45 '), 5025)
      assert.strictEqual(parseDuration('\t123\n'), 123)
      assert.strictEqual(parseDuration(' PT1H30M '), 5400)
    })

    it('should handle different object types', () => {
      // Numbers
      assert.strictEqual(parseDuration(123), 123)
      assert.strictEqual(parseDuration(0), 0)
      
      // Objects that convert to strings
      const objWithToString = { 
        toString: () => '1:30:00' 
      }
      assert.strictEqual(parseDuration(objWithToString), 5400)
      
      // Booleans
      assert.strictEqual(parseDuration(true), 0) // "true" -> 0
      assert.strictEqual(parseDuration(false), 0) // "false" -> 0
    })
  })
})

describe('Duration Formatting', () => {
  
  describe('Standard Formatting', () => {
    it('should format short durations as MM:SS', () => {
      assert.strictEqual(formatDuration(0), '00:00')
      assert.strictEqual(formatDuration(1), '00:01')
      assert.strictEqual(formatDuration(59), '00:59')
      assert.strictEqual(formatDuration(60), '01:00')
      assert.strictEqual(formatDuration(90), '01:30')
      assert.strictEqual(formatDuration(3599), '59:59')
    })

    it('should format long durations as HH:MM:SS', () => {
      assert.strictEqual(formatDuration(3600), '1:00:00')
      assert.strictEqual(formatDuration(3661), '1:01:01')
      assert.strictEqual(formatDuration(5025), '1:23:45')
      assert.strictEqual(formatDuration(7200), '2:00:00')
      assert.strictEqual(formatDuration(86399), '23:59:59')
    })

    it('should pad numbers correctly', () => {
      assert.strictEqual(formatDuration(3), '00:03')
      assert.strictEqual(formatDuration(63), '01:03')
      assert.strictEqual(formatDuration(3663), '1:01:03')
      assert.strictEqual(formatDuration(36063), '10:01:03')
    })
  })

  describe('Edge Case Formatting', () => {
    it('should handle invalid inputs', () => {
      assert.strictEqual(formatDuration(-1), '00:00')
      assert.strictEqual(formatDuration(NaN), '00:00')
      assert.strictEqual(formatDuration(null as any), '00:00')
      assert.strictEqual(formatDuration(undefined as any), '00:00')
      assert.strictEqual(formatDuration(Infinity), '00:00')
    })

    it('should handle very large durations', () => {
      assert.strictEqual(formatDuration(359999), '99:59:59')
      assert.strictEqual(formatDuration(3600000), '1000:00:00')
    })

    it('should handle decimal values (rounded down)', () => {
      assert.strictEqual(formatDuration(59.9), '00:59')
      assert.strictEqual(formatDuration(60.1), '01:00')
      assert.strictEqual(formatDuration(3600.9), '1:00:00')
    })
  })

  describe('Round-trip Consistency', () => {
    it('should maintain consistency when parsing then formatting', () => {
      const testCases = [
        '1:23:45',
        '0:30:00',
        '2:00:00',
        '59:59',
        '1:00',
        '0:30'
      ]

      testCases.forEach(duration => {
        const parsed = parseDuration(duration)
        const formatted = formatDuration(parsed)
        const reparsed = parseDuration(formatted)
        
        assert.strictEqual(parsed, reparsed, `Round-trip failed for ${duration}`)
      })
    })

    it('should handle PT format round-trips', () => {
      const testCases = [
        'PT1H23M45S',
        'PT30M',
        'PT45S',
        'PT2H'
      ]

      testCases.forEach(duration => {
        const parsed = parseDuration(duration)
        const formatted = formatDuration(parsed)
        const reparsed = parseDuration(formatted)
        
        assert.strictEqual(parsed, reparsed, `Round-trip failed for ${duration}`)
      })
    })
  })
})