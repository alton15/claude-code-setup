import type { EngineInterface } from 'claude-code'

import type { ActiveTool, Companion, Mood, Usage } from '../types'
import { MOODS } from './reactions'

type Dollar = EngineInterface

const HOME_DIR = '.claude/companion'

export type Paths = {
  root: string
  assets: string
  stateFile: string
  /** The usage endpoint's reading every session shares (see shared.ts). */
  usageFile: string
  app: string
}

export async function paths($: Dollar): Promise<Paths> {
  const home = await $.env.get('HOME')
  if (home === undefined) {
    throw new Error('companion: HOME is not set, cannot locate assets')
  }
  const root = `${home}/${HOME_DIR}`
  return {
    root,
    assets: `${root}/assets`,
    stateFile: `${root}/state.json`,
    usageFile: `${root}/usage.json`,
    app: `${root}/Companion.app`,
  }
}

export type AssetIndex = Readonly<Record<Mood, readonly string[]>>

const EMPTY_INDEX: AssetIndex = {
  idle: [],
  curious: [],
  thinking: [],
  working: [],
  happy: [],
  error: [],
  sleepy: [],
}

async function listPngs($: Dollar, dir: string): Promise<string[]> {
  const entries = await $.fs.list(dir).catch(() => [])
  return entries
    .filter(entry => entry.kind === 'file' && entry.name.toLowerCase().endsWith('.png'))
    .map(entry => `${dir}/${entry.name}`)
    .sort()
}

export async function indexAssets($: Dollar, assetsDir: string): Promise<AssetIndex> {
  const lists = await Promise.all(MOODS.map(mood => listPngs($, `${assetsDir}/${mood}`)))
  return MOODS.reduce<AssetIndex>(
    (index, mood, i) => ({ ...index, [mood]: lists[i] }),
    EMPTY_INDEX,
  )
}

/** Images for a mood, falling back to idle's when that mood has none yet. */
export function imagesFor(index: AssetIndex, mood: Mood): readonly string[] {
  return index[mood].length > 0 ? index[mood] : index.idle
}

export type DesktopState = {
  mood: Mood
  line: string
  file: string
  at: number
  activeTool?: string
  contextPercent?: number
  fiveHourPercent?: number
  costUsd?: number
}

export function desktopState(
  current: Companion,
  tools: readonly ActiveTool[],
  measured: Usage | null,
): DesktopState {
  const last = tools[tools.length - 1]
  const fiveHour = measured?.limits.find(limit => limit.kind === 'five_hour')
  return {
    mood: current.mood,
    line: current.line,
    file: current.file,
    at: current.at,
    activeTool: last === undefined ? undefined : `${last.tool} ${last.label}`.trim(),
    contextPercent: measured?.contextPercent,
    fiveHourPercent: fiveHour?.percentUsed,
    costUsd: measured?.costUsd,
  }
}

/** Starts the desktop mascot app if it was built; `open -g` reuses a running one. */
export async function launchDesktop($: Dollar, appPath: string): Promise<boolean> {
  try {
    if (!(await $.fs.exists(appPath))) return false
    const { exitCode, stderr } = await $.process.run(['open', '-g', appPath])
    if (exitCode !== 0) {
      $.ui.log(`companion: could not open ${appPath}: ${stderr}`, { to: 'debug' })
      return false
    }
    return true
  } catch (error) {
    $.ui.log(`companion: desktop launch failed: ${String(error)}`, { to: 'debug' })
    return false
  }
}

/** Quits the desktop app by its binary's full path, so no other "Companion" process is hit. */
export async function quitDesktop($: Dollar, appPath: string): Promise<void> {
  const { exitCode, stderr } = await $.process.run(['pkill', '-f', `${appPath}/Contents/MacOS/Companion`])
  // pkill exits 1 when nothing matched: the app was not running, which is fine.
  if (exitCode > 1) $.ui.log(`companion: could not quit the desktop app: ${stderr}`, { to: 'debug' })
}
