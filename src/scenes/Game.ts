import Phaser from 'phaser'
import { DEBUG, DEBUG_AUTO_FLIP } from '../constants'
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
const FLIP_DURATION = 52
const DegToRad = Phaser.Math.DegToRad
const MINL = DegToRad(210)
const MAXL = DegToRad(210 - D)
const MINR = DegToRad(330)
const MAXR = DegToRad(330 + D)
const BUMPER_WARP = { x: 88, y: 37 }
const LEFT_SPINNER = { x: 20, y: 70 }
// const START = { x: 150, y: 200 } // right chute
// const START = { x: 20, y: 200 } // left chute
const LEFT_FLIPPER = { x: 43, y: 243 }
const RIGHT_FLIPPER = { x: 131, y: 235 }
const GUTTER = { x: 13, y: 200 }
// const START = { x: 45, y: 200 } // left sling
// const START = { x: 98, y: 200 } // right sling
// const REFUEL_BOARD = { x: -100, y: 144 }
const REFUEL_WARP = { x: 52, y: 145 }
const REFUEL_ZONE = { x: -100, y: 148 }
const REFUEL_ZONE_WARPER = { x: REFUEL_WARP.x - 10, y: REFUEL_WARP.y - 20 }
const MAIN_CHUTE = { x: 160, y: 240 }
const AUTOFLIP_TARGET = 3
const START = DEBUG ? LEFT_SPINNER : MAIN_CHUTE
const LEVER_CONF = { isSensor: true, isStatic: true }
const CENTER = Phaser.Display.Align.CENTER
const F = 0.00035

const FLIPPER_CONF = {
  label: 'flipper',
  density: 1,
  mass: 60,
  friction: F,
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
  circleRadius: 6,
  staticFriction: 50,
  density: 0.00001,
  mass: 3,
  category: 3,
  group: 3,
  bounce: 0.15,
}
const LIGHTS = [
  { x: 47, y: 62, label: 'post-light-0' },
  { x: 72, y: 50, label: 'post-light-1' },
  { x: 96, y: 50, label: 'post-light-2' },
]
const POSTS = [
  { x: 59, y: 54 },
  { x: 84, y: 48 },
]
const SPINNERS = [
  { x: 14, y: 102 },
  { x: 142, y: 102 },
]

const PASS_TOGGLES = [
  ...LIGHTS.map((l, i) => ({
    x: l.x,
    y: l.y,
    size: 6,
    label: `post-light-${i}`,
  })),
  ...SPINNERS.map((l, i) => ({
    x: l.x,
    y: l.y,
    size: 6,
    label: `spinner-${i}`,
  })),
]

interface IBody extends MatterJS.BodyType {
  sprite: Phaser.GameObjects.Sprite
}

export default class Game extends Phaser.Scene {
  ball?: Phaser.Physics.Matter.Sprite
  leftLever?: MatterJS.BodyType
  lightSprites?: Phaser.GameObjects.Sprite[]
  spinners?: Phaser.GameObjects.Sprite[]
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
    this.matter.set60Hz()
    this.createBoard()
    this.createRefuelBoard()
    this.createSlingshot(true)
    this.createFlipper(true)
    this.createSlingshot(false)
    this.createPost()
    this.createSpinners()
    this.createPassToggles()
    this.createLights()
    this.createFlipper(false)
    this.bumpers = BUMPERS.map((b) => this.createBumper(b.x, b.y))
    this.createKick(10, 265)
    this.createKick(149, 265)
    this.createBall()
    this.createUI()
    this.setupInput()
    if (DEBUG_AUTO_FLIP) {
      this.time.delayedCall(1, () => this.autoFlip())
    }
    this.fader = new Fader(this, true)
    this.time.delayedCall(5, () => {
      this.fader?.fade(DEBUG ? 50 : 1500)
    })
    this.data.set('allowcamerapan', true)

    this.matter.world.on('collisionstart', this.onCollisionStart)

