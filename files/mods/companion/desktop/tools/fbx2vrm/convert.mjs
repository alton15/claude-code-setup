// Converts ゆきはね式ミク free (VRChat FBX + textures) into a VRM 1.0 for personal use.
// The VN3 terms allow private modification but not redistribution: keep the
// output on this machine. Credit: ©ゆきはね
//
// Usage: node convert.mjs <srcDir with model.fbx and the pngs> <out.vrm>
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

import { HUMAN_BONES, EXPRESSIONS, META, RESTING_SHAPES, TEXTURES } from './model-map.mjs'

const CM_TO_M = 0.01
const [srcDir, outFile] = process.argv.slice(2)
if (!srcDir || !outFile) throw new Error('usage: node convert.mjs <srcDir> <out.vrm>')

// FBXLoader asks for texture images through the DOM, and the exporter reads its
// Blob through FileReader. Neither exists in Node; textures are added afterwards.
globalThis.document = { createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, style: {} }) }
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => {
      this.result = result
      this.onloadend?.()
    })
  }
}

function loadFbx(file) {
  const bytes = readFileSync(file)
  return new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
}

/** Centimetres to metres without a scaled node: every translation shrinks. */
function bakeScale(root, s) {
  const shrinkTranslation = m => {
    m.elements[12] *= s
    m.elements[13] *= s
    m.elements[14] *= s
  }
  root.traverse(o => {
    o.position.multiplyScalar(s)
    if (!o.isSkinnedMesh) return
    const g = o.geometry
    g.scale(s, s, s)
    for (const target of g.morphAttributes.position ?? []) {
      for (let i = 0; i < target.count; i++) target.setXYZ(i, target.getX(i) * s, target.getY(i) * s, target.getZ(i) * s)
    }
    shrinkTranslation(o.bindMatrix)
    o.bindMatrixInverse.copy(o.bindMatrix).invert()
  })
  const skeletons = new Set()
  root.traverse(o => o.isSkinnedMesh && skeletons.add(o.skeleton))
  for (const skeleton of skeletons) skeleton.boneInverses.forEach(shrinkTranslation)
  root.updateMatrixWorld(true)
}

/** The FBX nests same-named helper bones; the outermost one carries the chain. */
function uniqueNames(root) {
  const seen = new Map()
  root.traverse(o => {
    const count = seen.get(o.name) ?? 0
    seen.set(o.name, count + 1)
    if (count > 0) o.name = `${o.name}__${count}`
  })
}

/**
 * three.js puts v=0 at the bottom of an image, glTF at the top. The exporter
 * would redraw flipped textures to match, but the PNGs go in untouched, so the
 * UVs flip instead.
 */
function flipUvsForGltf(root) {
  root.traverse(o => {
    if (!o.isMesh) return
    for (const key of ['uv', 'uv1']) {
      const uv = o.geometry.attributes[key]
      if (!uv) continue
      for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i))
    }
  })
}

/** Folds the prefab's resting blendshape weights into the base mesh and drops those shapes. */
function bakeRestingShapes(root) {
  root.traverse(o => {
    const resting = RESTING_SHAPES[o.name]
    if (!o.isMesh || !resting) return
    const g = o.geometry
    const position = g.attributes.position
    for (const [shape, weight] of Object.entries(resting)) {
      const index = o.morphTargetDictionary[shape]
      if (index === undefined) throw new Error(`no morph ${shape} on ${o.name}`)
      const delta = g.morphAttributes.position[index]
      for (let i = 0; i < position.count; i++) {
        position.setXYZ(i, position.getX(i) + delta.getX(i) * weight, position.getY(i) + delta.getY(i) * weight, position.getZ(i) + delta.getZ(i) * weight)
      }
    }
    const kept = Object.entries(o.morphTargetDictionary).filter(([shape]) => !(shape in resting)).sort((a, b) => a[1] - b[1])
    for (const key of Object.keys(g.morphAttributes)) g.morphAttributes[key] = kept.map(([, i]) => g.morphAttributes[key][i])
    o.morphTargetDictionary = Object.fromEntries(kept.map(([shape], i) => [shape, i]))
    o.morphTargetInfluences = kept.map(() => 0)
    g.computeBoundingBox()
  })
}

/** Flat, unlit, cut-out materials; the texture goes in after export. */
function flattenMaterials(root) {
  const cache = new Map()
  const flat = m => {
    const texture = Object.keys(TEXTURES).find(key => m.map?.name?.includes(key))
    if (!texture) throw new Error(`no texture mapping for material ${m.name} (${m.map?.name})`)
    if (!cache.has(texture)) cache.set(texture, new THREE.MeshBasicMaterial({ name: texture, side: THREE.DoubleSide }))
    return cache.get(texture)
  }
  root.traverse(o => {
    if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(flat) : flat(o.material)
  })
}

