export type Mood =
  | 'idle'
  | 'curious'
  | 'thinking'
  | 'working'
  | 'happy'
  | 'error'
  | 'sleepy'

export type RateWindow = { kind: string; percentUsed: number; resetsAt?: string }

export type Usage = {
  contextPercent?: number
  contextTokens?: number
  contextWindow: number
  costUsd?: number
  /** When the session these figures count from began, in `$.clock.now()` ms. */
  startedAt?: number
  limits: RateWindow[]
}

/** A per-model weekly window the account's usage endpoint reports (Fable, Sonnet, Opus). */
export type ModelWindow = { label: string; percentUsed: number; resetsAt?: string }

/** Usage credits ("extra usage") spent this period; amounts in minor units (cents). */
export type ExtraUsage = {
  usedMinor: number
  limitMinor?: number
  percentUsed?: number
  currency: string
}

/** What the last read of `/api/oauth/usage` gave; windows kept from the last good read. */
export type AccountUsage = {
  windows: ModelWindow[]
  extra?: ExtraUsage
  fetchedAt: number
  /** Why the last read failed; absent when it succeeded. */
  error?: string
}

/** The main loop's model and effort as its last model request named them. */
export type ModelInfo = { id: string; effort?: string }

export type TaskStatus = 'pending' | 'in_progress' | 'completed'

export type Task = {
  id: string
  subject: string
  status: TaskStatus
  activeForm?: string
}

export type ActiveTool = {
  id: string
  tool: string
  label: string
  startedAt: number
  isSubagent: boolean
}

export type Companion = {
  mood: Mood
  line: string
  /** Absolute path of the PNG currently shown, '' when no asset exists. */
  file: string
  at: number
}

declare module 'claude-code' {
  interface PluginState {
    companion: {
      usage: Shaped<Usage | null>
      account: Shaped<AccountUsage | null>
      model: Shaped<ModelInfo | null>
      compactAt: number | null
      tasks: Shaped<Task[]>
      active: Shaped<ActiveTool[]>
      companion: Shaped<Companion>
      now: number
    }
  }
}
