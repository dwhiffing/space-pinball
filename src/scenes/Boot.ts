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
    this.load.bitmapFont('gem', 'assets/gem.png', 'assets/gem.xml')
    this.load.image('ball', 'assets/ball.png')
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
