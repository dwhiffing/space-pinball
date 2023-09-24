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
  bumpers?: IBody[]

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
          this.scene.sound.play('click')
        }
      } else if (speed > 0) {
        spinner.data.set('speed', 0)
      }
    })
  }

  onHitKick = () => {
    this.scene.time.delayedCall(500, () => {
      this.scene.ballService?.applyForceToBall('up', 0.06)
      // @ts-ignore
      const outReturn = this.outReturns!.at(
        this.scene.ballService!.ball!.x < 80 ? 0 : 1,
      )
      this.scene.tweens.add({
        targets: outReturn,
        y: outReturn.y - 10,
        yoyo: true,
        duration: 60,
      })
    })
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
    board.parts.forEach((p) => {
      p.label = 'board'
      p.friction = constants.BASE_FRICTION
    })

    const refuelWarp = this.scene.matter.add.circle(42, 130, 5, {
      isSensor: true,
      isStatic: true,
    })
    refuelWarp.label = 'refuel-warp'

    this.outReturns = [
      this.scene.add.sprite(11, 273, 'kicker'),
      this.scene.add.sprite(149, 273, 'kicker'),
    ]
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
      -100,
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
    const sling = this.scene.matter.add.rectangle(0, 0, 3, 19, {
      isStatic: true,
      angle: isLeft ? -0.48 : 0.44,
    }) as IBody

    sling.sprite = this.scene.add
      .sprite(x, y, 'sling')
      .setFlipX(!isLeft)
      .setOrigin(isLeft ? 0 : 1, 0.5)
      .setAlpha(0)

    const a = Phaser.Display.Align.BOTTOM_CENTER
    this.scene.matter.alignBody(sling, isLeft ? x + 4 : x - 4, y + 11, a)
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
