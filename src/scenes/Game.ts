import Phaser from 'phaser'
import { DEBUG } from '../constants'
import { Fader } from '../services/Fader'
// #081820
// #346856
// #88c070
// #e0f8d0

const X = 53
const Y = 260
const LEVER = 32
const WIDTH = -8
const D = 58
const FLIPPER_DIST = 54
const FLIP_DURATION = 54
const DegToRad = Phaser.Math.DegToRad
const MINL = DegToRad(210)
const MAXL = DegToRad(210 - D)
const MINR = DegToRad(330)
const MAXR = DegToRad(330 + D)
// const START = { x: 80, y: 28 } // top bumpers
// const START = { x: 150, y: 200 } // right chute
// const START = { x: 20, y: 200 } // left chute
// const LEFT_FLIPPER = { x: 45, y: 240 }
const RIGHT_FLIPPER = { x: 111, y: 243 }
// const START = { x: 45, y: 200 } // left sling
// const START = { x: 98, y: 200 } // right sling
// const REFUEL_BOARD = { x: -100, y: 144 }
const MAIN_CHUTE = { x: 160, y: 240 }
const REFUEL_WARP = { x: 45, y: 148 }
const START = DEBUG ? RIGHT_FLIPPER : MAIN_CHUTE
const LEVER_CONF = { isSensor: true, isStatic: true }
const CENTER = Phaser.Display.Align.CENTER
const F = 0.0075

const FLIPPER_CONF = {
  label: 'flipper',
  density: 1,
  mass: 200,
  friction: F * 100,
  restitution: 0.01,
  collisionFilter: { group: 3, mask: 2 },
}

const BOARD_CONF = {
  isStatic: true,
  collisionFilter: { group: 1, mask: 1 },
}

const BUMPER_SIZE = 9
const BUMPER_CONF = {
  label: 'bumper',
  restitution: 5,
  friction: F,
  mass: 2,
  collisionFilter: { group: 3, mask: 2 },
}
const KICK_CONF = { label: 'kick', isSensor: true }

const BUMPERS = [
  { x: 59, y: 77 },
  { x: 93, y: 72 },
  { x: 75, y: 105 },
]

const BALL_CONF = {
  label: 'ball',
  mass: 2.5,
  density: 0.005,
  restitution: 0,
  friction: F,
  frictionStatic: 10,
  collisionFilter: { group: 3, mask: 3 },
}

interface IBody extends MatterJS.BodyType {
  sprite: Phaser.GameObjects.Sprite
}

export default class Game extends Phaser.Scene {
  ball?: MatterJS.BodyType
  leftLever?: MatterJS.BodyType
  rightLever?: MatterJS.BodyType
  bumpers?: IBody[]
  fader?: Fader
  ballImage?: Phaser.GameObjects.Sprite
  message?: Phaser.GameObjects.BitmapText
  flipperImageLeft?: Phaser.GameObjects.Sprite
  flipperImageRight?: Phaser.GameObjects.Sprite
  leftTween?: { x: number }
  rightTween?: { x: number }

  constructor() {
    super('GameScene')
  }

  create() {
    this.matter.config.positionIterations = 40

    this.createBoard()
    this.createRefuelBoard()
    this.createSlingshot(true)
    this.createFlipper(true)
    this.createSlingshot(false)
    this.createPost()
    this.createFlipper(false)
    this.bumpers = BUMPERS.map((b) => this.createBumper(b.x, b.y))
    this.createKick(10, 265)
    this.createKick(149, 265)
    this.createBall()
    this.createUI()
    this.setupInput()
    if (DEBUG) {
      // this.time.delayedCall(1, this.delayedFlip)
    } else {
      this.fader = new Fader(this, true)
      this.time.delayedCall(250, () => this.fader?.fade(1500))
    }

    this.matter.world.on('collisionstart', this.onCollisionStart)
  }