function exportGlb(root) {
  return new Promise((resolve, reject) =>
    new GLTFExporter().parse(root, resolve, reject, { binary: true, onlyVisible: false }),
  )
}

// ---- GLB surgery ----

function readGlb(buffer) {
  const view = new DataView(buffer)
  const jsonLength = view.getUint32(12, true)
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)))
  const binStart = 20 + jsonLength
  const binLength = view.getUint32(binStart, true)
  return { json, bin: Buffer.from(buffer, binStart + 8, binLength) }
}

function writeGlb(json, bin) {
  const pad = (b, fill) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4, fill)])
  const jsonChunk = pad(Buffer.from(JSON.stringify(json)), 0x20)
  const binChunk = pad(bin, 0)
  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8)
  const chunkHeader = (length, type) => {
    const h = Buffer.alloc(8)
    h.writeUInt32LE(length, 0)
    h.writeUInt32LE(type, 4)
    return h
  }
  return Buffer.concat([header, chunkHeader(jsonChunk.length, 0x4e4f534a), jsonChunk, chunkHeader(binChunk.length, 0x004e4942), binChunk])
}

/** Appends each PNG to the binary chunk and points its material at it. */
function addTextures(json, bin) {
  const chunks = [bin]
  let offset = bin.length
  const images = (json.images ??= [])
  const textures = (json.textures ??= [])
  const samplers = (json.samplers ??= [])
  samplers.push({ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 })
  const sampler = samplers.length - 1

  for (const material of json.materials) {
    const png = readFileSync(join(srcDir, TEXTURES[material.name]))
    const align = (4 - (offset % 4)) % 4
    chunks.push(Buffer.alloc(align))
    offset += align
    json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: png.length })
    chunks.push(png)
    offset += png.length
    images.push({ name: material.name, mimeType: 'image/png', bufferView: json.bufferViews.length - 1 })
    textures.push({ sampler, source: images.length - 1 })
    material.pbrMetallicRoughness = { ...material.pbrMetallicRoughness, baseColorTexture: { index: textures.length - 1 } }
    material.alphaMode = 'MASK'
    material.alphaCutoff = 0.5
    material.doubleSided = true
  }
  const out = Buffer.concat(chunks)
  json.buffers[0].byteLength = out.length
  return out
}

function nodeIndex(json, name) {
  const index = json.nodes.findIndex(n => n.name === name)
  if (index < 0) throw new Error(`no node named ${name}`)
  return index
}

function morphIndex(json, meshNode, shape) {
  const mesh = json.meshes[json.nodes[meshNode].mesh]
  const index = mesh.extras?.targetNames?.indexOf(shape) ?? -1
  if (index < 0) throw new Error(`no morph ${shape} on ${json.nodes[meshNode].name}`)
  return index
}

function vrmExtension(json) {
  const humanBones = Object.fromEntries(Object.entries(HUMAN_BONES).map(([bone, name]) => [bone, { node: nodeIndex(json, name) }]))
  const expressions = Object.fromEntries(
    Object.entries(EXPRESSIONS).map(([preset, binds]) => [
      preset,
      {
        isBinary: false,
        // The smile already shuts the eyes; a blink on top would fold the lids twice.
        overrideBlink: preset === 'happy' ? 'block' : 'none',
        overrideLookAt: 'none',
        overrideMouth: 'none',
        morphTargetBinds: binds.map(([mesh, shape, weight]) => {
          const node = nodeIndex(json, mesh)
          return { node, index: morphIndex(json, node, shape), weight }
        }),
      },
    ]),
  )
  const range = { inputMaxValue: 90, outputScale: 10 }
  return {
    specVersion: '1.0',
    meta: META,
    humanoid: { humanBones },
    lookAt: {
      type: 'bone',
      offsetFromHeadBone: [0, 0.07, 0.03],
      rangeMapHorizontalInner: range,
      rangeMapHorizontalOuter: range,
      rangeMapVerticalDown: range,
      rangeMapVerticalUp: range,
    },
    expressions: { preset: expressions },
  }
}

const root = loadFbx(join(srcDir, 'model.fbx'))
root.updateMatrixWorld(true)
flipUvsForGltf(root)
bakeRestingShapes(root)
bakeScale(root, CM_TO_M)
uniqueNames(root)
flattenMaterials(root)

const { json, bin } = readGlb(await exportGlb(root))
const withTextures = addTextures(json, bin)
json.extensions = { ...json.extensions, VRMC_vrm: vrmExtension(json) }
json.extensionsUsed = [...new Set([...(json.extensionsUsed ?? []), 'VRMC_vrm'])]
writeFileSync(outFile, writeGlb(json, withTextures))
console.log(`wrote ${outFile}: ${json.nodes.length} nodes, ${json.meshes.length} meshes, ${json.materials.length} materials`)