    const limitMaxSpeed = () => {
      let maxSpeed = 11
      const body = this.ball?.body as MatterJS.BodyType
      if (body.velocity.x > maxSpeed) {
        this.matter.setVelocity(body, maxSpeed, body.velocity.y)
      }

      if (body.velocity.x < -maxSpeed) {
        this.matter.setVelocity(body, -maxSpeed, body.velocity.y)
      }

      if (body.velocity.y > maxSpeed) {
        this.matter.setVelocity(body, body.velocity.x, maxSpeed)
      }

      if (body.velocity.y < -maxSpeed) {
        this.matter.setVelocity(body, body.velocity.x, -maxSpeed)
      }
    }
    this.matter.world.on('beforeupdate', limitMaxSpeed)
  }

  autoFlip = (_target = AUTOFLIP_TARGET) => {
    if (!this.ball?.body) return
    const body = this.ball?.body as MatterJS.BodyType
    const direction = this.ball.body.position.x < 80 ? 0 : 1
    const REFUEL = direction === 0 ? 68 : 94
    const ORBIT = direction === 0 ? 70.5 : 92
    const CENTER = direction === 0 ? 69 : 99
    const SIDE = direction === 0 ? 71 : 91
    let target = REFUEL
    if (_target === 1) target = ORBIT
    if (_target === 2) target = CENTER
    if (_target === 3) target = SIDE
    body.gravityScale.y = 0
    this.time.delayedCall(600, () => {
      this.matter.setVelocity(body, 0, 0)
      this.matter.setAngularVelocity(body, 0)
      body.gravityScale.y = 1
    })
    this.data.set('shouldflipat', target)
  }

  getCameraPosition = () => {
    const body = this.ball?.body as MatterJS.BodyType
    let y = this.cameras.main.height * 1.5
    let x = this.cameras.main.width / 2
    if (body.position.x < 0) {
      x = -100
    } else {
      if (body.position.y < this.cameras.main.height) {
        y = this.cameras.main.height / 2
      }
      if (body.position.x > this.cameras.main.width) {
        x = this.cameras.main.width / 2 + 32
      }
    }
    return { x, y }
  }

  update() {
    this.fader?.update()
    if (!this.ball?.body) return
    const body = this.ball?.body as MatterJS.BodyType
    const cameraPos = this.getCameraPosition()
    const allowPan = this.data.get('allowcamerapan')

    if (
      allowPan &&
      (this.cameras.main.x !== cameraPos.x ||
        this.cameras.main.y !== cameraPos.y)
    ) {
      this.cameras.main.pan(cameraPos.x, cameraPos.y, 120, undefined, true)
    }

    const shouldFlipAt = this.data.get('shouldflipat')
    const direction = body.position.x < 80 ? 0 : 1

    if (
      shouldFlipAt &&
      (direction === 0
        ? body.position.x >= shouldFlipAt
        : body.position.x <= shouldFlipAt)
    ) {
      this.data.set('shouldflipat', 0)
      this.onFlip(direction === 0, true)
      this.time.delayedCall(500, () => this.onFlip(direction === 0, false))
    }

    if (
      !this.data.get('ball-lost') &&
      body.position.y > this.cameras.main.height * 2 + 40
    ) {
      if (body.position.x < 0) {
        this.onDrainRefuel()
      } else {
        this.onBallLost()
      }
    }

    this.ballImage!.setPosition(body.position.x, body.position.y)
    const angle = Phaser.Math.RadToDeg(body.angle) % 360
    const frame = Math.floor((angle < 0 ? angle + 360 : angle) / 22.5)
    this.ballImage!.setFrame(frame)
    this.bumpers?.forEach((b) =>
      b.sprite.setPosition(b.position.x, b.position.y),
    )

    this.spinners?.forEach((spinner) => {
      let speed = spinner.data.get('speed') ?? 0
      let playedSound = spinner.data.get('playedSound') ?? false
      let frame = spinner.data.get('frame') ?? 0
      if (Math.abs(speed) > 0.1) {
        spinner.data.set('frame', (frame + speed / 10) % 5)
        spinner.data.set('speed', speed * 0.98)
        const finalFrame = Math.floor(frame > 0 ? frame : 5 + frame)
        if (finalFrame !== +spinner.frame.name) {
          spinner.data.set('playedSound', false)
          spinner.setFrame(finalFrame)
        }
        if (finalFrame === 0 && !playedSound) {
          spinner.data.set('playedSound', true)
          this.sound.play('click')
        }
      } else if (speed > 0) {
        spinner.data.set('speed', 0)
      }
    })
  }

  createBall = () => {
    this.ballImage = this.add.sprite(0, 0, 'ball')
    this.ball = this.matter.add.sprite(0, 0, 'ball', 0)
    this.ball.setAlpha(0)
    this.ball.setCircle(BALL_CONF.circleRadius)
    this.ball.setFriction(F)
    this.ball.setFrictionStatic(BALL_CONF.staticFriction)
    this.ball.setDensity(BALL_CONF.density)
    this.ball.setMass(BALL_CONF.mass)
    this.ball.setCollisionCategory(BALL_CONF.category)
    this.ball.setCollisionGroup(BALL_CONF.group)
    this.ball.setBounce(BALL_CONF.bounce)
    const body = this.ball?.body as MatterJS.BodyType
    body.label = 'ball'
    this.warpBall(START)
    // this.ball.setSensor(true)
  }

  createBoard = () => {
    const boardSVG = this.cache.xml.get('board')
    const board = this.matter.add.fromSVG(0, 0, boardSVG, 1, BOARD_CONF)
    this.matter.alignBody(board, 96, 290, Phaser.Display.Align.BOTTOM_CENTER)
    this.add.image(0, 2, 'board').setOrigin(0, 0)
    board.parts.forEach((p) => {
      p.label = 'board'
      p.friction = F
    })

    const refuelWarp = this.matter.add.circle(42, 125, 5, {
      isSensor: true,
      isStatic: true,
    })
    refuelWarp.label = 'refuel-warp'
  }

  createRefuelBoard = () => {
    const boardSVG = this.cache.xml.get('refuel-board')
    const board = this.matter.add.fromSVG(0, 0, boardSVG, 1, BOARD_CONF)
    this.matter.alignBody(board, -100, 288, Phaser.Display.Align.BOTTOM_CENTER)
    board.friction = F / 10
    this.add.image(-180, 144, 'refuel-board').setOrigin(0, 0)
    board.parts.forEach((p) => {
      p.label = 'board'
      p.friction = F
    })
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

  createLights = () => {
    const lights = LIGHTS.map((p) =>
      this.add.sprite(p.x, p.y, 'light', 0).setData('label', p.label),
    )

    const lights2 = new Array(8)
      .fill('')
      .map((p) => this.add.sprite(0, 0, 'light', 1))
    const lights3 = new Array(16)
      .fill('')
      .map((p) => this.add.sprite(0, 0, 'light', 1))

    const light = this.add.sprite(80, 200, 'light', 1)
    const circleLights = [light, ...lights2, ...lights3]
    // @ts-ignore
    circleLights.forEach((l, i) => {
      l.setDataEnabled()
      l.data.set('label', `circle-light-${i}`)
    })
    this.lightSprites = [...circleLights, ...lights]

    // circleLights.forEach((l, i) => {
    //   this.time.addEvent({
    //     repeat: -1,
    //     delay: 500 + i * 10,
    //     callback: () =>
    //       // @ts-ignore
    //       l.setFrame(i > 0 && l.frame.name === 0 ? 1 : 0),
    //   })
    // })
    Phaser.Actions.PlaceOnCircle(lights2, new Phaser.Geom.Circle(80, 200, 14))
    Phaser.Actions.PlaceOnCircle(lights3, new Phaser.Geom.Circle(80, 200, 28))
  }

  createPassToggles = () => {
    PASS_TOGGLES.forEach((p) => {
      const b = this.matter.add.circle(p.x, p.y, p.size, {
        isSensor: true,
        isStatic: true,
      })
      // @ts-ignore
      b.label = p.label
    })
  }

  createSpinners = () => {
    const spinners = SPINNERS.map((p, i) => {
      const sprite = this.add
        .sprite(p.x, p.y, 'spinner', 0)
        .setData('label', `spinner-${i}`)
        .setData('frame', 0)

      return sprite
    })
    this.spinners = spinners
  }

  createPost = () => {
    const conf = { isStatic: true, chamfer: { radius: 3 } }
    const posts = POSTS.map((p) =>
      this.matter.add.sprite(p.x, p.y, 'post', 0, conf),
    )
    posts.forEach((p) => {
      // @ts-ignore
      p.body.label = 'post'
    })
  }

  createSlingshot = (isLeft: boolean) => {
    const bounceSVG = this.cache.xml.get('bounce')
    const slingBase = this.matter.add.fromSVG(0, 0, bounceSVG, 1, BOARD_CONF)
    const sling = this.matter.add.rectangle(0, 0, 3, 25, {
      isStatic: true,
      angle: isLeft ? -0.48 : 0.44,
    }) as IBody

    sling.sprite = this.add
      .sprite(isLeft ? 34 : 125, 224, 'sling')
      .setFlipX(!isLeft)
      .setOrigin(isLeft ? 0 : 1, 0.5)

    if (!isLeft) this.matter.body.scale(slingBase, -1, 1)
    const a = Phaser.Display.Align.BOTTOM_CENTER
    this.matter.alignBody(slingBase, isLeft ? 43 : 121, 239, a)
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
    const flipper = this.matter.add.rectangle(x, y, 24, 3, FLIPPER_CONF)
    this.matter.add.worldConstraint(flipper, 0, 0.1, {
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
        .sprite(X - 4, Y + 3, 'flipper', 0)
        .setOrigin(0, 0.5)
    } else {
      this.rightLever = lever
      this.flipperImageRight = this.add
        .sprite(X - 4 + (FLIPPER_DIST + 8), Y + 3, 'flipper', 0)
        .setOrigin(1, 0.5)
        .setFlipX(true)
    }

    this.matter.add.constraint(flipper, lever, 0, 0.15, {
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
        this.matter.applyForceFromAngle(ball, 0.035, angle),
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
        this.matter.applyForceFromAngle(ball, 0.08, a),
      )
    } else if (checkBodies('ball', 'refuel-warp')) {
      this.warpBall(REFUEL_ZONE, true)
    } else if (checkBodies('ball', 'lever')) {
      //
    } else {
      if (other.label.includes('light')) {
        this.toggleLight(other.label)
      } else if (other.label.includes('spinner')) {
        this.spinners
          ?.find((l) => l.data.get('label') === other.label)
          ?.data.set('speed', ball.velocity.y * 4)
      } else {
        console.log(bodyA.label, bodyB.label)
      }
    }
  }

  toggleLight = (label: string) => {
    const light = this.lightSprites?.find((l) => l.data.get('label') === label)

    if (light) {
      // @ts-ignore
      light.setFrame(light.frame?.name === 0 ? 1 : 0)
    }
  }

  onBallLost = () => {
    const isBallLost = this.data.get('ball-lost')
    if (!this.ball?.body || isBallLost) return

    this.sound.play('ball-lost', { volume: 0.35, rate: 0.9 })
    this.data.set('ball-lost', true)
    this.time.delayedCall(DEBUG ? 1 : 1500, () => {
      this.data.set('ball-lost', false)
      this.warpBall(START)
      if (DEBUG_AUTO_FLIP) this.autoFlip()
    })

    if (this.message) this.message.text = 'Ball lost'
  }

  onDrainRefuel = () => {
    this.data.set('ball-lost', true)
    this.warpBall(REFUEL_WARP, true, () => {
      this.data.set('ball-lost', false)
    })
  }

  warpBall = (
    { x, y }: { x: number; y: number },
    forceCamera = false,
    onComplete?: () => void,
  ) => {
    const body = this.ball?.body as MatterJS.BodyType
    if (forceCamera) {
      const t = DEBUG ? 10 : 500
      body.gravityScale.y = 0
      this.fader?.fade(t)
      this.time.delayedCall(t, () => {
        this.matter.alignBody(body, x, y, CENTER)
        this.matter.setVelocity(body, 0, 0)
        this.matter.setAngularVelocity(body, 0)
        const cp = this.getCameraPosition()
        this.data.set('allowcamerapan', false)
        this.cameras.main.pan(cp.x, cp.y, 10, undefined, true, (c, p) => {
          if (p >= 1) this.data.set('allowcamerapan', true)
        })
      })
      this.time.delayedCall(t + 50, () => {
        this.fader?.fade(t)
        this.time.delayedCall(t + 500, () => {
          onComplete?.()
          body.gravityScale.y = 1
        })
      })
    } else {
      this.ball!.setToSleep()
      this.time.delayedCall(50, () => {
        this.ball!.setAwake()
      })
      this.matter.alignBody(body, x, y, CENTER)
      this.matter.setVelocity(body, 0, 0)
      this.matter.setAngularVelocity(body, 0)
    }
  }

  setupInput = () => {
    this.input.keyboard
      .addKey('Z')
      .on('down', this.onFlipLeftDown)
      .on('up', this.onFlipLeftUp)
    if (DEBUG) this.input.keyboard.addKey('R').on('down', this.onBallLost)

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
    this.ball?.setAwake()
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
    const body = this.ball?.body as MatterJS.BodyType
    const angle =
      direction === 'up'
        ? DegToRad(-90)
        : direction === 'left'
        ? DegToRad(180)
        : direction === 'right'
        ? DegToRad(0)
        : DegToRad(90)
    this.matter.applyForceFromAngle(body, 0.01, angle)
    this.cameras.main.shake(100, 0.02, true)
  }

  onShootStart = () => {
    this.sound.play('click', { volume: 0.5 })
    this.data.set('plungestart', this.time.now)
  }

  onShoot = () => {
    if (!this.ball?.body) return
    const body = this.ball?.body as MatterJS.BodyType

    const MAX = DEBUG ? 500 : 2000
    const value = Math.min(this.time.now - this.data.get('plungestart'), MAX)
    const force = value / (MAX * 8)
    if (force > 0.06) this.cameras.main.shake(100, force / 5, true)
    this.sound.play('plunger', { volume: force * 5 })
    if (this.ball.body.position.y > 260 && this.ball.body.position.x > 160)
      this.matter.applyForceFromAngle(body, force, DegToRad(-90))
  }
}
