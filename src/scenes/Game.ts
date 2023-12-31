import Phaser from 'phaser'
import * as constants from '../constants'
import { Fader } from '../services/Fader'
import BoardService from '../services/BoardService'
import LightService from '../services/LightService'
import FlipperService from '../services/FlipperService'
import UIService from '../services/UIService'
import BallService from '../services/BallService'

interface IBody extends MatterJS.BodyType {
  sprite: Phaser.GameObjects.Sprite
}

export default class Game extends Phaser.Scene {
  music?: Phaser.Sound.BaseSound
  lightService?: LightService
  boardService?: BoardService
  ballService?: BallService
  uiService?: UIService
  flipperService?: FlipperService
  fader?: Fader

  constructor() {
    super('GameScene')
  }

  create() {
    this.data.set('score', 0)
    this.data.set('balls', constants.DEBUG ? 99 : 4)
    this.data.set('rank', 0)
    this.data.set('requiredScore', constants.PLANET_SCORES[0])
    this.data.set('targetPlanet', 0)
    this.data.set('allowedTilts', 8)
    this.data.set('allowcamerapan', true)

    this.music = this.sound.add('game', { volume: 0.35 })
    this.music.play()

    this.boardService = new BoardService(this)
    this.flipperService = new FlipperService(this)
    this.lightService = new LightService(this)
    this.lightService.createLights()
    this.lightService.updateTravelLights()
    this.ballService = new BallService(this)
    this.uiService = new UIService(this)
    this.fader = new Fader(this, true)
    this.setupInput()

    this.time.delayedCall(5, () =>
      this.fader?.fade(constants.DEBUG ? 50 : 1500),
    )

    this.matter.set60Hz()
    this.matter.world.on('collisionstart', this.onCollisionStart)
    this.matter.world.on('collisionactive', this.onCollisionActive)
  }

  destroy() {
    this.matter.world.off('collisionstart', this.onCollisionStart)
    this.matter.world.off('collisionactive', this.onCollisionActive)

    this.boardService?.destroy()
    // this.flipperService?.destroy()
    this.lightService?.destroy()
    this.lightService?.destroy()
    this.lightService?.destroy()
    this.ballService?.destroy()
    this.uiService?.destroy()
    // this.fader?.destroy()
  }

  update() {
    this.fader?.update()
    if (!this.ballService!.ball?.body) return

    this.uiService?.update()
    this.lightService?.update()
    this.ballService?.update()
    this.updateTravelStatus()
    this.boardService?.update()
    this.flipperService?.update()

    if (this.data.values.allowedTilts < 8)
      this.data.values.allowedTilts += 0.003
  }

  gameOver = () => {
    this.fader?.fade(2000)
    this.matter.world.off('collisionstart', this.onCollisionStart)
    this.matter.world.off('collisionactive', this.onCollisionActive)

    this.tweens.add({
      targets: this.music,
      volume: 0,
      duration: 2000,
      onComplete: () => {
        this.boardService?.destroy()
        // this.flipperService?.destroy()
        this.lightService?.destroy()
        this.lightService?.destroy()
        this.lightService?.destroy()
        this.ballService?.destroy()
        this.uiService?.destroy()

        this.scene.start('MenuScene')
      },
    })
  }

  updateTravelStatus = () => {
    const index = constants.PLANET_SCORES.findIndex(
      (s) => this.data.values.requiredScore === s,
    )
    const totalPrev = constants.PLANET_SCORES[index - 1] ?? 0
    let pp =
      (this.data.values.score - totalPrev) /
      (this.data.values.requiredScore - totalPrev)
    let tp = this.data.values.targetPlanet
    if (tp && pp < tp) {
      const n = Math.floor(pp * 16) % 16

      // this.data.values.score += 5

      if (n !== this.data.values.lastplanetdecimal) {
        this.data.set('lastplanetdecimal', n)
        this.lightService?.updateTravelLights()
      }
    }

    if (this.data.values.score >= this.data.values.requiredScore) {
      this.data.values.requiredScore = constants.PLANET_SCORES[index + 1]
      this.uiService?.showMessage('hyperspace charged!')
      this.sound.play('secretHit', { volume: 0.5 })
      this.lightService?.hyperspaceArrow?.setFrame(1)
    }
  }

