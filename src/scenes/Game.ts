import Phaser from 'phaser'
import * as constants from '../constants'
import { Fader } from '../services/Fader'

const CENTER = Phaser.Display.Align.CENTER

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
  scoreText?: Phaser.GameObjects.BitmapText
  ballText?: Phaser.GameObjects.BitmapText
  flipperImageLeft?: Phaser.GameObjects.Sprite
  flipperImageRight?: Phaser.GameObjects.Sprite
  leftTween?: { x: number }
  rightTween?: { x: number }

  constructor() {
    super('GameScene')
  }

  create() {
    this.data.set('score', 0)
    this.data.set('balls', 3)
    this.data.set('requiredScore', constants.PLANET_SCORES[0])
    this.data.set('targetPlanet', 0)
    this.data.set('allowcamerapan', true)

    this.matter.set60Hz()
    this.createBoard()
    this.createRefuelBoard()
    this.createSlingshots()
    this.createFlipper(true)
    this.createPost()
    this.createSpinners()
    this.createPassToggles()
    this.createLights()
    this.createFlipper(false)

    this.createKick(10, 265)
    this.createKick(149, 265)
    this.createBall()
    this.createBumpers()
    this.createUI()
    this.setupInput()
    if (constants.DEBUG_AUTO_FLIP) {
      this.time.delayedCall(1, () => this.autoFlip())
    }
    this.fader = new Fader(this, true)
    this.time.delayedCall(5, () => {
      this.fader?.fade(constants.DEBUG ? 50 : 1500)
    })

    this.data.events.on('changedata-lightstate', this.changeLightData)
    this.data.events.on('changedata-score', this.resetUI)
    this.matter.world.on('collisionstart', this.onCollisionStart)
    this.matter.world.on('collisionactive', this.onCollisionActive)

    this.data.set('lightstate', constants.LIGHT_STATE)
    this.data.set('lightstate', constants.LIGHT_STATE)

    this.updateTravelLights()
    this.resetUI()

    this.matter.world.on('beforeupdate', this.checkBallSpeed)
  }

  update() {
    this.fader?.update()
    if (!this.ball?.body) return

    this.checkCameraPan()
    this.updateBall()
    this.updateLights()
    this.updateTravelStatus()
    this.updateSpinners()
  }

  autoFlip = (_target = constants.AUTOFLIP_TARGET) => {
    if (!this.ball?.body) return
    const body = this.ball?.body as MatterJS.BodyType
    const direction = this.ball.body.position.x < 80 ? 0 : 1
    const REFUEL = direction === 0 ? 68 : 90
    const ORBIT = direction === 0 ? 71 : 88
    const CENTER = direction === 0 ? 64 : 99
    const SIDE = direction === 0 ? 72 : 89.5
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

  updateBumpers = () => {
    this.bumpers?.forEach((b) =>
      b.sprite.setPosition(b.position.x, b.position.y),
    )
  }

  updateBall = () => {
    const body = this.ball?.body as MatterJS.BodyType

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
  }

  updateAutoflip = () => {
    const body = this.ball?.body as MatterJS.BodyType
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
  }

  checkBallSpeed = () => {
    let maxSpeed = 11
    const boost = this.ballImage?.getData('boosted') ?? 0
    if (boost > 0) this.applyForceToBall('up', boost)
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

  checkCameraPan = () => {
    const cameraPos = this.getCameraPosition()
    const allowPan = this.data.get('allowcamerapan')

    if (
      allowPan &&
      (this.cameras.main.x !== cameraPos.x ||
        this.cameras.main.y !== cameraPos.y)
    ) {
      this.cameras.main.pan(cameraPos.x, cameraPos.y, 120, undefined, true)
    }
  }

  updateLights = () => {
    Object.entries(this.data.get('lightstate')).map(([k, vs]) => {
      ;(vs as number[]).forEach((value, index) => {
        const light = this.lightSprites?.find(
          (l) => l.data.get('label') === `${k}:${index}`,
        )
        const freq = 1000

        if (value === 2)
          light?.setFrame(this.time.now % freq > freq / 2 ? 1 : 0)
      })
    })
  }

  updateSpinners = () => {
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

  gameOver = () => {
    this.fader?.fade(2000)
    this.time.delayedCall(2000, () => {
      this.scene.start('MenuScene')
    })
  }

  updateTravelStatus = () => {
    let pp = this.data.values.score / this.data.values.requiredScore
    let tp = this.data.values.targetPlanet
    if (tp && pp < tp) {
      const n = Math.floor(pp * 16) % 16

      // TODO need to increase required score when achieved amount
      // this.data.values.score += 5
      pp = this.data.values.score / this.data.values.requiredScore
      if (n !== this.data.values.lastplanetdecimal) {
        this.data.set('lastplanetdecimal', n)
        this.updateTravelLights()
      }
    }
  }

  updateTravelLights = () => {
    let pp = this.data.values.score / this.data.values.requiredScore
    const ls = this.data.values.lightstate
    const n = (pp * 16) % 16
    this.data.values.targetPlanet++
    ls['inner-circle-light'] = ls['inner-circle-light'].map(
      (_: any, i: number) => (Math.floor(pp) === i ? 2 : i > pp ? 0 : 1),
    )
    ls['outer-circle-light'] = ls['outer-circle-light'].map(
      (_: any, i: number) => (Math.floor(n) === i ? 2 : i > n ? 0 : 1),
    )
    this.data.set('lightstate', ls)
  }

  changeLightData = () => {
    const state = (this.data.get('lightstate') ?? {}) as Record<
      string,
      number[]
    >
    Object.entries(state).map(([k, vs]) => {
      vs.forEach((value, index) => {
        this.lightSprites
          ?.find((l) => l.data.get('label') === `${k}:${index}`)
          ?.setFrame(value ? 1 : 0)
      })
    })
  }

  createBall = () => {
    this.ballImage = this.add.sprite(0, 0, 'ball')
    this.ball = this.matter.add.sprite(0, 0, 'ball', 0)
    this.ball.setAlpha(0)
    this.ball.setCircle(constants.BALL_CONF.circleRadius)
    this.ball.setFriction(constants.BASE_FRICTION)
    this.ball.setFrictionStatic(constants.BALL_CONF.staticFriction)
    this.ball.setDensity(constants.BALL_CONF.density)
    this.ball.setMass(constants.BALL_CONF.mass)
    this.ball.setCollisionCategory(constants.BALL_CONF.category)
    this.ball.setCollisionGroup(constants.BALL_CONF.group)
    this.ball.setBounce(constants.BALL_CONF.bounce)
    const body = this.ball?.body as MatterJS.BodyType
    body.label = 'ball'
    this.resetBall()
    // this.ball.setSensor(true)
  }

  resetBall = () => {
    if (this.data.values.balls > 0) {
      this.data.set('ball-lost', false)
      this.data.values.balls--
      this.warpBall(constants.BALL_START)
      if (constants.DEBUG_AUTO_FLIP) this.autoFlip()
    } else {
      this.gameOver()
    }
  }

  createBoard = () => {
    const boardSVG = this.cache.xml.get('board')
    const board = this.matter.add.fromSVG(
      0,
      0,
      boardSVG,
      1,
      constants.BOARD_CONF,
    )
    this.matter.alignBody(board, 96, 290, Phaser.Display.Align.BOTTOM_CENTER)
    this.add.image(0, 2, 'board').setOrigin(0, 0)
    board.parts.forEach((p) => {
      p.label = 'board'
      p.friction = constants.BASE_FRICTION
    })

    const refuelWarp = this.matter.add.circle(42, 130, 5, {
      isSensor: true,
      isStatic: true,
    })
    refuelWarp.label = 'refuel-warp'
  }

  createRefuelBoard = () => {
    const boardSVG = this.cache.xml.get('refuel-board')
    const board = this.matter.add.fromSVG(
      0,
      0,
      boardSVG,
      1,
      constants.BOARD_CONF,
    )
    this.matter.alignBody(board, -100, 288, Phaser.Display.Align.BOTTOM_CENTER)
    board.friction = constants.BASE_FRICTION / 10
    this.add.image(-180, 144, 'refuel-board').setOrigin(0, 0)
    board.parts.forEach((p) => {
      p.label = 'board'
      p.friction = constants.BASE_FRICTION
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
    this.scoreText = this.add
      .bitmapText(160, 145, 'clarity', '', -8)
      .setScrollFactor(0)
      .setOrigin(1, 1)
    this.ballText = this.add
      .bitmapText(1, 145, 'clarity', '', -8)
      .setScrollFactor(0)
      .setOrigin(0, 1)
  }

  createBumpers = () => {
    this.bumpers = constants.BUMPERS.map((b) => this.createBumper(b.x, b.y))
  }

  createLights = () => {
    const lights = constants.LIGHTS.map((p) =>
      this.add.sprite(p.x, p.y, 'light', 0).setData('label', p.label),
    )

    const lights2 = new Array(8)
      .fill('')
      .map((p) => this.add.sprite(0, 0, 'light', 0))
    const lights3 = new Array(16)
      .fill('')
      .map((p) => this.add.sprite(0, 0, 'light', 0))

    const light = this.add
      .sprite(80, 200, 'light', 0)
      .setData('label', 'center-light')
    const circleLights = [light, ...lights2, ...lights3]
    // @ts-ignore
    lights2.forEach((l, i) => {
      l.setDataEnabled()
      l.data.set('label', `inner-circle-light:${i}`)
    })
    lights3.forEach((l, i) => {
      l.setDataEnabled()
      l.data.set('label', `outer-circle-light:${i}`)
    })
    this.lightSprites = [...circleLights, ...lights]

    Phaser.Actions.PlaceOnCircle(
      lights2,
      new Phaser.Geom.Circle(80, 200, 14),
      -1.57,
      4.71,
    )
    Phaser.Actions.PlaceOnCircle(
      lights3,
      new Phaser.Geom.Circle(80, 200, 28),
      -1.57,
      4.71,
    )
  }

  createPassToggles = () => {
    constants.PASS_TOGGLES.forEach((p) => {
      const b = this.matter.add.circle(p.x, p.y, p.size, {
        isSensor: true,
        isStatic: true,
      })
      // @ts-ignore
      b.label = p.label
    })
  }

  createSpinners = () => {
    const spinners = constants.SPINNERS.map((p, i) => {
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
    const posts = constants.POSTS.map((p) =>
      this.matter.add.sprite(p.x, p.y, 'post', 0, conf),
    )
    posts.forEach((p) => {
      // @ts-ignore
      p.body.label = 'post'
    })
  }

  createSlingshots = () => {
    this.createSlingshot(40, 224, true)
    this.createSlingshot(119, 224, false)

    this.createSlingshot(48, 128, true)
    this.createSlingshot(118, 119, false)
  }

  createSlingshot = (x: number, y: number, isLeft: boolean) => {
    const sling = this.matter.add.rectangle(0, 0, 3, 19, {
      isStatic: true,
      angle: isLeft ? -0.48 : 0.44,
    }) as IBody

    sling.sprite = this.add
      .sprite(x, y, 'sling')
      .setFlipX(!isLeft)
      .setOrigin(isLeft ? 0 : 1, 0.5)
      .setAlpha(0)

    const a = Phaser.Display.Align.BOTTOM_CENTER
    this.matter.alignBody(sling, isLeft ? x + 4 : x - 4, y + 11, a)
    sling.label = 'sling'
  }

  createBumper = (x: number, y: number) => {
    const bump = this.matter.add.circle(
      0,
      0,
      constants.BUMPER_SIZE,
      constants.BUMPER_CONF,
    ) as IBody
    const _bumperImage = this.add.sprite(x, y, 'bumper')
    bump.sprite = _bumperImage
    const pointA = new Phaser.Math.Vector2(x, y)
    this.matter.add.worldConstraint(bump, 0, 0.1, { pointA })
    return bump
  }

  createKick = (x: number, y: number) => {
    const bump = this.matter.add.circle(0, 0, 2, constants.KICK_CONF) as IBody
    const pointA = new Phaser.Math.Vector2(x, y)
    this.matter.add.worldConstraint(bump, 0, 0.5, { pointA })
  }

  createFlipper = (isLeft: boolean) => {
    const x = FLIPPER_X + (isLeft ? 0 : FLIPPER_DIST)
    const y = FLIPPER_Y
    if (isLeft) {
      this.leftTween = { x: MINL }
    } else {
      this.rightTween = { x: MINR }
    }
    const flipper = this.matter.add.rectangle(
      x,
      y,
      25,
      3,
      constants.FLIPPER_CONF,
    )
    this.matter.add.worldConstraint(flipper, 0, 0.1, {
      pointA: new Phaser.Math.Vector2(x, y),
      pointB: new Phaser.Math.Vector2(FLIPPER_WIDTH, 0),
    })
    const v = (isLeft ? this.leftTween : this.rightTween)!.x
    const _x = x - Math.cos(v) * FLIPPER_LEVEL
    const _y = y - Math.sin(v) * FLIPPER_LEVEL
    const lever = this.matter.add.rectangle(_x, _y, 1, 1, constants.LEVER_CONF)
    lever.label = 'lever'
    if (isLeft) {
      this.leftLever = lever
      this.flipperImageLeft = this.add
        .sprite(FLIPPER_X - 4, FLIPPER_Y + 3, 'flipper', 0)
        .setOrigin(0, 0.5)
    } else {
      this.rightLever = lever
      this.flipperImageRight = this.add
        .sprite(FLIPPER_X - 4 + (FLIPPER_DIST + 8), FLIPPER_Y + 3, 'flipper', 0)
        .setOrigin(1, 0.5)
        .setFlipX(true)
    }

    this.matter.add.constraint(flipper, lever, 0, 0.15, {
      pointA: new Phaser.Math.Vector2(FLIPPER_WIDTH + FLIPPER_LEVEL, 0),
      pointB: new Phaser.Math.Vector2(),
    })
  }

  onCollisionActive = (event: any, bodyA: IBody, bodyB: IBody) => {
    const checkBodies = (a: string, b: string) =>
      (bodyA.label == a && bodyB.label == b) ||
      (bodyB.label == a && bodyA.label == b)
    const ball = bodyA.label == 'ball' ? bodyA : bodyB
    const other = ball === bodyA ? bodyB : bodyA
    if (!ball) return
    if (checkBodies('ball', 'refuel-warp')) {
      this.warpBall(constants.REFUEL_ZONE, true)
    } else if (other.label.includes('spinner')) {
      const spinner = this.spinners?.find(
        (l) =>
          l.data.get('label') === other.label &&
          (l.data.get('speed') ?? 0) < 0.5,
      )
      if (spinner) {
        if (ball.velocity.y < 0) {
          this.ballImage?.setData('boosted', 0.0055)
          this.time.delayedCall(50, () => this.ballImage?.setData('boosted', 0))
        }

        spinner.data.set('speed', ball.velocity.y * 4)
        this.applyForceToBall('up', 0.1)
      }
    }
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
      other.sprite.setAlpha(1)
      this.time.delayedCall(150, () => other.sprite.setAlpha(0))
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
    } else if (checkBodies('ball', 'lever')) {
      //
    } else {
      if (other.label.includes('light')) {
        this.toggleLight(other.label)
      } else {
        console.log(bodyA.label, bodyB.label)
      }
    }
  }

  toggleLight = (label: string) => {
    const [k, i] = label.split(':')
    const state = this.data.get('lightstate')
    state[k][i] = state[k][i] === 0 ? 1 : 0
    this.data.set('lightstate', state)
  }

  flipLights = (isLeft: boolean) => {
    const state = this.data.get('lightstate') as Record<string, number[]>
    const d = isLeft ? -1 : 1
    Object.entries(state).forEach(([k, v]) => {
      if (!k.match(/base|post/)) return
      const s = state[k].concat([])
      state[k] = s.map((_, i) => s[wrap(i + d, 0, s.length)])
    })
    this.data.set('lightstate', state)
  }

  onBallLost = () => {
    const isBallLost = this.data.get('ball-lost')
    if (!this.ball?.body || isBallLost) return

    this.sound.play('ball-lost', { volume: 0.35, rate: 0.9 })
    this.data.set('ball-lost', true)
    this.time.delayedCall(constants.DEBUG ? 1 : 1500, this.resetBall)
    this.showMessage('Ball lost')
  }

  showMessage = (m: string, duration = 3000) => {
    if (!this.message) return
    this.message.text = m

    this.message.setAlpha(1)
    this.ballText?.setAlpha(0)
    this.scoreText?.setAlpha(0)
    this.message.setData('activetime', this.time.now + duration)
    this.time.delayedCall(duration, this.resetUI)
  }

  resetUI = () => {
    if (!this.ballText || !this.message || !this.scoreText) return
    if (
      this.message.getData('activetime') &&
      this.message.getData('activetime') > this.time.now
    )
      return

    const { score, balls, rank } = this.data.values
    this.message.setAlpha(0)
    this.ballText.setAlpha(1)
    this.scoreText.setAlpha(1)
    this.ballText.text = `B: ${balls ?? 3} R: ${rank ?? 0}`
    this.scoreText.text = `${score}`
  }

  onDrainRefuel = () => {
    this.data.set('ball-lost', true)
    this.warpBall(constants.REFUEL_WARP, true, () => {
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
      const t = constants.DEBUG ? 10 : 500
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
    if (constants.DEBUG)
      this.input.keyboard.addKey('R').on('down', this.onBallLost)

    this.input.keyboard
      .addKey('right')
      .on('down', this.onFlipRightDown)
      .on('up', this.onFlipRightUp)

    this.input.keyboard.addKey('down').on('down', this.onShootStart)
    this.input.keyboard.addKey('down').on('up', this.onShoot)
    this.input.keyboard.addKey('space').on('down', () => this.onTilt('up'))
    this.input.keyboard.addKey('left').on('down', () => this.onTilt('left'))
    this.input.keyboard
      .addKey('FLIPPER_X')
      .on('down', () => this.onTilt('right'))
  }

  onFlip = (isLeft?: boolean, isDown?: boolean) => {
    if (isDown) {
      this.sound.play('flipper', { volume: 0.1, rate: 0.5 })
      this.flipLights(!!isLeft)
    }
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

  onTilt = (direction: string) => {
    this.applyForceToBall(direction, 0.01)
    this.cameras.main.shake(100, 0.02, true)
  }

  applyForceToBall = (direction: string, strength: number) => {
    const body = this.ball?.body as MatterJS.BodyType
    const angle =
      direction === 'up'
        ? DegToRad(-90)
        : direction === 'left'
        ? DegToRad(180)
        : direction === 'right'
        ? DegToRad(0)
        : DegToRad(90)

    this.matter.applyForceFromAngle(body, strength, angle)
  }

  onShootStart = () => {
    this.sound.play('click', { volume: 0.5 })
    this.data.set('plungestart', this.time.now)
  }

  onShoot = () => {
    if (!this.ball?.body) return
    const body = this.ball?.body as MatterJS.BodyType

    const MAX = constants.DEBUG ? 500 : 2000
    const value = Math.min(this.time.now - this.data.get('plungestart'), MAX)
    const force = value / (MAX * 8)
    if (force > 0.06) this.cameras.main.shake(100, force / 5, true)
    this.sound.play('plunger', { volume: force * 5 })
    if (this.ball.body.position.y > 260 && this.ball.body.position.x > 160)
      this.matter.applyForceFromAngle(body, force, DegToRad(-90))
  }
}

const wrap = function (n: number, min: number, max: number) {
  var r = max - min
  return min + ((((n - min) % r) + r) % r)
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
