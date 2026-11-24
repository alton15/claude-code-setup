// What the ゆきはね式ミク free FBX calls things, in VRM 1.0 terms.

export const TEXTURES = {
  hair0: 'miku_hair.png',
  file13: 'miku_body.png',
  file14: 'miku_clothes.png',
}

/** Blendshape weights the Unity prefab leaves on (0..1). */
export const RESTING_SHAPES = { body: { 'body1.spShape': 1 } }

const side = prefix => {
  const Side = prefix === 'left' ? 'Left' : 'Right'
  const finger = (vrm, fbx, [a, b, c]) => ({
    [`${prefix}${vrm}${a}`]: `${Side}Hand${fbx}1`,
    [`${prefix}${vrm}${b}`]: `${Side}Hand${fbx}2`,
    [`${prefix}${vrm}${c}`]: `${Side}Hand${fbx}3`,
  })
  const phalanges = ['Proximal', 'Intermediate', 'Distal']
  return {
    [`${prefix}Eye`]: `${Side}Eye`,
    [`${prefix}Shoulder`]: `${Side}Shoulder`,
    [`${prefix}UpperArm`]: `${Side}UpperArm`,
    [`${prefix}LowerArm`]: `${Side}LowerArm`,
    [`${prefix}Hand`]: `${Side}Hand`,
    [`${prefix}UpperLeg`]: `${Side}UpperLeg`,
    [`${prefix}LowerLeg`]: `${Side}LowerLeg`,
    [`${prefix}Foot`]: `${Side}Foot`,
    [`${prefix}Toes`]: `${Side}ToeBase`,
    ...finger('Thumb', 'Thumb', ['Metacarpal', 'Proximal', 'Distal']),
    ...finger('Index', 'Index', phalanges),
    ...finger('Middle', 'Middle', phalanges),
    ...finger('Ring', 'Ring', phalanges),
    ...finger('Little', 'Pinky', phalanges),
  }
}

export const HUMAN_BONES = {
  hips: 'Hips',
  spine: 'Spine',
  chest: 'Chest',
  neck: 'Neck',
  head: 'Head',
  ...side('left'),
  ...side('right'),
}

const FACE = 'miku_face'
const face = (shape, weight = 1) => [FACE, `${shape}Shape`, weight]

/** Preset name: [mesh node, morph name, weight][] */
export const EXPRESSIONS = {
  happy: [face('f1.eyelids03_warai'), face('f1.lips07_niyari', 0.8)],
  angry: [face('f1.mayu07_oko'), face('f1.eyelids05_jitome', 0.5)],
  sad: [face('f1.mayu04_komaru'), face('f1.eyelids06_nagomi', 0.3)],
  relaxed: [face('f1.eyelids06_nagomi'), face('f1.lips07_niyari', 0.4)],
  surprised: [face('f1.eyelids02_bikkuri'), face('f1.mayu02_bikkuri'), face('f1.lips01_a', 0.4)],
  aa: [face('VRC.aa')],
  ih: [face('VRC.ih')],
  ou: [face('VRC.ou')],
  ee: [face('VRC.E')],
  oh: [face('VRC.oh')],
  blink: [face('f1.eyelids01_mabataki')],
  blinkLeft: [face('f1.eyelids10_wink1L')],
  blinkRight: [face('f1.eyelids11_wink1R')],
}

export const META = {
  name: 'ゆきはね式ミク free',
  version: '1.0.1',
  authors: ['ゆきはね'],
  copyrightInformation: '©ゆきはね',
  contactInformation: 'http://yukihane.rdy.jp/',
  references: ['https://booth.pm/ja/items/7428125'],
  // VRM readers accept only the VRM licence here; the VN3 terms go in otherLicenseUrl.
  licenseUrl: 'https://vrm.dev/licenses/1.0/',
  avatarPermission: 'onlyAuthor',
  allowExcessivelyViolentUsage: false,
  allowExcessivelySexualUsage: false,
  commercialUsage: 'personalNonProfit',
  allowPoliticalOrReligiousUsage: false,
  allowAntisocialOrHateUsage: false,
  creditNotation: 'required',
  allowRedistribution: false,
  modification: 'prohibited',
  otherLicenseUrl: 'https://www.vn3.org/',
}
