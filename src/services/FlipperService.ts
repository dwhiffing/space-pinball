import Phaser from 'phaser'
import * as constants from '../constants'
import Game from '../scenes/Game'

interface IBody extends MatterJS.BodyType {
  sprite: Phaser.GameObjects.Sprite
}

export default class FlipperService {
  scene: Game
  leftLever?: MatterJS.BodyType
  rightLever?: MatterJS.BodyType
  flipperImageLeft?: Phaser.GameObjects.Sprite
  flipperImageRight?: Phaser.GameObjects.Sprite
  leftTween?: { x: number }
  rightTween?: { x: number }

  constructor(scene: Game) {
    this.scene = scene
    this.createFlipper(true)
    this.createFlipper(false)
    if (constants.DEBUG_AUTO_FLIP) {
      this.scene.time.delayedCall(1, () => this.autoFlip())
    }
  }

  update() {
    this.updateAutoflip()
  }

  onFlip = (isLeft?: boolean, isDown?: boolean) => {
    if (isDown) {
      this.scene.sound.play('flipper', { volume: 0.1, rate: 0.5 })
      this.scene.lightService?.flipLights(!!isLeft)
    }
    const target = isLeft ? this.leftTween : this.rightTween
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
          this.flipperImageLeft?.setFrame(v)
        } else {
          this.flipperImageRight?.setFrame(v)
        }
        const lever = isLeft ? this.leftLever : this.rightLever
        if (!lever) return
        lever.position.x =
          FLIPPER_X +
          (isLeft ? 0 : FLIPPER_DIST) -
          Math.cos(target?.x ?? 0) * FLIPPER_LEVEL
        lever.position.y = FLIPPER_Y - Math.sin(target?.x ?? 0) * FLIPPER_LEVEL
      },
    })
  }

  onFlipLeftDown = () => this.onFlip(true, true)
  onFlipLeftUp = () => this.onFlip(true, false)

  onFlipRightDown = () => this.onFlip(false, true)
  onFlipRightUp = () => this.onFlip(false, false)

  autoFlip = (_target = constants.AUTOFLIP_TARGET) => {
    const ball = this.scene.ballService?.ball
    if (!ball?.body) return
    const body = ball?.body as MatterJS.BodyType
    const direction = ball.body.position.x < 80 ? 0 : 1
    const REFUEL = direction === 0 ? 68 : 90
    const ORBIT = direction === 0 ? 71 : 88
    const CENTER = direction === 0 ? 64 : 99
    const SIDE = direction === 0 ? 72 : 89.5
    let target = REFUEL
    if (_target === 1) target = ORBIT
    if (_target === 2) target = CENTER
    if (_target === 3) target = SIDE
    body.gravityScale.y = 0
    this.scene.time.delayedCall(600, () => {
      this.scene.matter.setVelocity(body, 0, 0)
      this.scene.matter.setAngularVelocity(body, 0)
      body.gravityScale.y = 1
    })
    this.scene.data.set('shouldflipat', target)
  }

  updateAutoflip = () => {
    const body = this.scene.ballService!.ball?.body as MatterJS.BodyType
    const shouldFlipAt = this.scene.data.get('shouldflipat')
    const direction = body.position.x < 80 ? 0 : 1

    if (
      shouldFlipAt &&
      (direction === 0
        ? body.position.x >= shouldFlipAt
        : body.position.x <= shouldFlipAt)
    ) {
      this.scene.data.set('shouldflipat', 0)
      this?.onFlip(direction === 0, true)
      this.scene.time.delayedCall(500, () =>
        this?.onFlip(direction === 0, false),
      )
    }
  }

  createFlipper = (isLeft: boolean) => {
    const x = FLIPPER_X + (isLeft ? 0 : FLIPPER_DIST)
    const y = FLIPPER_Y
    if (isLeft) {
      this.leftTween = { x: MINL }
    } else {
      this.rightTween = { x: MINR }
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
    const v = (isLeft ? this.leftTween : this.rightTween)!.x
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
      this.leftLever = lever
      this.flipperImageLeft = this.scene.add
        .sprite(FLIPPER_X - 4, FLIPPER_Y + 3, 'flipper', 0)
        .setOrigin(0, 0.5)
    } else {
      this.rightLever = lever
      this.flipperImageRight = this.scene.add
        .sprite(FLIPPER_X - 4 + (FLIPPER_DIST + 8), FLIPPER_Y + 3, 'flipper', 0)
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
