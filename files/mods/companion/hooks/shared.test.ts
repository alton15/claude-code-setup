import { expect, test } from 'claude-code/testing'

import { afterFailure, afterSuccess, claim, parseShared, planRead, retryAfterMs } from './shared'
import type { Shared } from './shared'

const NOW = Date.parse('2026-11-24T06:00:00.000Z')
const MINUTE = 60_000
const BODY = { limits: [] }

function reading(fetchedAt: number): Shared {
  return { v: 1, body: BODY, fetchedAt, attemptAt: fetchedAt, rateLimited: 0 }
}

const RATE_LIMITED = { error: 'HTTP 429', isRateLimited: true }

test('a reading any session made in the last five minutes is used as is', () => {
  expect(planRead(reading(NOW - 4 * MINUTE), NOW, false)).toBe('wait')
  expect(planRead(reading(NOW - 6 * MINUTE), NOW, false)).toBe('fetch')
  expect(planRead(undefined, NOW, false)).toBe('fetch')
})

test('an attempt by any session in the last two minutes holds the others back', () => {
  const tried = { ...reading(0), attemptAt: NOW - MINUTE }
  expect(planRead(tried, NOW, false)).toBe('wait')
  expect(planRead({ ...tried, attemptAt: NOW - 3 * MINUTE }, NOW, false)).toBe('fetch')
})

test('a forced read skips freshness but not a 429 backoff', () => {
  expect(planRead(reading(NOW - MINUTE), NOW, true)).toBe('fetch')
  const backingOff = { ...reading(NOW - MINUTE), retryAt: NOW + MINUTE }
  expect(planRead(backingOff, NOW, true)).toBe('wait')
  expect(planRead(backingOff, NOW + MINUTE, true)).toBe('fetch')
})

test('a claim records the attempt and keeps the last good reading', () => {
  const claimed = claim(reading(NOW - 10 * MINUTE), NOW)
  expect(claimed.attemptAt).toBe(NOW)
  expect(claimed.fetchedAt).toBe(NOW - 10 * MINUTE)
  expect(claimed.body).toEqual(BODY)
  expect(claim(undefined, NOW)).toEqual({ v: 1, fetchedAt: 0, attemptAt: NOW, rateLimited: 0 })
})

test('429s in a row back off 10, 20, then at most 30 minutes', () => {
  const first = afterFailure(claim(undefined, NOW), NOW, RATE_LIMITED)
  const second = afterFailure(first, NOW, RATE_LIMITED)
  const third = afterFailure(second, NOW, RATE_LIMITED)
  const fourth = afterFailure(third, NOW, RATE_LIMITED)
  expect([first, second, third, fourth].map(one => (one.retryAt ?? NOW) - NOW)).toEqual([
    10 * MINUTE,
    20 * MINUTE,
    30 * MINUTE,
    30 * MINUTE,
  ])
  expect(fourth.rateLimited).toBe(4)
  expect(fourth.error).toBe('HTTP 429')
})

test('a Retry-After longer than the backoff is kept', () => {
  const failed = afterFailure(claim(undefined, NOW), NOW, { ...RATE_LIMITED, retryAfterMs: 45 * MINUTE })
  expect(failed.retryAt).toBe(NOW + 45 * MINUTE)
})

test('Retry-After reads seconds or a date, and ignores zero', () => {
  expect(retryAfterMs('120', NOW)).toBe(2 * MINUTE)
  expect(retryAfterMs(new Date(NOW + 5 * MINUTE).toUTCString(), NOW)).toBe(5 * MINUTE)
  expect(retryAfterMs('0', NOW)).toBeUndefined()
  expect(retryAfterMs('soon', NOW)).toBeUndefined()
  expect(retryAfterMs(undefined, NOW)).toBeUndefined()
})

test('another failure keeps the last good reading and sets no backoff', () => {
  const backingOff = afterFailure(claim(reading(NOW - 10 * MINUTE), NOW), NOW, RATE_LIMITED)
  const failed = afterFailure(backingOff, NOW, { error: 'HTTP 500', isRateLimited: false })
  expect(failed.body).toEqual(BODY)
  expect(failed.fetchedAt).toBe(NOW - 10 * MINUTE)
  expect(failed.retryAt).toBeUndefined()
  expect(failed.rateLimited).toBe(0)
})

test('a good read clears the backoff', () => {
  const next = afterSuccess(BODY, NOW)
  expect(next).toEqual({ v: 1, body: BODY, fetchedAt: NOW, attemptAt: NOW, rateLimited: 0 })
})

test('a cache file that is not this version or shape is refused', () => {
  const valid = { ...reading(NOW), retryAt: NOW + MINUTE, error: 'HTTP 429' }
  expect(parseShared(JSON.stringify(valid))).toEqual(valid)
  expect(parseShared('{"v":1,"fetche')).toBeUndefined()
  expect(parseShared('[]')).toBeUndefined()
  expect(parseShared(JSON.stringify({ ...valid, v: 2 }))).toBeUndefined()
  expect(parseShared(JSON.stringify({ ...valid, fetchedAt: 'now' }))).toBeUndefined()
  expect(parseShared(JSON.stringify({ ...valid, retryAt: 'later' }))).toBeUndefined()
})
