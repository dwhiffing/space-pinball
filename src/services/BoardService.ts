import { BodyType } from 'matter'
import Phaser from 'phaser'
import * as constants from '../constants'
import Game from '../scenes/Game'

interface IBody extends MatterJS.BodyType {
  sprite: Phaser.GameObjects.Sprite
}

export default class BoardService {
  scene: Game
  spinners?: Phaser.GameObjects.Sprite[]
  outReturns?: Phaser.GameObjects.Sprite[]
  plunger?: Phaser.GameObjects.Sprite
  button?: Phaser.Physics.Matter.Image
  diagonalButton?: Phaser.Physics.Matter.Image
  buttonCountText?: Phaser.GameObjects.Sprite
  diagonalButtonCountText?: Phaser.GameObjects.Sprite
  rightDoorSprite?: Phaser.GameObjects.Sprite
  leftDoorSprite?: Phaser.GameObjects.Sprite
  leftDoorBody?: BodyType
  rightDoorBody?: BodyType
  chuteDoor?: BodyType
  secretDoor?: BodyType
  bumpers?: IBody[]
  asteroids?: Phaser.GameObjects.Image[]

  constructor(scene: Game) {
    this.scene = scene
    this.createBoard()
    this.createRefuelBoard()
    this.createSlingshots()
    this.createPost()
    this.createSpinners()
    this.createPassToggles()

    this.createKick(10, 265)
    this.createKick(149, 265)
    this.createBumpers()
    this.createAsteroids()
    this.resetAsteroids(0, 0)
    this.createButtons()
    this.resetTable()

    this.scene.data.set('buttonHitCount', 0)
    this.scene.data.set('diagonalButtonHitCount', 0)

    this.scene.data.events.on(
      'changedata-buttonHitCount',
      this.updateButtonText,
    )
    this.scene.data.events.on(
      'changedata-diagonalButtonHitCount',
      this.updateDiagonalButtonText,
    )
  }

  destroy() {
    this.scene.data.events.off(
      'changedata-buttonHitCount',
      this.updateButtonText,
    )
    this.scene.data.events.off(
      'changedata-diagonalButtonHitCount',
      this.updateDiagonalButtonText,
    )
  }

  update() {
    this.updateSpinners()
    this.updateBumpers()
  }

  updateBumpers = () => {
    this.bumpers?.forEach((b) =>
      b.sprite.setPosition(b.position.x, b.position.y),
    )
  }

  updateButtonText = (_: any, v: number) => this.buttonCountText?.setFrame(v)

  updateDiagonalButtonText = (_: any, v: number) =>
    this.diagonalButtonCountText?.setFrame(v)

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
          this.scene.earnScore('spinner')

