import Phaser from 'phaser'

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
    this.load.audio('sling', 'assets/sling.mp3')
    this.load.audio('plunger', 'assets/plunger.mp3')
    this.load.audio('bumper', 'assets/bumper.mp3')
    this.load.audio('flipper', 'assets/flipper.mp3')
    this.load.bitmapFont('clarity', 'assets/clarity.png', 'assets/clarity.xml')
    this.load.spritesheet('ball', 'assets/ball.png', {
      frameWidth: 15,
      frameHeight: 15,
    })
    this.load.spritesheet('sling', 'assets/sling.png', {
      frameWidth: 17,
      frameHeight: 34,
    })
    this.load.spritesheet('bumper', 'assets/bumper.png', {
      frameWidth: 18,
      frameHeight: 18,
    })
    this.load.image('board', 'assets/board.png')
    this.load.spritesheet('flipper', 'assets/flipper.png', {
      frameWidth: 24,
      frameHeight: 23,
    })
    this.load.xml('board', 'assets/board.svg')
    this.load.xml('bounce', 'assets/bounce.svg')
    this.load.xml('flipper', 'assets/flipper.svg')

    this.load.on('complete', () => {
      progress.destroy()

      // this.scene.start('MenuScene')
      this.scene.start('GameScene')
    })
  }

  create() {}
}