  delayedFlip = () => {
    this.time.delayedCall(50, this.onFlipRightDown)

    this.time.delayedCall(500, () => this.matter.setVelocity(this.ball!, 0, 0))
    this.time.delayedCall(1500, this.onFlipRightUp)
    this.time.delayedCall(2150, this.onFlipRightDown)
    this.time.delayedCall(2500, this.onFlipRightUp)
  }

  update() {
    this.fader?.update()
    if (!this.ballImage || !this.ball) return
    let y = this.cameras.main.height * 1.5
    let x = this.cameras.main.width / 2
    if (this.ball.position.x < 0) {
      x = -100
    } else {
      if (this.ball.position.y < this.cameras.main.height) {
        y = this.cameras.main.height / 2
      }
      if (this.ball.position.x > this.cameras.main.width) {
        x = this.cameras.main.width / 2 + 32
      }
    }
    // TODO: only pan if x/y changed
    this.cameras.main.pan(x, y, 120, undefined, true)

    if (this.ball.position.y > this.cameras.main.height * 2 + 40) {
      if (this.ball.position.x < 0) {
        this.time.delayedCall(1500, () => {
          const { x, y } = REFUEL_WARP
          this.matter.setVelocity(this.ball!, 0, 0)
          this.matter.alignBody(this.ball!, x, y, CENTER)
        })
      } else {
        this.onBallLost()
      }
    }

    this.ballImage.setPosition(this.ball.position.x, this.ball.position.y)
    const angle = Phaser.Math.RadToDeg(this.ball.angle) % 360
    const frame = Math.floor((angle < 0 ? angle + 360 : angle) / 22.5)
    this.ballImage.setFrame(frame)
    this.bumpers?.forEach((b) =>
      b.sprite.setPosition(b.position.x, b.position.y),
    )
  }

  createBall = () => {
    this.ballImage = this.add.sprite(0, 0, 'ball')
    this.ball = this.matter.add.circle(START.x, START.y, 6.5, BALL_CONF)
  }

  createBoard = () => {
    const boardSVG = this.cache.xml.get('board')
    const board = this.matter.add.fromSVG(0, 0, boardSVG, 1, BOARD_CONF)
    this.matter.alignBody(board, 96, 290, Phaser.Display.Align.BOTTOM_CENTER)
    board.friction = F / 10
    this.add.image(0, 2, 'board').setOrigin(0, 0)
    board.parts.forEach((p) => (p.label = 'board'))
  }

  createRefuelBoard = () => {
    const boardSVG = this.cache.xml.get('refuel-board')
    const board = this.matter.add.fromSVG(0, 0, boardSVG, 1, BOARD_CONF)
    this.matter.alignBody(board, -200, 290, Phaser.Display.Align.BOTTOM_CENTER)
    board.friction = F / 10
    this.add.image(-180, 144, 'refuel-board').setOrigin(0, 0)
    board.parts.forEach((p) => (p.label = 'board'))
  }

  createUI = () => {
    this.add
      .rectangle(0, 144, 160, 8, 0x081820)
      .setScrollFactor(0)
      .setOrigin(0, 1)
    this.message = this.add
      .bitmapText(1, 145, 'clarity', '', -8)
      .setScrollFactor(0)
      .setOrigin(0, 1)
  }

  createPost = () => {
    const posts = [
      this.matter.add.rectangle(54, 58, 2, 4, { isStatic: true }),
      this.matter.add.rectangle(71, 51, 2, 4, { isStatic: true }),
      this.matter.add.rectangle(89, 48, 2, 4, { isStatic: true }),
    ]
    posts.forEach((p) => (p.label = 'post'))
  }

  createSlingshot = (isLeft: boolean) => {
    const bounceSVG = this.cache.xml.get('bounce')
    const slingBase = this.matter.add.fromSVG(0, 0, bounceSVG, 1, BOARD_CONF)
    const sling = this.matter.add.rectangle(0, 0, 3, 25, {
      isStatic: true,
      angle: isLeft ? -0.48 : 0.44,
    }) as IBody

    sling.sprite = this.add
      .sprite(isLeft ? 35 : 125, 224, 'sling')
      .setFlipX(!isLeft)
      .setOrigin(isLeft ? 0 : 1, 0.5)

    if (!isLeft) this.matter.body.scale(slingBase, -1, 1)
    const a = Phaser.Display.Align.BOTTOM_CENTER
    this.matter.alignBody(slingBase, isLeft ? 43 : 121, 240, a)
    this.matter.alignBody(sling, isLeft ? 44 : 115, 235, a)
    sling.label = 'sling'
    slingBase.label = 'board'
    slingBase.friction = F
  }

