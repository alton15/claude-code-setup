import { atom, read, update } from 'claude-code'
import type { EngineInterface } from 'claude-code'

import type { AccountUsage, ActiveTool, Companion, ModelInfo, Task, Usage } from '../types'

// Every read and write of $.state goes through this file: the engine's scan
// lists a module's state only from atoms declared in the file that uses them.

type Dollar = EngineInterface

export const PANE = 'companion'

// Bump a shape tag when that value's fields change: a reload keeps what the
// previous version stored, and the tag makes the new code read it as initial.
const usage = atom({ plugin: 'companion', key: 'usage' } as const, null, {
  shape: 'usage-2',
})

const account = atom({ plugin: 'companion', key: 'account' } as const, null, {
  shape: 'account-1',
})

const model = atom({ plugin: 'companion', key: 'model' } as const, null, {
  shape: 'model-1',
})

/** CLAUDE_AUTOCOMPACT_PCT_OVERRIDE as a percent, null when unset or unreadable. */
const compactAt = atom({ plugin: 'companion', key: 'compactAt' } as const, null)

const tasks = atom({ plugin: 'companion', key: 'tasks' } as const, [], {
  shape: 'tasks-1',
})

const active = atom({ plugin: 'companion', key: 'active' } as const, [], {
  shape: 'active-1',
})

const companion = atom(
  { plugin: 'companion', key: 'companion' } as const,
  { mood: 'idle', line: '', file: '', at: 0 },
  { shape: 'companion-1' },
)

/** Clock reading the pane draws elapsed times against; ticks while tools run and on each poll. */
const now = atom({ plugin: 'companion', key: 'now' } as const, 0)

export type View = {
  companion: Companion
  usage: Usage | null
  account: AccountUsage | null
  model: ModelInfo | null
  compactAt: number | null
  active: readonly ActiveTool[]
  tasks: readonly Task[]
  now: number
}

/** Everything the pane draws; read while drawing, so each write redraws it. */
export async function readView($: Dollar): Promise<View> {
  const [c, u, acc, m, cut, a, t, n] = await Promise.all([
    read($, companion),
    read($, usage),
    read($, account),
    read($, model),
    read($, compactAt),
    read($, active),
    read($, tasks),
    read($, now),
  ])
  return { companion: c, usage: u, account: acc, model: m, compactAt: cut, active: a, tasks: t, now: n }
}

export function readCompanion($: Dollar): Promise<Companion> {
  return read($, companion)
}

export function readActive($: Dollar): Promise<readonly ActiveTool[]> {
  return read($, active)
}

export function readUsage($: Dollar): Promise<Usage | null> {
  return read($, usage)
}

export function readAccount($: Dollar): Promise<AccountUsage | null> {
  return read($, account)
}

export function readModel($: Dollar): Promise<ModelInfo | null> {
  return read($, model)
}

export function readCompactAt($: Dollar): Promise<number | null> {
  return read($, compactAt)
}

export function updateCompanion($: Dollar, change: (prev: Companion) => Companion) {
  return update($, companion, change)
}

export function updateActive($: Dollar, change: (prev: ActiveTool[]) => ActiveTool[]) {
  return update($, active, change)
}

export function updateTasks($: Dollar, change: (prev: Task[]) => Task[]) {
  return update($, tasks, change)
}

export function setUsage($: Dollar, value: Usage) {
  return update($, usage, () => value)
}

export function updateAccount($: Dollar, change: (prev: AccountUsage | null) => AccountUsage) {
  return update($, account, change)
}

export function setModel($: Dollar, value: ModelInfo) {
  return update($, model, prev =>
    prev !== null && prev.id === value.id && prev.effort === value.effort ? prev : value,
  )
}

export function setCompactAt($: Dollar, value: number | null) {
  return update($, compactAt, () => value)
}

export function setNow($: Dollar, at: number) {
  return update($, now, () => at)
}
