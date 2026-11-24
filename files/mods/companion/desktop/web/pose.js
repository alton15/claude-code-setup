// How each mood looks: VRM expression weights plus head and body offsets.
// Expression names are VRM 1.0 presets; three-vrm maps VRM 0.x ones onto them.

export const MOODS = {
  idle: { expr: { relaxed: 0.25 }, tilt: 0, nod: 0, sway: 1, gaze: 0 },
  curious: { expr: { surprised: 0.45 }, tilt: 0.22, nod: -0.06, sway: 1, gaze: 0 },
  thinking: { expr: { relaxed: 0.15 }, tilt: -0.14, nod: -0.1, sway: 0.7, gaze: 0.35 },
  working: { expr: {}, tilt: 0, nod: 0.1, sway: 1.8, gaze: -0.2, typing: true },
  happy: { expr: { happy: 1 }, tilt: 0.1, nod: 0, sway: 2, gaze: 0.05, hop: true },
  error: { expr: { sad: 0.85 }, tilt: -0.06, nod: 0.2, sway: 0.5, gaze: -0.1 },
  sleepy: { expr: { relaxed: 0.5, blink: 0.65 }, tilt: 0.18, nod: 0.32, sway: 0.4, gaze: -0.2 },
}

const EXPRESSIONS = ['happy', 'sad', 'relaxed', 'surprised', 'blink', 'aa']
const ARM_DOWN = 1.2
const BLINK_EVERY_S = [2.5, 5.5]
const BLINK_LENGTH_S = 0.14

const approach = (from, to, rate) => from + (to - from) * rate

/** Smoothed animation state; `step` returns the next state, never edits the old one. */
export function initialPose() {
  return {
    weights: Object.fromEntries(EXPRESSIONS.map(name => [name, 0])),
    tilt: 0,
    nod: 0,
    yaw: 0,
    pitch: 0,
    nextBlinkAt: 2,
  }
}

export function step(pose, { mood, yaw, pitch, talkingUntil, t, dt }) {
  const look = MOODS[mood] ?? MOODS.idle
  const rate = Math.min(1, dt * 6)

  const blinkPhase = t - pose.nextBlinkAt
  const isBlinking = blinkPhase >= 0 && blinkPhase < BLINK_LENGTH_S && mood !== 'happy'
  const nextBlinkAt =
    blinkPhase >= BLINK_LENGTH_S
      ? t + BLINK_EVERY_S[0] + Math.random() * (BLINK_EVERY_S[1] - BLINK_EVERY_S[0])
      : pose.nextBlinkAt
  const mouth = t < talkingUntil ? Math.abs(Math.sin(t * 13)) * 0.55 : 0

  const target = name => {
    if (name === 'blink') return Math.max(look.expr.blink ?? 0, isBlinking ? 1 : 0)
    if (name === 'aa') return mouth
    return look.expr[name] ?? 0
  }
  const weights = Object.fromEntries(
    EXPRESSIONS.map(name => [name, name === 'blink' || name === 'aa' ? target(name) : approach(pose.weights[name], target(name), rate)]),
  )

  return {
    weights,
    tilt: approach(pose.tilt, look.tilt, rate),
    nod: approach(pose.nod, look.nod, rate),
    yaw: approach(pose.yaw, yaw, Math.min(1, dt * 8)),
    pitch: approach(pose.pitch, pitch + look.gaze, Math.min(1, dt * 8)),
    nextBlinkAt,
  }
}

/** Writes a pose onto the model's normalized bones and expressions. */
export function apply(vrm, pose, { mood, t, restHipsY }) {
  const look = MOODS[mood] ?? MOODS.idle
  const bone = name => vrm.humanoid.getNormalizedBoneNode(name)
  const breath = Math.sin(t * 1.6)

  for (const [name, weight] of Object.entries(pose.weights)) {
    vrm.expressionManager?.setValue(name, weight)
  }

  const set = (name, x, y, z) => {
    const node = bone(name)
    if (node) node.rotation.set(x, y, z)
  }
  const typing = look.typing ? Math.sin(t * 14) * 0.08 : 0
  set('leftUpperArm', 0, 0, -ARM_DOWN + breath * 0.02 + (look.typing ? 0.25 : 0))
  set('rightUpperArm', 0, 0, ARM_DOWN - breath * 0.02 - (look.typing ? 0.25 : 0))
  // Around the bone's Y the forearm swings forward (+Z, toward the viewer).
  set('leftLowerArm', 0, look.typing ? -1.2 - typing : -0.15, 0)
  set('rightLowerArm', 0, look.typing ? 1.2 + typing : 0.15, 0)
  set('spine', breath * 0.015, pose.yaw * 0.15, Math.sin(t * 0.9 * look.sway) * 0.012 * look.sway)
  const nodBeat = look.typing ? Math.sin(t * 7) * 0.03 : 0
  set('neck', -pose.pitch * 0.25 + pose.nod * 0.5, pose.yaw * 0.3, pose.tilt * 0.4)
  set('head', -pose.pitch * 0.25 + pose.nod * 0.5 + nodBeat, pose.yaw * 0.35, pose.tilt * 0.6)

  const hips = bone('hips')
  if (hips) hips.position.y = restHipsY + (look.hop ? Math.abs(Math.sin(t * 6)) * 0.035 : 0)
}
