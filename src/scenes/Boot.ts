import Phaser from 'phaser'
import { DEBUG } from '../constants'

export default class Boot extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload() {
    const progress = this.add.graphics()
    const { width, height } = this.sys.game.config

    this.load.on('progress', (value: number) => {
      progress.clear()
      progress.fillStyle(0xffffff, 1)
      progress.fillRect(0, +height / 2, +width * value, 60)
    })
    this.load.audio('click', 'assets/click.mp3')
    this.load.audio('ding', 'assets/ding.mp3')
    this.load.audio('plunger', 'assets/plunger.mp3')
    this.load.audio('sling', 'assets/sling.mp3')
    this.load.audio('menu', 'assets/menu.mp3')
    this.load.audio('sling', 'assets/sling.mp3')
    this.load.audio('plunger', 'assets/plunger.mp3')
    this.load.audio('bumper', 'assets/bumper.mp3')
    this.load.audio('game', 'assets/game.mp3')
    this.load.audio('missionComplete', 'assets/missionComplete.mp3')
    this.load.audio('hyperspaceCharged', 'assets/hyperspaceCharged.mp3')
    this.load.audio('secretHit', 'assets/secretHit.mp3')
    this.load.audio('button', 'assets/button.mp3')
    this.load.audio('kick-ball', 'assets/kick-ball.mp3')
    this.load.audio('tilt', 'assets/tilt.mp3')
    this.load.audio('launch', 'assets/launch.mp3')
    this.load.audio('ballSaved', 'assets/ballSaved.mp3')
    this.load.audio('wormhole', 'assets/wormhole.mp3')
    this.load.audio('flipper', 'assets/flipper.mp3')

    this.load.audio('asteroid-hit', 'assets/asteroid-hit.mp3')
    this.load.audio('asteroid-destroyed', 'assets/asteroid-destroyed.mp3')

    this.load.audio('ball-lost', 'assets/ball-lost.mp3')
    this.load.bitmapFont('clarity', 'assets/clarity.png', 'assets/clarity.xml')
    this.load.spritesheet('diagonal-arrow', 'assets/diagonal-arrow.png', {
      frameWidth: 6,
      frameHeight: 7,
    })
    this.load.spritesheet('arrow', 'assets/arrow.png', {
      frameWidth: 7,
      frameHeight: 5,
    })
    this.load.spritesheet('numbers', 'assets/numbers.png', {
      frameWidth: 3,
      frameHeight: 5,
    })
    this.load.spritesheet('return-door', 'assets/return-door.png', {
      frameWidth: 13,
      frameHeight: 8,
    })
    this.load.spritesheet('kicker', 'assets/kicker.png', {
      frameWidth: 2,
      frameHeight: 8,
    })
    this.load.spritesheet('ball', 'assets/ball.png', {
      frameWidth: 15,
      frameHeight: 15,
    })
    this.load.spritesheet('guy', 'assets/guy.png', {
      frameWidth: 118,
      frameHeight: 74,
    })
    this.load.image('sling', 'assets/sling.png')
    this.load.image('button', 'assets/button.png')
    this.load.image('asteroid', 'assets/asteroid.png')
    this.load.image('title', 'assets/title.png')
    this.load.image('diagonal-button', 'assets/diagonal-button.png')
    this.load.spritesheet('bumper', 'assets/bumper.png', {
      frameWidth: 18,
      frameHeight: 20,
    })
    this.load.spritesheet('light', 'assets/light.png', {
      frameWidth: 6,
      frameHeight: 6,
    })
    this.load.spritesheet('spinner', 'assets/spinner.png', {
      frameWidth: 17,
      frameHeight: 8,
    })
    this.load.spritesheet('post', 'assets/post.png', {
      frameWidth: 3,
      frameHeight: 14,
    })
    this.load.image('board', 'assets/board.png')
    this.load.image('board-top', 'assets/board-top.png')
    this.load.image('refuel-board', 'assets/refuel-board.png')
    this.load.spritesheet('flipper', 'assets/flipper.png', {
      frameWidth: 24,
      frameHeight: 23,
    })
    this.load.xml('board', 'assets/board.svg')
    this.load.xml('refuel-board', 'assets/refuel-board.svg')
    this.load.xml('bounce', 'assets/bounce.svg')
    this.load.xml('flipper', 'assets/flipper.svg')
    // this.sound.volume = 0

    this.load.on('complete', () => {
      progress.destroy()

      this.scene.start(DEBUG ? 'GameScene' : 'MenuScene')
    })
  }

  create() {}
}