          this.scene.sound.play('click')
        }
      } else if (speed > 0) {
        spinner.data.set('speed', 0)
      }
    })
  }

  onHitKick = () => {
    this.scene.time.delayedCall(500, () => {
      this.scene.ballService?.applyForceToBall('up', 0.05)
      const isLeft = this.scene.ballService!.ball!.x < 80
      // @ts-ignore
      const outReturn = this.outReturns!.at(isLeft ? 0 : 1)
      this.scene.tweens.add({
        targets: outReturn,
        y: outReturn.y - 10,
        yoyo: true,
        duration: 60,
      })
      this.scene.time.delayedCall(100, () => {
        this.toggleReturn(isLeft, false)
      })
    })
  }

  toggleReturn = (isLeft: boolean, isOpen: boolean) => {
    const body = isLeft ? this.leftDoorBody : this.rightDoorBody
    const sprite = isLeft ? this.leftDoorSprite : this.rightDoorSprite
    body!.collisionFilter.group = isOpen ? 4 : 3
    body!.collisionFilter.mask = isOpen ? 4 : 2
    sprite?.setAlpha(isOpen ? 0 : 1)
  }

  onHitSling = (isLeft: boolean, sprite: Phaser.GameObjects.Sprite) => {
    const angle = isLeft ? DegToRad(-45) : DegToRad(215)
    sprite.setAlpha(1)
    this.scene.time.delayedCall(150, () => sprite.setAlpha(0))
    this.scene.time.delayedCall(10, () =>
      this.scene.matter.applyForceFromAngle(
        this.scene.ballService!.ball
          ?.body as Phaser.Types.Physics.Matter.MatterBody,
        0.035,
        angle,
      ),
    )

    this.scene.sound.play('sling', { volume: 0.2 })
    this.scene.earnScore('sling')
  }

  onHitAsteroid = (speed: number, asteroid: any) => {
    if (speed < 3) return

    asteroid.sprite.setTintFill(0xe0f8d0)
    this.scene.time.delayedCall(100, () => asteroid.sprite.clearTint())
    asteroid.sprite.data.values.health--

    this.scene.earnScore('asteroid')
    if (asteroid.sprite.data.values.health < 1) {
      this.scene.sound.play('asteroid-destroyed')
      this.scene.time.delayedCall(100, () => {
        asteroid.sprite.setAlpha(0)
        asteroid.collisionFilter.group = 4
        asteroid.collisionFilter.mask = 4

        const isComplete = this.asteroids?.every((a) => a.alpha === 0)
        if (isComplete) {
          this.scene.lightService?.awayArrow?.setFrame(0)
          this.scene.uiService?.showMessage('mission complete!')
          this.scene.sound.play('missionComplete', { volume: 0.5 })
          this.scene.data.values.rank++
          this.scene.data.values.score +=
            25000 * (this.scene.data.values.rank + 1)
        }
      })
    } else {
      this.scene.sound.play('asteroid-hit')
    }
  }

  onHitSecret = () => {
    const t = this.scene.data.get('secrettime')
    if ((t ? Math.abs(t - this.scene.time.now) : 9999) < 1000) return
    this.scene.data.set('secrettime', this.scene.time.now)
    this.scene.ballService?.holdBall(1500, () =>
      this.scene.ballService!.fireBall(90, 0.03),
    )
    this.scene.time.delayedCall(3000, () => {
      this.onCloseSecretDoor()
    })
    this.scene.earnScore('secret')
    this.scene.sound.play('secretHit', { volume: 0.5 })
  }

  onHitWormhole = () => {
    const t = this.scene.data.get('wormholetime')
    if ((t ? Math.abs(t - this.scene.time.now) : 9999) < 1000) return
    this.scene.data.set('wormholetime', this.scene.time.now)
    const a = -90 + Phaser.Math.RND.between(-8, 8)
    this.scene.ballService?.holdBall(1500, () =>
      this.scene.ballService!.fireBall(a, 0.04),
    )
    this.scene.earnScore('wormhole')
    this.scene.sound.play('wormhole', { volume: 0.5 })
  }

  onOpenSecretDoor = () => {
    this.scene.uiService?.showMessage('Secret opened!')
    this.scene.lightService?.secretArrow?.setFrame(1)
    this.secretDoor!.collisionFilter.group = 4
    this.secretDoor!.collisionFilter.mask = 4
  }

  onCloseSecretDoor = () => {
    this.scene.lightService?.secretArrow?.setFrame(0)
    this.secretDoor!.collisionFilter.group = 3
    this.secretDoor!.collisionFilter.mask = 2
  }

  onHitChuteSensor = () => {
    this.scene.data.set('ballstarttime', this.scene.time.now)
    this.chuteDoor!.collisionFilter.group = 3
    this.chuteDoor!.collisionFilter.mask = 2
  }

  resetChuteDoor = () => {
    this.chuteDoor!.collisionFilter.group = 4
    this.chuteDoor!.collisionFilter.mask = 4
  }

  resetTable = () => {
    this.resetChuteDoor()
    this.onCloseSecretDoor()
    this.toggleReturn(true, true)
    this.toggleReturn(false, true)
    this.scene.data.values.isBlocked = false
  }

  onHitHyperspace = () => {
    const t = this.scene.data.get('hyperspacetime')
    if ((t ? Math.abs(t - this.scene.time.now) : 9999) < 3000) return
    this.scene.data.set('hyperspacetime', this.scene.time.now)
    this.scene.ballService?.holdBall(1500, () =>
      this.scene.ballService!.fireBall(65, 0.03),
    )
    // @ts-ignore
    if (this.scene.lightService?.hyperspaceArrow?.frame.name === 1) {
      this.scene.lightService?.hyperspaceArrow?.setFrame(0)
      this.scene.uiService?.showMessage('mission opened!')
      this.scene.lightService?.awayArrow?.setFrame(1)
      const params = constants.ASTEROID_PARAMS[this.scene.data.values.rank ?? 0]
      this.resetAsteroids(params[0], params[1])
      this.scene.sound.play('hyperspaceCharged', { volume: 0.5 })
    } else {
      this.scene.sound.play('secretHit', { volume: 0.5 })
    }
    this.scene.earnScore('hyperspace')
  }

  onHitSpinner = (label: string, velocity: number) => {
    const spinner = this.spinners?.find(
      (l) => l.data.get('label') === label && (l.data.get('speed') ?? 0) < 0.5,
    )
    if (!spinner) return
    if (velocity < 0) {
      this.scene.ballService!.ballImage?.setData('boosted', 0.0055)
      this.scene.time.delayedCall(50, () =>
        this.scene.ballService!.ballImage?.setData('boosted', 0),
      )
    }

    spinner.data.set('speed', velocity * 4)
    this.scene.ballService!.applyForceToBall('up', 0.1)
  }

  onHitBumper = (speed: number, bumper: Phaser.GameObjects.Sprite) => {
    const last = this.scene.data.get('lastbumpertime')
    if (speed > 0.5 && (!last || Math.abs(last - this.scene.time.now) > 10)) {
      this.scene.data.set('lastbumpertime', this.scene.time.now)
      this.scene.sound.play('bumper', { volume: 0.2 })
    }

    bumper.setFrame(1)
    this.scene.time.delayedCall(150, () => bumper.setFrame(0))
    this.scene.earnScore('bumper')
  }

  onHitAwayRamp = () => {
    const t = this.scene.data.get('awayramptime')
    if ((t ? Math.abs(t - this.scene.time.now) : 9999) < 3000) return
    this.scene.data.set('awayramptime', this.scene.time.now)

    // @ts-ignore
    if (this.scene.lightService?.awayArrow?.frame.name === 1) {
      this.scene.ballService!.warpBall(constants.REFUEL_ZONE, true)
      this.scene.sound.play('launch')
    } else {
      this.scene.sound.play('click')
      this.scene.earnScore('awayRamp')
      this.scene.ballService?.holdBall(1500, () =>
        this.scene.ballService!.fireBall(45, 0.01),
      )
    }
  }

  playDingSound = (speed: number) => {
    const last = this.scene.data.get('lastbumpertime')
    this.scene.data.set('lastdingtime', this.scene.time.now)
    if (speed > 0.5 && (!last || Math.abs(last - this.scene.time.now) > 10)) {
      const volume = Math.min(speed / 160, 3)
      this.scene.sound.play('ding', { volume, rate: 2 })
    }
  }

  createBoard = () => {
    const boardSVG = this.scene.cache.xml.get('board')
    const board = this.scene.matter.add.fromSVG(
      0,
      0,
      boardSVG,
      1,
      constants.BOARD_CONF,
    )
    this.scene.matter.alignBody(
      board,
      96,
      290,
      Phaser.Display.Align.BOTTOM_CENTER,
    )
    this.scene.add.image(0, 2, 'board').setOrigin(0, 0)
    this.scene.add.image(0, 2, 'board-top').setOrigin(0, 0).setDepth(99)
    board.parts.forEach((p) => {
      p.label = 'board'
      p.friction = constants.BASE_FRICTION
    })

    const refuelWarp = this.scene.matter.add.circle(42, 130, 5, {
      isSensor: true,
      isStatic: true,
    })
    refuelWarp.label = 'refuel-warp'

    const hyperspaceSensor = this.scene.matter.add.circle(131, 100, 6, {
      isSensor: true,
      isStatic: true,
    })
    hyperspaceSensor.label = 'hyperspace'

    const chuteSennsor = this.scene.matter.add.circle(37, 32, 6, {
      isSensor: true,
      isStatic: true,
    })
    chuteSennsor.label = 'chute-sensor'

    const wormholeSensor = this.scene.matter.add.circle(32, 123, 4, {
      isSensor: true,
      isStatic: true,
    })
    wormholeSensor.label = 'wormhole'

    const secretSensor = this.scene.matter.add.circle(12, 12, 4, {
      isSensor: true,
      isStatic: true,
    })
    secretSensor.label = 'secret'

    this.outReturns = [
      this.scene.add.sprite(11, 273, 'kicker'),
      this.scene.add.sprite(149, 273, 'kicker'),
    ]

    this.plunger = this.scene.add.sprite(167, 273, 'kicker')

    this.rightDoorSprite = this.scene.add
      .sprite(148, 261, 'return-door', 0)
      .setFlipX(true)
      .setAlpha(0)

    this.leftDoorSprite = this.scene.add
      .sprite(11, 261, 'return-door', 0)
      .setAlpha(0)

    this.leftDoorBody = this.scene.matter.add.rectangle(10, 260, 13, 2, {
      isStatic: true,
      angle: 0.35,
      collisionFilter: { group: 4, mask: 4 },
    })

    this.rightDoorBody = this.scene.matter.add.rectangle(149, 260, 13, 2, {
      isStatic: true,
      angle: -0.35,
      collisionFilter: { group: 4, mask: 4 },
    })

    this.secretDoor = this.scene.matter.add.rectangle(10, 54, 3, 53, {
      angle: 0.45,
      isStatic: true,
    })

    this.chuteDoor = this.scene.matter.add.rectangle(48, 28, 3, 15, {
      angle: -0.65,
      isStatic: true,
      collisionFilter: { group: 4, mask: 4 },
    })
  }

  createRefuelBoard = () => {
    const boardSVG = this.scene.cache.xml.get('refuel-board')
    const board = this.scene.matter.add.fromSVG(
      0,
      0,
      boardSVG,
      1,
      constants.BOARD_CONF,
    )
    this.scene.matter.alignBody(
      board,
      -91,
      288,
      Phaser.Display.Align.BOTTOM_CENTER,
    )
    board.friction = constants.BASE_FRICTION / 10
    this.scene.add.image(-180, 144, 'refuel-board').setOrigin(0, 0)
    board.parts.forEach((p) => {
      p.label = 'board'
      p.friction = constants.BASE_FRICTION
    })
  }

  createButtons = () => {
    this.button = this.scene.matter.add.image(44, 71, 'button', 0, {
      isSensor: true,
      isStatic: true,
    })
    this.diagonalButton = this.scene.matter.add.image(
      61,
      79,
      'diagonal-button',
      0,
      { isSensor: true, isStatic: true },
    )
    //@ts-ignore
    this.button.body.label = 'button'
    //@ts-ignore
    this.diagonalButton.body.label = 'diagonal-button'

    this.buttonCountText = this.scene.add
      .sprite(49, 71, 'numbers', 0)
      .setDepth(99)
      .setTintFill(0x346856)
    this.diagonalButtonCountText = this.scene.add
      .sprite(58, 74, 'numbers', 0)
      .setDepth(99)
      .setTintFill(0x346856)
  }

  onHitButton = (_button: any) => {
    if (_button.label === 'button') {
      const t = this.button?.getData('hittime') ?? 0
      if (this.scene.time.now - t < 2000) return
      this.button?.setData('hittime', this.scene.time.now)
      this.scene.sound.play('button', { volume: 0.5 })
      this.scene.tweens.add({
        targets: this.button,
        x: 48,
        yoyo: true,
        duration: 250,
      })

      if (this.scene.data.values.buttonHitCount < 9)
        this.scene.data.values.buttonHitCount++
      if (this.scene.data.values.buttonHitCount % 3 === 0)
        this.onOpenSecretDoor()
    } else {
      const t = this.diagonalButton?.getData('hittime') ?? 0
      if (this.scene.time.now - t < 2000) return
      this.scene.sound.play('button', { volume: 0.5 })
      this.diagonalButton?.setData('hittime', this.scene.time.now)
      if (this.scene.data.values.diagonalButtonHitCount < 9)
        this.scene.data.values.diagonalButtonHitCount++
      if (this.scene.data.values.diagonalButtonHitCount % 3 === 0) {
        this.toggleReturn(true, true)
        this.toggleReturn(false, true)
      }

      this.scene.tweens.add({
        targets: this.diagonalButton,
        x: 58,
        y: 77,
        yoyo: true,
        duration: 250,
      })
    }
  }

  resetAsteroids = (count: number, health: number) => {
    let asteroids: Phaser.GameObjects.Image[] = this.asteroids!
    if (count === 5)
      asteroids = [
        ...this.asteroids!.slice(1, 4),
        ...this.asteroids!.slice(6, 8),
      ]
    if (count === 3)
      asteroids = [
        ...this.asteroids!.slice(2, 3),
        ...this.asteroids!.slice(6, 8),
      ]
    if (count === 7)
      asteroids = [
        ...this.asteroids!.slice(1, 4),
        ...this.asteroids!.slice(5, 9),
      ]
    this.asteroids?.forEach((asteroid) => {
      asteroid.setAlpha(0)
      asteroid.setData('health', 0)
      // @ts-ignore
      asteroid.physicsBody.collisionFilter.group = 4
      // @ts-ignore
      asteroid.physicsBody.collisionFilter.mask = 4
    })
    asteroids?.forEach((asteroid) => {
      if (health === 0) return
      asteroid.setAlpha(1)
      asteroid.setData('health', health ?? 3)
      // @ts-ignore
      asteroid.physicsBody.collisionFilter.group = 3
      // @ts-ignore
      asteroid.physicsBody.collisionFilter.mask = 2
    })
  }

  createAsteroids = () => {
    this.asteroids = new Array(9)
      .fill('')
      .map((b, i) =>
        this.createAsteroid(
          -150 + 24 * (i % 5) + (Math.floor(i / 5) === 0 ? 0 : 10),
          168 + Math.floor(i / 5) * 21,
        ),
      )
  }

  createAsteroid = (x: number, y: number) => {
    const circle = this.scene.matter.add.circle(x, y, 10, {
      restitution: 0.7,
      isStatic: true,
      collisionFilter: { group: 4, mask: 4 },
    })
    const sprite = this.scene.add.image(x, y, 'asteroid')
    circle.label = 'asteroid'
    //@ts-ignore
    sprite.physicsBody = circle
    sprite.setData('health', 3)
    //@ts-ignore
    circle.sprite = sprite
    sprite.setAlpha(0)

    return sprite
  }

  createBumpers = () => {
    this.bumpers = constants.BUMPERS.map((b) => this.createBumper(b.x, b.y))
  }

  createPassToggles = () => {
    constants.PASS_TOGGLES.forEach((p) => {
      const b = this.scene.matter.add.circle(p.x, p.y, p.size, {
        isSensor: true,
        isStatic: true,
      })
      // @ts-ignore
      b.label = p.label
    })
  }

  createSpinners = () => {
    const spinners = constants.SPINNERS.map((p, i) => {
      const sprite = this.scene.add
        .sprite(p.x, p.y, 'spinner', 0)
        .setData('label', `spinner-${i}`)
        .setData('frame', 0)
        .setDepth(90)

      return sprite
    })
    this.spinners = spinners
  }

  createPost = () => {
    const conf = { isStatic: true, chamfer: { radius: 3 } }
    const posts = constants.POSTS.map((p) =>
      this.scene.matter.add.sprite(p.x, p.y, 'post', 0, conf),
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
    const sling = this.scene.matter.add.rectangle(0, 0, 4, 19, {
      isStatic: true,
      angle: isLeft ? -0.48 : 0.44,
    }) as IBody

    sling.sprite = this.scene.add
      .sprite(x, y, 'sling')
      .setFlipX(!isLeft)
      .setOrigin(isLeft ? 0 : 1, 0.5)
      .setAlpha(0)

    const a = Phaser.Display.Align.BOTTOM_CENTER
    this.scene.matter.alignBody(sling, isLeft ? x + 5 : x - 5, y + 11, a)
    sling.label = 'sling'
  }

  createBumper = (x: number, y: number) => {
    const bump = this.scene.matter.add.circle(
      0,
      0,
      constants.BUMPER_SIZE,
      constants.BUMPER_CONF,
    ) as IBody
    const _bumperImage = this.scene.add.sprite(x, y, 'bumper')
    bump.sprite = _bumperImage
    const pointA = new Phaser.Math.Vector2(x, y)
    this.scene.matter.add.worldConstraint(bump, 0, 0.1, { pointA })
    return bump
  }

  createKick = (x: number, y: number) => {
    const bump = this.scene.matter.add.circle(
      0,
      0,
      2,
      constants.KICK_CONF,
    ) as IBody
    const pointA = new Phaser.Math.Vector2(x, y)
    this.scene.matter.add.worldConstraint(bump, 0, 0.5, { pointA })
  }
}

const DegToRad = Phaser.Math.DegToRad
const delta = 58