  createBumper = (x: number, y: number) => {
    const bump = this.matter.add.circle(0, 0, BUMPER_SIZE, BUMPER_CONF) as IBody
    const _bumperImage = this.add.sprite(x, y, 'bumper')
    bump.sprite = _bumperImage
    const pointA = new Phaser.Math.Vector2(x, y)
    this.matter.add.worldConstraint(bump, 0, 0.1, { pointA })
    return bump
  }

  createKick = (x: number, y: number) => {
    const bump = this.matter.add.circle(0, 0, 2, KICK_CONF) as IBody
    const pointA = new Phaser.Math.Vector2(x, y)
    this.matter.add.worldConstraint(bump, 0, 0.5, { pointA })
  }

  createFlipper = (isLeft: boolean) => {
    const x = X + (isLeft ? 0 : FLIPPER_DIST)
    const y = Y
    if (isLeft) {
      this.leftTween = { x: MINL }
    } else {
      this.rightTween = { x: MINR }
    }
    const flipperSVG = this.cache.xml.get('flipper')
    const flipper = this.matter.add.fromSVG(0, 0, flipperSVG, 1, FLIPPER_CONF)
    this.matter.add.worldConstraint(flipper, 0, 0.15, {
      pointA: new Phaser.Math.Vector2(x, y),
      pointB: new Phaser.Math.Vector2(WIDTH, 0),
    })
    const v = (isLeft ? this.leftTween : this.rightTween)!.x
    const _x = x - Math.cos(v) * LEVER
    const _y = y - Math.sin(v) * LEVER
    const lever = this.matter.add.rectangle(_x, _y, 1, 1, LEVER_CONF)
    lever.label = 'lever'
    if (isLeft) {
      this.leftLever = lever
      this.flipperImageLeft = this.add
        .sprite(X - 4, Y + 1, 'flipper', 0)
        .setOrigin(0, 0.5)
    } else {
      this.rightLever = lever
      this.flipperImageRight = this.add
        .sprite(X - 4 + (FLIPPER_DIST + 8), Y + 1, 'flipper', 0)
        .setOrigin(1, 0.5)
        .setFlipX(true)
    }

    this.matter.add.constraint(flipper, lever, 0, 0.05, {
      pointA: new Phaser.Math.Vector2(WIDTH + LEVER, 0),
      pointB: new Phaser.Math.Vector2(),
    })
  }

  onCollisionStart = (event: any, bodyA: IBody, bodyB: IBody) => {
    const checkBodies = (a: string, b: string) =>
      (bodyA.label == a && bodyB.label == b) ||
      (bodyB.label == a && bodyA.label == b)
    const ball = bodyA.label == 'ball' ? bodyA : bodyB
    const other = ball === bodyA ? bodyB : bodyA
    if (!ball) return
    if (checkBodies('ball', 'sling')) {
      const angle = other.position.x < 80 ? DegToRad(-45) : DegToRad(215)
      other.sprite.setFrame(1)
      this.time.delayedCall(150, () => other.sprite.setFrame(0))
      this.time.delayedCall(10, () =>
        this.matter.applyForceFromAngle(this.ball!, 0.035, angle),
      )

      this.sound.play('sling', { volume: 0.2 })
    } else if (
      checkBodies('ball', 'flipper') ||
      checkBodies('ball', 'post') ||
      checkBodies('ball', 'board')
    ) {
      const last = this.data.get('lastdingtime')
      if (ball.speed > 1.75 && (!last || Math.abs(last - this.time.now) > 90)) {
        this.data.set('lastdingtime', this.time.now)
        const volume = Math.min(ball.speed / 160, 3)
        this.sound.play('ding', { volume, rate: 2 })
      }
    } else if (checkBodies('ball', 'bumper')) {
      const last = this.data.get('lastbumpertime')
      if (ball.speed > 0.5 && (!last || Math.abs(last - this.time.now) > 10)) {
        this.data.set('lastbumpertime', this.time.now)
        this.sound.play('bumper', { volume: 0.2 })
      }

      other.sprite.setFrame(1)
      this.time.delayedCall(150, () => other.sprite.setFrame(0))
    } else if (checkBodies('ball', 'kick')) {
      const a = other.position.x < 80 ? -90 : -95
      this.time.delayedCall(500, () =>
        this.matter.applyForceFromAngle(this.ball!, 0.08, a),
      )
    } else if (checkBodies('ball', 'lever')) {
      //
    } else {
      console.log(bodyA.label, bodyB.label)
    }
  }

