import type { Mood } from '../types'

export const MOODS: readonly Mood[] = [
  'idle',
  'curious',
  'thinking',
  'working',
  'happy',
  'error',
  'sleepy',
]

export type Reaction =
  | 'greet'
  | 'idle'
  | 'typing'
  | 'submit'
  | 'tool-read'
  | 'tool-edit'
  | 'tool-bash'
  | 'tool-web'
  | 'tool-agent'
  | 'tool-task'
  | 'tool-other'
  | 'tool-error'
  | 'done'
  | 'aborted'
  | 'failed'
  | 'sleepy'
  | 'context-high'
  | 'limit-high'

const MOOD_OF: Record<Reaction, Mood> = {
  greet: 'happy',
  idle: 'idle',
  typing: 'curious',
  submit: 'thinking',
  'tool-read': 'working',
  'tool-edit': 'working',
  'tool-bash': 'working',
  'tool-web': 'working',
  'tool-agent': 'working',
  'tool-task': 'thinking',
  'tool-other': 'working',
  'tool-error': 'error',
  done: 'happy',
  aborted: 'curious',
  failed: 'error',
  sleepy: 'sleepy',
  'context-high': 'error',
  'limit-high': 'error',
}

const LINES: Record<Reaction, readonly string[]> = {
  greet: ['안녕! 오늘도 같이 힘내자 ♪', '짜잔, 등장! 뭐 만들까?', '왔구나! 기다렸어~'],
  idle: ['♪~', '다음엔 뭐 할까?', '기다리는 중~'],
  typing: ['뭐 쓰는 거야? 궁금해…', '음? 뭔데뭔데?', '두근두근… 뭘 시킬까?', '어디 보자…?'],
  submit: ['알겠어! 생각해볼게', '좋아, 맡겨줘!', '흠흠… 어디 보자'],
  'tool-read': ['코드 읽는 중… 📖', '어디 보자…', '꼼꼼히 읽어볼게'],
  'tool-edit': ['고치는 중! ✏️', '여기를 이렇게…', '슥슥 수정 중'],
  'tool-bash': ['명령어 실행! ⚡', '터미널 두드리는 중', '돌려볼게!'],
  'tool-web': ['웹에서 찾아볼게 🌐', '인터넷 탐험 중!'],
  'tool-agent': ['친구들한테 부탁했어!', '서브에이전트 출동!'],
  'tool-task': ['할 일 정리 중 📝', '계획 세우는 중!'],
  'tool-other': ['작업 중…', '열심히 하는 중!'],
  'tool-error': ['앗, 에러났어…', '으앙 실패했어 ㅠ', '다시 해볼게…!'],
  done: ['끝났어! ✨', '다 했다! 칭찬해줘 ♪', '완료~!'],
  aborted: ['어? 멈췄네', '멈춤! 다음엔 뭐 할까?'],
  failed: ['으… 뭔가 잘못됐어', 'API가 화났나 봐 ㅠㅠ'],
  sleepy: ['zzz…', '졸려… 불러주면 일어날게', '쿨쿨…'],
  'context-high': ['컨텍스트가 꽉 차가… /compact 할까?'],
  'limit-high': ['사용량 한도에 거의 다 왔어! 조심!'],
}

export type Picked = { mood: Mood; line: string }

export function pick<T>(list: readonly T[], rand: () => number, avoid?: T): T {
  const pool = list.length > 1 ? list.filter(item => item !== avoid) : list
  const chosen = pool[Math.floor(rand() * pool.length) % pool.length]
  if (chosen === undefined) throw new Error('companion: pick() needs a non-empty list')
  return chosen
}

export function react(
  reaction: Reaction,
  rand: () => number = Math.random,
  previousLine?: string,
): Picked {
  return {
    mood: MOOD_OF[reaction],
    line: pick(LINES[reaction], rand, previousLine),
  }
}

const READ_TOOLS = new Set(['Read', 'Grep', 'Glob', 'LS', 'NotebookRead', 'ToolSearch'])
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const SHELL_TOOLS = new Set(['Bash', 'PowerShell', 'Monitor'])
const WEB_TOOLS = new Set(['WebFetch', 'WebSearch'])
const AGENT_TOOLS = new Set(['Agent', 'Task', 'Workflow', 'SendMessage'])
const TASK_TOOLS = new Set(['TaskCreate', 'TaskUpdate', 'TodoWrite', 'TaskList', 'TaskGet'])

export function reactionForTool(tool: string): Reaction {
  if (READ_TOOLS.has(tool)) return 'tool-read'
  if (EDIT_TOOLS.has(tool)) return 'tool-edit'
  if (SHELL_TOOLS.has(tool)) return 'tool-bash'
  if (WEB_TOOLS.has(tool) || tool.includes('firecrawl')) return 'tool-web'
  if (AGENT_TOOLS.has(tool)) return 'tool-agent'
  if (TASK_TOOLS.has(tool)) return 'tool-task'
  return 'tool-other'
}

/** Moods during which a turn is running: typing then is a queued message, not curiosity. */
export function isBusy(mood: Mood): boolean {
  return mood === 'thinking' || mood === 'working'
}

/** Moods that fall back to idle on their own after a short while. */
export function isTransient(mood: Mood): boolean {
  return mood === 'happy' || mood === 'error' || mood === 'curious'
}
