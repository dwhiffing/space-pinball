import Phaser from 'phaser'
import * as constants from '../constants'
import Game from '../scenes/Game'

export default class FlipperService {
  scene: Game
  leftLever?: MatterJS.BodyType
  rightLever?: MatterJS.BodyType
  flipperImageLeft?: Phaser.GameObjects.Sprite
  flipperImageRight?: Phaser.GameObjects.Sprite
  leftTween?: { x: number }
  rightTween?: { x: number }
  leftTween2?: { x: number }
  rightTween2?: { x: number }
  leftLever2?: MatterJS.BodyType
  rightLever2?: MatterJS.BodyType
  flipperImageLeft2?: Phaser.GameObjects.Sprite
  flipperImageRight2?: Phaser.GameObjects.Sprite

  constructor(scene: Game) {
    this.scene = scene
    this.createFlipper(FLIPPER_X, FLIPPER_Y, true, false)
    this.createFlipper(FLIPPER_X, FLIPPER_Y, false, false)
    this.createFlipper(FLIPPER_X - 180, FLIPPER_Y - 1, true, true)
    this.createFlipper(FLIPPER_X - 180, FLIPPER_Y - 1, false, true)
  }

  update() {}

  onFlip = (__x: number, __y: number, isLeft?: boolean, isDown?: boolean) => {
    if (isDown) {
      this.scene.sound.play('flipper', { volume: 0.1, rate: 0.5 })
      this.scene.lightService?.flipLights(!!isLeft)
    }
    const isExtra = __x !== FLIPPER_X
    const k = isExtra ? '2' : ''
    const target = isLeft ? this[`leftTween${k}`] : this[`rightTween${k}`]
    const max = isLeft ? MAXL : MAXR
    const min = isLeft ? MINL : MINR
    this.scene.ballService!.ball?.setAwake()
    this.scene.tweens.add({
      targets: [target],
      x: isDown ? max : min,
      duration: FLIP_DURATION,
      onUpdate: (a, b, c) => {
        const v =
          a.totalProgress <= 0.33333
            ? 0
            : a.totalProgress <= 0.6666
            ? 1
            : isDown
            ? 2
            : 0
        if (isLeft) {
          this[`flipperImageLeft${k}`]?.setFrame(v)
        } else {
          this[`flipperImageRight${k}`]?.setFrame(v)
        }

        const lever = isLeft ? this[`leftLever${k}`] : this[`rightLever${k}`]
        if (!lever) return
        lever.position.x =
          __x +
          (isLeft ? 0 : FLIPPER_DIST) -
          Math.cos(target?.x ?? 0) * FLIPPER_LEVEL
        lever.position.y = __y - Math.sin(target?.x ?? 0) * FLIPPER_LEVEL
      },
    })
  }

  onFlipLeftDown = () => {
    this.onFlip(FLIPPER_X, FLIPPER_Y, true, true)
    this.onFlip(FLIPPER_X - 180, FLIPPER_Y - 1, true, true)
  }
  onFlipLeftUp = () => {
    this.onFlip(FLIPPER_X, FLIPPER_Y, true, false)
    this.onFlip(FLIPPER_X - 180, FLIPPER_Y - 1, true, false)
  }

  onFlipRightDown = () => {
    this.onFlip(FLIPPER_X, FLIPPER_Y, false, true)
    this.onFlip(FLIPPER_X - 180, FLIPPER_Y - 1, false, true)
  }
  onFlipRightUp = () => {
    this.onFlip(FLIPPER_X, FLIPPER_Y, false, false)
    this.onFlip(FLIPPER_X - 180, FLIPPER_Y - 1, false, false)
  }

  createFlipper = (
    __x: number,
    __y: number,
    isLeft: boolean,
    isExtra: boolean,
  ) => {
    const x = __x + (isLeft ? 0 : FLIPPER_DIST)
    const y = __y
    const k = isExtra ? '2' : ''
    if (isLeft) {
      this[`leftTween${k}`] = { x: MINL }
    } else {
      this[`rightTween${k}`] = { x: MINR }
    }
    const flipper = this.scene.matter.add.rectangle(
      x,
      y,
      25,
      3,
      constants.FLIPPER_CONF,
    )
    this.scene.matter.add.worldConstraint(flipper, 0, 0.1, {
      pointA: new Phaser.Math.Vector2(x, y),
      pointB: new Phaser.Math.Vector2(FLIPPER_WIDTH, 0),
    })
    const v = (isLeft ? this[`leftTween${k}`] : this[`rightTween${k}`])!.x
    const _x = x - Math.cos(v) * FLIPPER_LEVEL
    const _y = y - Math.sin(v) * FLIPPER_LEVEL
    const lever = this.scene.matter.add.rectangle(
      _x,
      _y,
      1,
      1,
      constants.LEVER_CONF,
    )
    lever.label = 'lever'
    if (isLeft) {
      this[`leftLever${k}`] = lever
      this[`flipperImageLeft${k}`] = this.scene.add
        .sprite(__x - 4, __y + 3, 'flipper', 0)
        .setOrigin(0, 0.5)
    } else {
      this[`rightLever${k}`] = lever
      this[`flipperImageRight${k}`] = this.scene.add
        .sprite(__x - 4 + (FLIPPER_DIST + 8), __y + 3, 'flipper', 0)
        .setOrigin(1, 0.5)
        .setFlipX(true)
    }

    this.scene.matter.add.constraint(flipper, lever, 0, 0.15, {
      pointA: new Phaser.Math.Vector2(FLIPPER_WIDTH + FLIPPER_LEVEL, 0),
      pointB: new Phaser.Math.Vector2(),
    })
  }
}

const FLIPPER_X = 53
const FLIPPER_Y = 260
const FLIPPER_LEVEL = 32
const FLIPPER_WIDTH = -10
const FLIPPER_DIST = 54
const FLIP_DURATION = 52
const DegToRad = Phaser.Math.DegToRad
const delta = 58
const MINL = DegToRad(210)
const MAXL = DegToRad(210 - delta)
const MINR = DegToRad(330)
const MAXR = DegToRad(330 + delta)
