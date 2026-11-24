// The desktop companion's 3D body: loads a VRM, animates it by mood and cursor, and
// streams a bust-shot PNG for the terminal pane when the app asks for one.
//
// The app drives it through `window.companion` and hears back on the `companion` message
// handler: { type: 'ready' | 'error' | 'frame' | 'click', ... }.

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'

import { apply, initialPose, step } from './pose.js'

const FOV = 22
const PANE_PX = 256
const PANE_SUPERSAMPLE = 2
const PANE_FRAME_S = 1 / 15
const PANE_HEADROOM = 0.04
const GAZE_DEPTH_PX = 520
const YAW_LIMIT = 0.9
const PITCH_LIMIT = 0.6

const post = message => window.webkit?.messageHandlers?.companion?.postMessage(message)
const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value))

const canvas = document.getElementById('stage')
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setClearColor(0x000000, 0)
renderer.outputColorSpace = THREE.SRGBColorSpace

const scene = new THREE.Scene()
const sun = new THREE.DirectionalLight(0xffffff, Math.PI)
sun.position.set(0.6, 1, 1.4).normalize()
scene.add(sun)
scene.add(new THREE.AmbientLight(0xffffff, 0.5))

const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 30)
const paneCamera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 30)
const gazeTarget = new THREE.Object3D()
scene.add(gazeTarget)

const paneTarget = new THREE.WebGLRenderTarget(PANE_PX * PANE_SUPERSAMPLE, PANE_PX * PANE_SUPERSAMPLE)
paneTarget.texture.colorSpace = THREE.SRGBColorSpace
const paneCanvas = document.createElement('canvas')
paneCanvas.width = PANE_PX
paneCanvas.height = PANE_PX
const paneContext = paneCanvas.getContext('2d')

let vrm
let restHipsY = 0
let pose = initialPose()
let input = { mood: 'idle', pointer: null, talkingUntil: 0, wantsPane: false, showsDesktop: true }
let lastPaneAt = -Infinity

function resize() {
  const width = window.innerWidth
  const height = window.innerHeight
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

/** Desktop: the whole figure. Pane: head and shoulders. */
function frameCameras() {
  vrm.scene.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(vrm.scene)
  const height = box.max.y - box.min.y
  const half = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  camera.position.set(0, box.min.y + height / 2, (height * 0.53) / half)
  camera.lookAt(0, box.min.y + height / 2, 0)

  // Where the head bone sits within the skull varies by model, so the bust
  // shot hangs from the top of the figure instead and cuts at the chest.
  const bust = height * 0.34
  const centreY = box.max.y + bust * PANE_HEADROOM - bust / 2
  paneCamera.position.set(0, centreY, bust / 2 / half)
  paneCamera.lookAt(0, centreY, 0)
}

/** Cursor offset from the head, as a turn of the head and eyes. */
function gaze() {
  if (vrm === undefined || input.pointer === null) return { yaw: 0, pitch: 0 }
  const head = new THREE.Vector3()
  vrm.humanoid.getNormalizedBoneNode('head').getWorldPosition(head)
  const onScreen = head.clone().project(camera)
  const headX = ((onScreen.x + 1) / 2) * window.innerWidth
  const headY = ((1 - onScreen.y) / 2) * window.innerHeight
  const yaw = Math.atan2(input.pointer.x - headX, GAZE_DEPTH_PX)
  const pitch = Math.atan2(headY - input.pointer.y, GAZE_DEPTH_PX)
  return { yaw: clamp(yaw, YAW_LIMIT), pitch: clamp(pitch, PITCH_LIMIT) }
}

function placeGazeTarget() {
  const head = new THREE.Vector3()
  vrm.humanoid.getNormalizedBoneNode('head').getWorldPosition(head)
  gazeTarget.position.set(
    head.x + Math.sin(pose.yaw) * 2,
    head.y + Math.sin(pose.pitch) * 2,
    head.z + Math.cos(pose.yaw) * 2,
  )
}

/** Renders the bust shot at 2x, averages it down, and hands the PNG over. */
function sendPaneFrame() {
  const size = PANE_PX * PANE_SUPERSAMPLE
  const pixels = new Uint8Array(size * size * 4)
  renderer.setRenderTarget(paneTarget)
  renderer.clear()
  renderer.render(scene, paneCamera)
  renderer.readRenderTargetPixels(paneTarget, 0, 0, size, size, pixels)
  renderer.setRenderTarget(null)

  const out = paneContext.createImageData(PANE_PX, PANE_PX)
  for (let y = 0; y < PANE_PX; y++) {
    for (let x = 0; x < PANE_PX; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let dy = 0; dy < PANE_SUPERSAMPLE; dy++) {
        for (let dx = 0; dx < PANE_SUPERSAMPLE; dx++) {
          // Render targets read bottom row first; the PNG wants the top first.
          const sy = size - 1 - (y * PANE_SUPERSAMPLE + dy)
          const i = (sy * size + x * PANE_SUPERSAMPLE + dx) * 4
          const alpha = pixels[i + 3]
          r += pixels[i] * alpha
          g += pixels[i + 1] * alpha
          b += pixels[i + 2] * alpha
          a += alpha
        }
      }
      const o = (y * PANE_PX + x) * 4
      out.data[o] = a === 0 ? 0 : r / a
      out.data[o + 1] = a === 0 ? 0 : g / a
      out.data[o + 2] = a === 0 ? 0 : b / a
      out.data[o + 3] = a / (PANE_SUPERSAMPLE * PANE_SUPERSAMPLE)
    }
  }
  paneContext.putImageData(out, 0, 0)
  post({ type: 'frame', png: paneCanvas.toDataURL('image/png').split(',')[1] })
}

