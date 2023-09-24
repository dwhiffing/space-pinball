export const DEBUG = false
export const DEBUG_AUTO_FLIP = false
export const PHYSICS_DEBUG = false

// #081820
// #346856
// #88c070
// #e0f8d0

const BUMPER_WARP = { x: 108, y: 37 }
const LEFT_SPINNER = { x: 20, y: 70 }
const RIGHT_CHUTE = { x: 150, y: 200 } // right chute
const LEFT_CHUTE = { x: 20, y: 200 } // left chute
const LEFT_SLING = { x: 45, y: 200 } // left sling
const RIGHT_SLING = { x: 98, y: 200 } // right sling
const LEFT_FLIPPER = { x: 46, y: 245 }
const GUTTER = { x: 13, y: 200 }
const RIGHT_FLIPPER = { x: 111, y: 246 }
const MAIN_CHUTE = { x: 160, y: 240 }

export const REFUEL_WARP = { x: 52, y: 145 }
export const REFUEL_ZONE_WARPER = {
  x: REFUEL_WARP.x - 10,
  y: REFUEL_WARP.y - 20,
}
export const REFUEL_ZONE = { x: -25, y: 140 }
export const AUTOFLIP_TARGET = 1

// BALL START ----------------------------------
export const BALL_START = DEBUG ? LEFT_FLIPPER : MAIN_CHUTE

export const PLUNGE_MAX = DEBUG ? 500 : 2000
export const BASE_FRICTION = 0.00035
export const LEVER_CONF = { isSensor: true, isStatic: true }

export const FLIPPER_CONF = {
  label: 'flipper',
  density: 1,
  mass: 60,
  friction: BASE_FRICTION * 100,
  restitution: 0.1,
  collisionFilter: { group: 3, mask: 2 },
}

export const BOARD_CONF = {
  isStatic: true,
  collisionFilter: { group: 1, mask: 1 },
}

export const BUMPER_SIZE = 5
export const BUMPER_CONF = {
  label: 'bumper',
  restitution: 5,
  friction: BASE_FRICTION,
  mass: 2,
  collisionFilter: { group: 3, mask: 2 },
}
export const KICK_CONF = { label: 'kick', isSensor: true }

export const BUMPERS = [
  { x: 80, y: 89 },
  { x: 108, y: 85 },
  { x: 89, y: 113 },
]

export const BALL_CONF = {
  circleRadius: 6,
  staticFriction: 50,
  density: 0.00001,
  mass: 3,
  category: 3,
  group: 3,
  bounce: 0.15,
}
export const LIGHTS = [
  { x: 77, y: 51, label: 'post-light:0' },
  { x: 93, y: 50, label: 'post-light:1' },
  { x: 112, y: 54, label: 'post-light:2' },
  { x: 11, y: 210, label: 'base-light:0' },
  { x: 28, y: 210, label: 'base-light:1' },
  { x: 132, y: 210, label: 'base-light:2' },
  { x: 149, y: 210, label: 'base-light:3' },
]
export const LIGHT_STATE = {
  'post-light': new Array(3).fill(0),
  'base-light': new Array(4).fill(0),
  'inner-circle-light': new Array(8).fill(0),
  'outer-circle-light': new Array(16).fill(0),
}
export const POSTS = [
  { x: 103, y: 54 },
  { x: 86, y: 48 },
]
export const SPINNERS = [
  { x: 14, y: 118 },
  { x: 148, y: 110 },
]

export const PASS_TOGGLES = [
  ...LIGHTS.map((l, i) => ({
    x: l.x,
    y: l.y,
    size: 2,
    label: l.label,
  })),
  ...SPINNERS.map((l, i) => ({
    x: l.x,
    y: l.y,
    size: 6,
    label: `spinner-${i}`,
  })),
]

export const PLANET_SCORES = [10000, 20000, 30000, 40000, 50000, 60000, 70000]
