import type { EngineInterface } from 'claude-code'

// The usage endpoint is rate limited per account, so every session on this
// machine shares one reading through a file: a session fetches only when the
// file's reading is stale, and a 429 makes all of them wait out one backoff.
// The file is written whole each time; a torn read parses as no file, which
// costs at most one extra fetch.

type Dollar = EngineInterface

const VERSION = 1
/** How long a good read by any session serves every session. */
export const FRESH_MS = 5 * 60_000
/** Least time between two attempts by any session, so sessions that find the reading stale together fetch once. */
export const ATTEMPT_GAP_MS = 2 * 60_000
/** The wait after the first 429 in a row; each one after it doubles the wait, up to BACKOFF_MAX_MS. */
export const BACKOFF_BASE_MS = 10 * 60_000
export const BACKOFF_MAX_MS = 30 * 60_000

/** What the shared file holds: the last good body and when any session may try again. */
export type Shared = {
  v: typeof VERSION
  /** The endpoint's body from the last good read; absent before one. */
  body?: unknown
  /** When that read was made, 0 before one. */
  fetchedAt: number
  /** When any session last asked the endpoint. */
  attemptAt: number
  /** Why the last attempt failed; absent when it succeeded. */
  error?: string
  /** 429s in a row; 0 after any other answer. */
  rateLimited: number
  /** No session asks again before this, forced or not. */
  retryAt?: number
}

export type Failure = { error: string; isRateLimited: boolean; retryAfterMs?: number }

export type Plan = 'fetch' | 'wait'

export function planRead(shared: Shared | undefined, now: number, isForced: boolean): Plan {
  if (shared?.retryAt !== undefined && now < shared.retryAt) return 'wait'
  if (isForced || shared === undefined) return 'fetch'
  if (now - shared.fetchedAt < FRESH_MS) return 'wait'
  if (now - shared.attemptAt < ATTEMPT_GAP_MS) return 'wait'
  return 'fetch'
}

/** The file as written just before a fetch, so other sessions see the attempt. */
export function claim(shared: Shared | undefined, now: number): Shared {
  return shared === undefined
    ? { v: VERSION, fetchedAt: 0, attemptAt: now, rateLimited: 0 }
    : { ...shared, attemptAt: now }
}

export function afterSuccess(body: unknown, now: number): Shared {
  return { v: VERSION, body, fetchedAt: now, attemptAt: now, rateLimited: 0 }
}

export function backoffMs(rateLimited: number): number {
  return Math.min(BACKOFF_BASE_MS * 2 ** Math.max(0, rateLimited - 1), BACKOFF_MAX_MS)
}

/** Keeps the last good body; a 429 sets the backoff, the server's Retry-After when that is longer. */
export function afterFailure(prev: Shared, now: number, failure: Failure): Shared {
  const { retryAt: _dropped, ...kept } = prev
  if (!failure.isRateLimited) return { ...kept, attemptAt: now, error: failure.error, rateLimited: 0 }
  const rateLimited = prev.rateLimited + 1
  const wait = Math.max(backoffMs(rateLimited), failure.retryAfterMs ?? 0)
  return { ...kept, attemptAt: now, error: failure.error, rateLimited, retryAt: now + wait }
}

/** A Retry-After header in seconds or as an HTTP date; undefined when absent, zero or unreadable. */
export function retryAfterMs(header: string | undefined, now: number): number | undefined {
  if (header === undefined) return undefined
  const text = header.trim()
  const ms = /^\d+$/.test(text) ? Number(text) * 1000 : Date.parse(text) - now
  return Number.isFinite(ms) && ms > 0 ? ms : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** The file's text as a Shared, or undefined for anything another version or a torn write left. */
export function parseShared(text: string): Shared | undefined {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return undefined
  }
  if (!isRecord(value) || value.v !== VERSION) return undefined
  const { body, fetchedAt, attemptAt, error, rateLimited, retryAt } = value
  if (!isTime(fetchedAt) || !isTime(attemptAt) || !isTime(rateLimited)) return undefined
  if (retryAt !== undefined && !isTime(retryAt)) return undefined
  if (error !== undefined && typeof error !== 'string') return undefined
  return {
    v: VERSION,
    ...(body === undefined ? {} : { body }),
    fetchedAt,
    attemptAt,
    ...(error === undefined ? {} : { error }),
    rateLimited,
    ...(retryAt === undefined ? {} : { retryAt }),
  }
}

export async function readShared($: Dollar, path: string): Promise<Shared | undefined> {
  if (!(await $.fs.exists(path))) return undefined
  try {
    const shared = parseShared(await $.fs.read(path))
    if (shared === undefined) $.ui.log(`companion: ${path} is not a usage reading; reading again`, { to: 'debug' })
    return shared
  } catch (error) {
    $.ui.log(`companion: shared usage read failed: ${String(error)}`, { to: 'debug' })
    return undefined
  }
}

export async function writeShared($: Dollar, path: string, shared: Shared): Promise<void> {
  await $.fs.write(path, JSON.stringify(shared)).catch((error: unknown) => {
    $.ui.log(`companion: shared usage write failed: ${String(error)}`, { to: 'debug' })
  })
}
