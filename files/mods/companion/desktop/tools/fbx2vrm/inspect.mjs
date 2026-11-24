// Lists an FBX's bones (with rest world positions), meshes, morph targets and materials.
// Usage: node inspect.mjs <file.fbx>
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

// FBXLoader asks for texture images through the DOM; inspection doesn't need them.
globalThis.document = { createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, style: {} }) }
globalThis.window = globalThis
globalThis.self = globalThis

const file = process.argv[2]
const buffer = readFileSync(file)
const root = new FBXLoader().parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '')
root.updateMatrixWorld(true)

const fmt = v => `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`
const box = new THREE.Box3().setFromObject(root)
console.log('box', fmt(box.min), fmt(box.max), 'scale', fmt(root.scale))

const depth = o => (o.parent ? depth(o.parent) + 1 : 0)
root.traverse(o => {
  const pos = new THREE.Vector3()
  o.getWorldPosition(pos)
  if (o.isBone) console.log('BONE', '  '.repeat(depth(o)) + o.name, fmt(pos))
  else if (o.isMesh) {
    const mats = (Array.isArray(o.material) ? o.material : [o.material]).map(m => `${m.name}[${m.map?.name ?? ''}]`)
    const morphs = Object.keys(o.morphTargetDictionary ?? {})
    console.log('MESH', o.name, o.isSkinnedMesh ? 'skinned' : '', 'verts', o.geometry.attributes.position.count, 'mats', mats.join(' '))
    console.log('  MORPHS', morphs.length, morphs.join(' | '))
  } else console.log('NODE', '  '.repeat(depth(o)) + o.name, o.type)
})
