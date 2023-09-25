import Phaser from 'phaser'
import * as constants from '../constants'
import Game from '../scenes/Game'

interface IBody extends MatterJS.BodyType {
  sprite: Phaser.GameObjects.Sprite
}
const CENTER = Phaser.Display.Align.CENTER

export default class BallService {
  scene: Game
  ball?: Phaser.Physics.Matter.Sprite
  ballImage?: Phaser.GameObjects.Sprite
  shootTween?: Phaser.Tweens.Tween

  constructor(scene: Game) {
    this.scene = scene
    this.createBall()
    this.scene.matter.world.on('beforeupdate', this.checkBallSpeed)
  }

  destroy() {
    this.scene.matter.world.off('beforeupdate', this.checkBallSpeed)
  }

  update() {
    const body = this.ball?.body as MatterJS.BodyType

    if (
      !this.scene.data.get('ball-lost') &&
      body.position.y > this.scene.cameras.main.height * 2 + 40
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

  createBall = () => {
    this.ballImage = this.scene.add.sprite(0, 0, 'ball')
    this.ball = this.scene.matter.add.sprite(0, 0, 'ball', 0)
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

  onTilt = (direction: string) => {
    if (this.scene.data.values.isBlocked) return

    if (this.scene.data.values.allowedTilts > 0) {
      this.applyForceToBall(direction, 0.01)
      this.scene.cameras.main.shake(100, 0.02, true)
      this.scene.data.values.allowedTilts--
    } else {
      this.scene.uiService?.showMessage('Tilt!')
      this.scene.sound.play('tilt', { volume: 0.5 })
      this.scene.data.values.isBlocked = true
    }
  }

  checkBallSpeed = () => {
    let maxSpeed = 11
    const boost = this.ballImage?.getData('boosted') ?? 0
    if (boost > 0) this.applyForceToBall('up', boost)
    const body = this.ball?.body as MatterJS.BodyType
    if (body.velocity.x > maxSpeed) {
      this.scene.matter.setVelocity(body, maxSpeed, body.velocity.y)
    }

    if (body.velocity.x < -maxSpeed) {
      this.scene.matter.setVelocity(body, -maxSpeed, body.velocity.y)
    }

    if (body.velocity.y > maxSpeed) {
      this.scene.matter.setVelocity(body, body.velocity.x, maxSpeed)
    }

    if (body.velocity.y < -maxSpeed) {
      this.scene.matter.setVelocity(body, body.velocity.x, -maxSpeed)
    }
  }

  onDrainRefuel = () => {
    this.scene.data.set('ball-lost', true)
    this.warpBall(constants.REFUEL_WARP, true, () => {
      this.scene.data.set('ball-lost', false)
    })
  }

  fireBall = (angle: number, force: number, x?: number, y?: number) => {
    if (x && y) this.warpBall({ x, y })
    const body = this.ball?.body as MatterJS.BodyType
    this.scene.sound.play('kick-ball', { volume: 0.5 })

    this.scene.matter.applyForceFromAngle(body, force, DegToRad(angle))
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
      this.scene.fader?.fade(t)
      this.scene.time.delayedCall(t, () => {
        this.scene.matter.alignBody(body, x, y, CENTER)
        this.scene.matter.setVelocity(body, 0, 0)
        this.scene.matter.setAngularVelocity(body, 0)
        const cp = this.scene.uiService!.getCameraPosition()
        this.scene.data.set('allowcamerapan', false)
        this.scene.cameras.main.pan(cp.x, cp.y, 10, undefined, true, (c, p) => {
          if (p >= 1) this.scene.data.set('allowcamerapan', true)
        })
      })
      this.scene.time.delayedCall(t + 50, () => {
        this.scene.fader?.fade(t)
        this.scene.time.delayedCall(t + 500, () => {
          onComplete?.()
          body.gravityScale.y = 1
        })
      })
    } else {
      this.ball!.setToSleep()
      this.scene.time.delayedCall(50, () => {
        this.ball!.setAwake()
      })
      this.scene.matter.alignBody(body, x, y, CENTER)
      this.scene.matter.setVelocity(body, 0, 0)
      this.scene.matter.setAngularVelocity(body, 0)
    }
  }

  holdBall = (duration: number, onComplete: () => void) => {
    this.ball!.setToSleep()
    this.scene.time.delayedCall(duration, () => {
      this.ball!.setAwake()
      onComplete()
    })
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

    this.scene.matter.applyForceFromAngle(body, strength, angle)
  }

  resetBall = () => {
    if (this.scene.data.values.balls > 0) {
      this.scene.data.set('ball-lost', false)
      this.warpBall(constants.BALL_START)
      this.scene.boardService?.resetTable()
    } else {
      this.scene.gameOver()
    }
  }

  resetBallDebug = () => {
    this.scene.data.set('ball-lost', false)
    this.warpBall(constants.BALL_START)

    if (constants.DEBUG) {
      this.scene.time.delayedCall(500, () => {
        // this.fireBall(-90, 0.045, 70, 130) // button2
        // this.fireBall(-120, 0.085, 70, 190) // away mission
        // this.fireBall(-66, 0.075, 70, 240) // hyperspace
        // this.fireBall(-96, 0.045, 5, 110) // chute
        // this.fireBall(-90, 0.1, 180, 144) // chute2
        // this.fireBall(-90, 0.025, 5, 110) // spinner
        // this.fireBall(-70, 0.045, 20, 110) // button
        // this.fireBall(-100, 0.075, 30, 190) // secret hole
        // this.fireBall(-0, 0.025, 12, 60)// wormhole
      })
    }
  }

  onBallLost = () => {
    const isBallLost = this.scene.data.get('ball-lost')
    if (!this.ball?.body || isBallLost) return

    const diff = this.scene.time.now - this.scene.data.values.ballstarttime

    this.scene.data.set('ball-lost', true)
    this.scene.time.delayedCall(constants.DEBUG ? 1 : 1500, this.resetBall)
    if (diff < 10000) {
      this.scene.sound.play('ballSaved', { volume: 0.35 })
      this.scene.uiService!.showMessage('Ball saved!')
      // TODO: ball saved sound
    } else {
      this.scene.sound.play('ball-lost', { volume: 0.35, rate: 0.9 })
      this.scene.uiService!.showMessage('Ball lost')
      this.scene.data.values.balls--
    }
  }

  onShootStart = () => {
    if (this.scene.data.values.isBlocked) return
    this.scene.sound.play('click', { volume: 0.5 })
    this.scene.data.set('plungestart', this.scene.time.now)
    const r = this.scene.time.delayedCall(
      constants.PLUNGE_MAX + 1000,
      this.onShoot,
    )
    this.scene.data.set('plungetimer', r)

    this.shootTween = this.scene.tweens.add({
      targets: this.scene.boardService!.plunger,
      y: 280,
      duration: constants.PLUNGE_MAX,
    })
  }

  onShoot = () => {
    if (this.scene.data.values.isBlocked) return
    if (!this.ball?.body) return
    const body = this.ball?.body as MatterJS.BodyType
    if (!this.scene.data.get('plungestart')) return
    this.scene.data.get('plungetimer')?.destroy()
    const value = Math.min(
      this.scene.time.now - this.scene.data.get('plungestart'),
      constants.PLUNGE_MAX,
    )
    this.scene.data.set('plungestart', undefined)
    const force = value / (constants.PLUNGE_MAX * 8)
    if (force > 0.06) this.scene.cameras.main.shake(100, force / 5, true)
    this.scene.sound.play('plunger', { volume: force * 5 })
    if (this.ball.body.position.y > 260 && this.ball.body.position.x > 160)
      this.scene.matter.applyForceFromAngle(body, force, DegToRad(-90))

    this.shootTween?.stop()
    this.scene.tweens.add({
      targets: this.scene.boardService!.plunger,
      y: 263,
      duration: 50,
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.scene.boardService!.plunger,
          y: 273,
          duration: 50,
        })
      },
    })
  }
}
const DegToRad = Phaser.Math.DegToRad