  onCollisionActive = (e: any, bodyA: IBody, bodyB: IBody) => {
    const checkBodies = getCheckBodies(bodyA, bodyB)
    const ball = bodyA.label == 'ball' ? bodyA : bodyB
    const other = ball === bodyA ? bodyB : bodyA
    if (!ball) return

    if (checkBodies('ball', 'refuel-warp')) {
      this.boardService!.onHitAwayRamp()
    } else if (checkBodies('ball', 'chute-sensor')) {
      this.boardService!.onHitChuteSensor()
    } else if (checkBodies('ball', 'hyperspace')) {
      this.boardService!.onHitHyperspace()
    } else if (other.label.includes('spinner')) {
      this.boardService?.onHitSpinner(other.label, ball.velocity.y)
    } else if (checkBodies('ball', 'secret')) {
      this.boardService!.onHitSecret()
    } else if (checkBodies('ball', 'wormhole')) {
      this.boardService!.onHitWormhole()
    } else if (
      checkBodies('ball', 'button') ||
      checkBodies('ball', 'diagonal-button')
    ) {
      this.boardService!.onHitButton(other)
    } else if (other.label.includes('spinner')) {
      this.boardService!.onHitSpinner(other.label, ball.velocity.y)
    }
  }

  onCollisionStart = (e: any, bodyA: IBody, bodyB: IBody) => {
    const checkBodies = getCheckBodies(bodyA, bodyB)
    const ball = bodyA.label == 'ball' ? bodyA : bodyB
    const other = ball === bodyA ? bodyB : bodyA
    if (!ball) return

    const isBoard =
      checkBodies('ball', 'flipper') ||
      checkBodies('ball', 'post') ||
      checkBodies('ball', 'board')

    if (isBoard) {
      this.boardService!.playDingSound(ball.speed)
    } else if (checkBodies('ball', 'refuel-warp')) {
      this.boardService!.onHitAwayRamp()
    } else if (checkBodies('ball', 'sling')) {
      this.boardService!.onHitSling(other.position.x < 80, other.sprite)
    } else if (checkBodies('ball', 'hyperspace')) {
      this.boardService!.onHitHyperspace()
    } else if (checkBodies('ball', 'chute-sensor')) {
      this.boardService!.onHitChuteSensor()
    } else if (checkBodies('ball', 'secret')) {
      this.boardService!.onHitSecret()
    } else if (checkBodies('ball', 'asteroid')) {
      this.boardService!.onHitAsteroid(ball.speed, other)
    } else if (checkBodies('ball', 'bumper')) {
      this.boardService!.onHitBumper(ball.speed, other.sprite)
    } else if (checkBodies('ball', 'wormhole')) {
      this.boardService!.onHitWormhole()
    } else if (checkBodies('ball', 'kick')) {
      this.boardService!.onHitKick()
    } else if (other.label.includes('light')) {
      this.lightService!.toggleLight(other.label)
    } else {
      console.log(bodyA.label, bodyB.label)
    }
  }

  earnScore = (key: string) => {
    let baseScore =
      constants.BASE_SCORE[key as keyof typeof constants.BASE_SCORE] ?? 0
    if (baseScore > 0) this.data.values.score += baseScore
  }

  setupInput = () => {
    const { onFlipLeftDown, onFlipLeftUp, onFlipRightDown, onFlipRightUp } =
      this.flipperService!
    const { resetBallDebug, onShoot, onShootStart, onTilt } = this.ballService!
    this.input.keyboard
      .addKey('Z')
      .on('down', onFlipLeftDown)
      .on('up', onFlipLeftUp)
    if (constants.DEBUG) {
      // this.input.keyboard.addKey('R').on('down', resetBallDebug)
      this.input.keyboard.addKey('Q').on('down', () => {
        this.ballService?.fireBall(-120, 0.085, 70, 190) // away mission
      })
      this.input.keyboard.addKey('W').on('down', () => {
        this.ballService?.fireBall(-66, 0.075, 70, 240) // hyperspace
      })
      this.input.keyboard.addKey('E').on('down', () => {
        this.ballService?.fireBall(96, 0.045, 5, 200) // chute
      })
      this.input.keyboard.addKey('R').on('down', () => {
        this.ballService?.fireBall(-90, 0.045, 70, 130) // button2
        // this.ballService?.fireBall(96, 0.015, 80, 40) // chute
      })
    }

    this.input.keyboard
      .addKey('right')
      .on('down', onFlipRightDown)
      .on('up', onFlipRightUp)
    this.input.keyboard.addKey('down').on('down', onShootStart)
    this.input.keyboard.addKey('down').on('up', onShoot)
    this.input.keyboard.addKey('space').on('down', () => onTilt('up'))
    this.input.keyboard.addKey('left').on('down', () => onTilt('left'))
    this.input.keyboard.addKey('x').on('down', () => onTilt('right'))
  }
}

const getCheckBodies = (bodyA: IBody, bodyB: IBody) => (a: string, b: string) =>
  (bodyA.label == a && bodyB.label == b) ||
  (bodyB.label == a && bodyA.label == b)