  onBallLost = () => {
    const isBallLost = this.data.get('ball-lost')
    if (!this.ball || isBallLost) return

    this.sound.play('ball-lost', { volume: 0.35, rate: 0.9 })
    this.data.set('ball-lost', true)
    this.time.delayedCall(DEBUG ? 1 : 1500, () => {
      this.data.set('ball-lost', false)
      this.matter.setVelocity(this.ball!, 0, 0)
      this.matter.alignBody(this.ball!, START.x, START.y, CENTER)
      // if (DEBUG) this.delayedFlip()
    })

    if (this.message) this.message.text = 'Ball lost'
  }

  setupInput = () => {
    this.input.keyboard
      .addKey('Z')
      .on('down', this.onFlipLeftDown)
      .on('up', this.onFlipLeftUp)

    this.input.keyboard
      .addKey('right')
      .on('down', this.onFlipRightDown)
      .on('up', this.onFlipRightUp)

    this.input.keyboard.addKey('down').on('down', this.onShootStart)
    this.input.keyboard.addKey('down').on('up', this.onShoot)
    this.input.keyboard.addKey('space').on('down', () => this.onTilt('up'))
    this.input.keyboard.addKey('left').on('down', () => this.onTilt('left'))
    this.input.keyboard.addKey('X').on('down', () => this.onTilt('right'))
  }

  onFlip = (isLeft?: boolean, isDown?: boolean) => {
    if (isDown) this.sound.play('flipper', { volume: 0.1, rate: 0.5 })
    const target = isLeft ? this.leftTween : this.rightTween
    const max = isLeft ? MAXL : MAXR
    const min = isLeft ? MINL : MINR
    this.tweens.add({
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
          X + (isLeft ? 0 : FLIPPER_DIST) - Math.cos(target?.x ?? 0) * LEVER
        lever.position.y = Y - Math.sin(target?.x ?? 0) * LEVER
      },
    })
  }

  onFlipLeftDown = () => this.onFlip(true, true)
  onFlipLeftUp = () => this.onFlip(true, false)

  onFlipRightDown = () => this.onFlip(false, true)
  onFlipRightUp = () => this.onFlip(false, false)

  onTilt = (direction: string) => {
    const angle =
      direction === 'up'
        ? DegToRad(-90)
        : direction === 'left'
        ? DegToRad(180)
        : direction === 'right'
        ? DegToRad(0)
        : DegToRad(90)
    this.matter.applyForceFromAngle(this.ball!, 0.01, angle)
    this.cameras.main.shake(100, 0.02, true)
  }

  onShootStart = () => {
    if (!this.ball) return

    this.sound.play('click', { volume: 0.5 })
    this.data.set('plungestart', this.time.now)
  }

  onShoot = () => {
    if (!this.ball) return

    const value = Math.min(this.time.now - this.data.get('plungestart'), 2500)
    const force = value / 25000
    if (force > 0.06) this.cameras.main.shake(100, force / 5, true)
    this.sound.play('plunger', { volume: force * 5 })
    if (this.ball.position.y > 260 && this.ball.position.x > 160)
      this.matter.applyForceFromAngle(this.ball!, force, DegToRad(-90))
  }
}
