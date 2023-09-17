import Phaser from 'phaser'
// #081820
// #346856
// #88c070
// #e0f8d0

const X = 49
const Y = 260
const LEVER = 32
const WIDTH = -8
const D = 50
const FLIPPER_DIST = 57
const FLIP_DURATION = 70
const MINL = Phaser.Math.DegToRad(210)
const MAXL = Phaser.Math.DegToRad(210 - D)
const MINR = Phaser.Math.DegToRad(330)
const MAXR = Phaser.Math.DegToRad(330 + D)
const START = { x: 30, y: 40 }
const LEVER_CONF = { isSensor: true, isStatic: true }
const CENTER = Phaser.Display.Align.CENTER

const FLIPPER_CONF = {
  density: 1,
  friction: 0.0001,
  restitution: 0.01,
  collisionFilter: { group: 3, mask: 2 },
}

const BOARD_CONF = {
  isStatic: true,
  collisionFilter: { group: 1, mask: 1 },
}

const BALL_CONF = {
  mass: 7,
  density: 1,
  restitution: 0.3,
  friction: 0.0001,
  collisionFilter: { group: 3, mask: 3 },
}

export default class Game extends Phaser.Scene {
  ball?: MatterJS.BodyType
  leftLever?: MatterJS.BodyType
  rightLever?: MatterJS.BodyType
  ballImage?: Phaser.GameObjects.Image
  flipperImageLeft?: Phaser.GameObjects.Image
  flipperImageRight?: Phaser.GameObjects.Image
  leftTween?: { x: number }
  rightTween?: { x: number }

  constructor() {
    super('GameScene')
  }

  create() {
    this.matter.config.positionIterations = 20

    const boardSVG = this.cache.xml.get('board')
    const board = this.matter.add.fromSVG(0, 0, boardSVG, 1, BOARD_CONF)
    this.matter.alignBody(board, 95, 280, Phaser.Display.Align.BOTTOM_CENTER)
    board.restitution = 0.1
    board.friction = 0.001
    const bounceSVG = this.cache.xml.get('bounce')
    const bounceL = this.matter.add.fromSVG(0, 0, bounceSVG, 1, BOARD_CONF)
    const bounceR = this.matter.add.fromSVG(0, 0, bounceSVG, 1, BOARD_CONF)
    this.matter.body.scale(bounceR, -1, 1)
    this.matter.alignBody(bounceL, 45, 238, Phaser.Display.Align.BOTTOM_CENTER)
    this.matter.alignBody(bounceR, 116, 238, Phaser.Display.Align.BOTTOM_CENTER)
    bounceL.friction = 0.001
    bounceR.friction = 0.001
    // bounceL.restitution = 1
    // bounceR.restitution = 1

    this.createFlipper(X, Y, true)
    this.createFlipper(X + FLIPPER_DIST, Y, false)

    const bg = this.add.image(0, 7, 'bg').setOrigin(0, 0)
    this.flipperImageLeft = this.add
      .sprite(X - 2, Y + 2, 'flipper', 0)
      .setOrigin(0, 0.5)
    this.flipperImageRight = this.add
      .sprite(X - 2 + (FLIPPER_DIST + 4), Y + 2, 'flipper', 0)
      .setOrigin(1, 0.5)
      .setFlipX(true)
    this.ballImage = this.add.image(0, 0, 'ball')
    this.ball = this.matter.add.circle(START.x, START.y, 7, BALL_CONF)

    this.input.keyboard
      .addKey('left')
      .on('down', this.onFlipLeftDown)
      .on('up', this.onFlipLeftUp)

    this.input.keyboard
      .addKey('right')
      .on('down', this.onFlipRightDown)
      .on('up', this.onFlipRightUp)

    this.input.keyboard.addKey('space').on('up', this.onShoot)
  }

  update() {
    if (!this.ballImage || !this.ball) return
    if (this.ball.position.y < this.cameras.main.height) {
      this.cameras.main.scrollY = 0
    } else {
      this.cameras.main.scrollY = this.cameras.main.height
    }
    if (this.ball.position.y > this.cameras.main.height * 2 + 40) {
      this.matter.setVelocity(this.ball, 0, 0)
      this.matter.alignBody(this.ball, START.x, START.y, CENTER)
    }
    this.ballImage.setPosition(this.ball.position.x, this.ball.position.y)
  }

  onFlipLeftDown = () => this.onFlip(true, true)
  onFlipLeftUp = () => this.onFlip(true, false)

  onFlipRightDown = () => this.onFlip(false, true)
  onFlipRightUp = () => this.onFlip(false, false)

  onShoot = () => {
    this.matter.applyForceFromAngle(this.ball!, 0.2, Phaser.Math.DegToRad(-90))
  }

  onFlip = (isLeft?: boolean, isDown?: boolean) => {
    const target = isLeft ? this.leftTween : this.rightTween
    const max = isLeft ? MAXL : MAXR
    const min = isLeft ? MINL : MINR
    if (isLeft) {
      this.flipperImageLeft?.setFrame(isDown ? 2 : 0)
    } else {
      this.flipperImageRight?.setFrame(isDown ? 2 : 0)
    }
    this.tweens.add({
      targets: [target],
      x: isDown ? max : min,
      duration: FLIP_DURATION,
      onUpdate: () => {
        const lever = isLeft ? this.leftLever : this.rightLever
        if (!lever) return
        lever.position.x =
          X + (isLeft ? 0 : FLIPPER_DIST) - Math.cos(target?.x ?? 0) * LEVER
        lever.position.y = Y - Math.sin(target?.x ?? 0) * LEVER
      },
    })
  }

  createFlipper = (x: number, y: number, isLeft: boolean) => {
    if (isLeft) {
      this.leftTween = { x: MINL }
    } else {
      this.rightTween = { x: MINR }
    }
    const flipperSVG = this.cache.xml.get('flipper')
    const flipper = this.matter.add.fromSVG(0, 0, flipperSVG, 1, FLIPPER_CONF)
    this.matter.add.worldConstraint(flipper, 0, 0.2, {
      pointA: new Phaser.Math.Vector2(x, y),
      pointB: new Phaser.Math.Vector2(WIDTH, 0),
    })
    const v = (isLeft ? this.leftTween : this.rightTween)!.x
    const _x = x - Math.cos(v) * LEVER
    const _y = y - Math.sin(v) * LEVER
    const lever = this.matter.add.rectangle(_x, _y, 1, 1, LEVER_CONF)
    if (isLeft) {
      this.leftLever = lever
    } else {
      this.rightLever = lever
    }

    this.matter.add.constraint(flipper, lever, 0, 0.1, {
      pointA: new Phaser.Math.Vector2(WIDTH + LEVER, 0),
      pointB: new Phaser.Math.Vector2(),
    })
  }
}