const timer = new THREE.Timer()
function animate(timestamp) {
  requestAnimationFrame(animate)
  timer.update(timestamp)
  const dt = Math.min(timer.getDelta(), 0.1)
  const t = timer.getElapsed()
  // Hidden from the desktop with no pane to feed, there is nothing to draw.
  if (!input.showsDesktop && !input.wantsPane) return
  if (vrm !== undefined) {
    pose = step(pose, { ...gaze(), mood: input.mood, talkingUntil: input.talkingUntil, t, dt })
    apply(vrm, pose, { mood: input.mood, t, restHipsY })
    placeGazeTarget()
    vrm.update(dt)
  }
  if (input.showsDesktop) renderer.render(scene, camera)
  if (vrm !== undefined && input.wantsPane && t - lastPaneAt >= PANE_FRAME_S) {
    // Keep to the beat rather than restarting it from this display frame,
    // which would round every gap up to the next refresh.
    lastPaneAt = t - lastPaneAt > PANE_FRAME_S * 2 ? t : lastPaneAt + PANE_FRAME_S
    sendPaneFrame()
  }
}

function load(url) {
  const loader = new GLTFLoader()
  loader.register(parser => new VRMLoaderPlugin(parser))
  loader.load(
    url,
    gltf => {
      vrm = gltf.userData.vrm
      VRMUtils.removeUnnecessaryVertices(gltf.scene)
      VRMUtils.combineSkeletons(gltf.scene)
      VRMUtils.rotateVRM0(vrm)
      vrm.scene.traverse(object => {
        object.frustumCulled = false
      })
      if (vrm.lookAt) vrm.lookAt.target = gazeTarget
      restHipsY = vrm.humanoid.getNormalizedBoneNode('hips').position.y
      scene.add(vrm.scene)
      frameCameras()
      post({ type: 'ready', name: vrm.meta?.name ?? vrm.meta?.title ?? '' })
    },
    undefined,
    error => post({ type: 'error', message: String(error?.message ?? error) }),
  )
}

window.companion = {
  /** Cursor in this view's CSS pixels, origin top left; may lie outside it. */
  pointer(x, y) {
    input = { ...input, pointer: { x, y } }
  },
  showDesktop(isShown) {
    input = { ...input, showsDesktop: isShown }
  },
  forgetPointer() {
    input = { ...input, pointer: null }
  },
  mood(name) {
    input = { ...input, mood: name }
  },
  talk(seconds) {
    input = { ...input, talkingUntil: timer.getElapsed() + seconds }
  },
  wantPane(isWanted) {
    input = { ...input, wantsPane: isWanted }
  },
  /** Turns the figure about the vertical axis; for checking poses from the side. */
  turn(radians) {
    if (vrm !== undefined) vrm.scene.rotation.y = radians
  },
}

canvas.addEventListener('click', () => post({ type: 'click' }))
window.addEventListener('resize', resize)
window.addEventListener('error', event => post({ type: 'error', message: String(event.message) }))
resize()
requestAnimationFrame(animate)

const model = new URLSearchParams(location.search).get('model')
if (model) load(model)
else post({ type: 'error', message: 'no model given' })
