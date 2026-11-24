import type { EngineInterface } from 'claude-code'

import type { AccountUsage, ExtraUsage, ModelWindow } from '../types'

// The engine's own rate-limit readings ($.session.usage) carry only the
// five-hour and weekly windows. The per-model weekly windows (Fable) and the
// usage credits come from the account's usage endpoint, the one /usage reads.
// The credential stays with the engine: the mod holds an opaque handle only.

type Dollar = EngineInterface

const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage'
const OAUTH_BETA = 'oauth-2025-04-20'

/** Older per-model windows the endpoint reports as top-level fields. */
const TOP_LEVEL_WINDOWS: ReadonlyArray<readonly [key: string, label: string]> = [
  ['seven_day_opus', 'Opus'],
  ['seven_day_sonnet', 'Sonnet'],
]

/** Failures that mean "not applicable here", not "broken": the pane stays quiet. */
export const QUIET_ERRORS: ReadonlySet<string> = new Set(['no-login', 'api-key'])

type Json = Record<string, unknown>

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** An ISO timestamp from an ISO string or epoch seconds. */
export function toIso(value: unknown): string | undefined {
  if (typeof value === 'string') return Number.isNaN(Date.parse(value)) ? undefined : value
  const seconds = finite(value)
  return seconds === undefined ? undefined : new Date(seconds * 1000).toISOString()
}

function tenth(percent: number): number {
  return Math.round(percent * 10) / 10
}

/** `limits[]` rows scoped to one model (`scope.model.display_name`), e.g. Fable. */
function scopedWindows(limits: unknown): ModelWindow[] {
  if (!Array.isArray(limits)) return []
  return limits.flatMap(row => {
    if (!isRecord(row)) return []
    const scope = isRecord(row.scope) ? row.scope : undefined
    const model = scope !== undefined && isRecord(scope.model) ? scope.model : undefined
    const label = typeof model?.display_name === 'string' ? model.display_name.trim() : ''
    const percent = finite(row.percent) ?? finite(row.utilization)
    if (label === '' || percent === undefined) return []
    return [{ label, percentUsed: tenth(percent), resetsAt: toIso(row.resets_at) }]
  })
}

function topLevelWindows(body: Json): ModelWindow[] {
  return TOP_LEVEL_WINDOWS.flatMap(([key, label]) => {
    const window = body[key]
    if (!isRecord(window)) return []
    const percent = finite(window.utilization)
    if (percent === undefined) return []
    return [{ label, percentUsed: tenth(percent), resetsAt: toIso(window.resets_at) }]
  })
}

function extraUsage(value: unknown): ExtraUsage | undefined {
  if (!isRecord(value) || value.is_enabled === false) return undefined
  const used = finite(value.used_credits)
  if (used === undefined) return undefined
  const currency =
    typeof value.currency === 'string' && /^[A-Za-z]{3}$/.test(value.currency)
      ? value.currency.toUpperCase()
      : 'USD'
  return {
    usedMinor: used,
    limitMinor: finite(value.monthly_limit),
    percentUsed: finite(value.utilization),
    currency,
  }
}

export type AccountReading = Pick<AccountUsage, 'windows' | 'extra'>

/** Reads the usage endpoint's body; throws on a body that is not an object. */
export function parseAccountUsage(body: unknown): AccountReading {
  if (!isRecord(body)) throw new Error('usage body is not an object')
  const scoped = scopedWindows(body.limits)
  const seen = new Set(scoped.map(window => window.label.toLowerCase()))
  const older = topLevelWindows(body).filter(window => !seen.has(window.label.toLowerCase()))
  return { windows: [...scoped, ...older], extra: extraUsage(body.extra_usage) }
}

const TOO_MANY_REQUESTS = 429

export type AccountAuth = { isOk: true; handle: string } | { isOk: false; error: string }

/** The subscription login's opaque handle; a QUIET_ERRORS error without one. */
export async function authorizeUsage($: Dollar): Promise<AccountAuth> {
  const auth = await $.session.authorize()
  if (auth === null) return { isOk: false, error: 'no-login' }
  if (auth.kind !== 'bearer') return { isOk: false, error: 'api-key' }
  return { isOk: true, handle: auth.handle }
}

export type AccountOutcome =
  | { isOk: true; reading: AccountReading; body: unknown }
  | { isOk: false; error: string; isRateLimited: boolean; retryAfter?: string }

export async function fetchAccountUsage($: Dollar, handle: string): Promise<AccountOutcome> {
  try {
    const response = await $.http.fetch(USAGE_URL, {
      auth: handle,
      headers: { 'anthropic-beta': OAUTH_BETA, 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      return {
        isOk: false,
        error: `HTTP ${response.status}`,
        isRateLimited: response.status === TOO_MANY_REQUESTS,
        retryAfter: response.headers['retry-after'],
      }
    }
    const body: unknown = JSON.parse(response.text)
    return { isOk: true, reading: parseAccountUsage(body), body }
  } catch (error) {
    return { isOk: false, error: error instanceof Error ? error.message : String(error), isRateLimited: false }
  }
}
