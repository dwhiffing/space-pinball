import Phaser from 'phaser'
// #081820
// #346856
// #88c070
// #e0f8d0

const X = 51
const Y = 260
const LEVER = 32
const WIDTH = -8
const D = 58
const FLIPPER_DIST = 57
const FLIP_DURATION = 58
const MINL = Phaser.Math.DegToRad(210)
const MAXL = Phaser.Math.DegToRad(210 - D)
const MINR = Phaser.Math.DegToRad(330)
const MAXR = Phaser.Math.DegToRad(330 + D)
// const START = { x: 80, y: 28 }
// const START = { x: 110, y: 200 }
const START = { x: 160, y: 240 }
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
  { x: 80, y: 105 },
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
  ballImage?: Phaser.GameObjects.Sprite
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
    this.createSlingshot(true)
    this.createFlipper(true)
    this.createSlingshot(false)
    this.createPost()
    this.createFlipper(false)
    this.bumpers = BUMPERS.map((b) => this.createBumper(b.x, b.y))
    this.createKick(10, 265)
    this.createKick(149, 265)
    this.createBall()

    this.setupInput()
    this.matter.world.on('collisionstart', this.onCollisionStart)
  }

  update() {
    if (!this.ballImage || !this.ball) return
    let y = this.cameras.main.height * 1.5
    let x = this.cameras.main.width / 2
    if (this.ball.position.y < this.cameras.main.height) {
      y = this.cameras.main.height / 2
    }
    if (this.ball.position.x > this.cameras.main.width) {
      x = this.cameras.main.width / 2 + 32
    }
    this.cameras.main.pan(x, y, 120, undefined, true)
    if (this.ball.position.y > this.cameras.main.height * 2 + 40) {
      this.matter.setVelocity(this.ball, 0, 0)
      this.matter.alignBody(this.ball, START.x, START.y, CENTER)
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
  }

  createPost = () => {
    this.matter.add.rectangle(54, 58, 2, 4, { isStatic: true })
    this.matter.add.rectangle(71, 51, 2, 4, { isStatic: true })
    this.matter.add.rectangle(89, 48, 2, 4, { isStatic: true })
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
    if (
      (bodyA.label == 'ball' && bodyB.label == 'sling') ||
      (bodyB.label == 'ball' && bodyA.label == 'sling')
    ) {
      const sling =
        bodyA.label == 'ball' && bodyB.label == 'sling' ? bodyB : bodyA

      const angle =
        sling.position.x < 80
          ? Phaser.Math.DegToRad(-45)
          : Phaser.Math.DegToRad(215)
      sling.sprite.setFrame(1)
      this.time.delayedCall(150, () => sling.sprite.setFrame(0))
      this.time.delayedCall(10, () =>
        this.matter.applyForceFromAngle(this.ball!, 0.035, angle),
      )
    } else if (
      (bodyA.label == 'ball' && bodyB.label == 'bumper') ||
      (bodyB.label == 'ball' && bodyA.label == 'bumper')
    ) {
      const bumper =
        bodyA.label == 'ball' && bodyB.label == 'bumper' ? bodyB : bodyA
      bumper.sprite.setFrame(1)
      this.time.delayedCall(150, () => bumper.sprite.setFrame(0))
    } else if (
      (bodyA.label == 'ball' && bodyB.label == 'kick') ||
      (bodyB.label == 'ball' && bodyA.label == 'kick')
    ) {
      const kick =
        bodyA.label == 'ball' && bodyB.label == 'kick' ? bodyB : bodyA
      const a = kick.position.x < 80 ? -90 : -95
      this.time.delayedCall(500, () =>
        this.matter.applyForceFromAngle(this.ball!, 0.08, a),
      )
    }
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

    this.input.keyboard.addKey('down').on('up', this.onShoot)
    this.input.keyboard.addKey('space').on('down', () => this.onTilt('up'))
    this.input.keyboard.addKey('left').on('down', () => this.onTilt('left'))
    this.input.keyboard.addKey('X').on('down', () => this.onTilt('right'))
  }

  onFlip = (isLeft?: boolean, isDown?: boolean) => {
    const target = isLeft ? this.leftTween : this.rightTween
    const max = isLeft ? MAXL : MAXR
    const min = isLeft ? MINL : MINR
    this.tweens.add({
      targets: [target],
      x: isDown ? max : min,
      duration: FLIP_DURATION,
      onUpdate: (a, b, c) => {
        const v =
          a.totalProgress < 0.3 ? 0 : a.totalProgress < 0.6 ? 1 : isDown ? 2 : 0
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
        ? Phaser.Math.DegToRad(-90)
        : direction === 'left'
        ? Phaser.Math.DegToRad(180)
        : direction === 'right'
        ? Phaser.Math.DegToRad(0)
        : Phaser.Math.DegToRad(90)
    this.matter.applyForceFromAngle(this.ball!, 0.01, angle)
    this.cameras.main.shake(100, 0.02, true)
  }

  onShoot = () => {
    if (!this.ball) return
    if (this.ball.position.y > 260 && this.ball.position.x > 160)
      this.matter.applyForceFromAngle(
        this.ball!,
        0.1,
        Phaser.Math.DegToRad(-90),
      )
  }
}
