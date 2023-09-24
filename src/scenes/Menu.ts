import Phaser from 'phaser'
import { Fader } from '../services/Fader'

export default class Menu extends Phaser.Scene {
  music?: Phaser.Sound.BaseSound
  fader?: Fader
  constructor() {
    super('MenuScene')
  }

  init(opts: any) {}

  create() {
    this.music = this.sound.add('menu', { volume: 0.3 })
    this.music.play()
    this.add.image(0, 0, 'menu').setOrigin(0, 0)
    const start = this.add
      .bitmapText(
        this.cameras.main.width / 2,
        134,
        'clarity',
        'Press Start',
        -8,
      )
      .setOrigin(0.5, 1)

    this.time.delayedCall(1500, () => {
      this.input.keyboard.addKey('Z').on('down', this.start)
      this.input.keyboard.addKey('Enter').on('down', this.start)
    })
    this.fader = new Fader(this, true)
    this.fader.fade(1500)
  }

  update() {
    this.fader?.update()
  }

  start = () => {
    this.fader?.fade(1500)
    this.tweens.add({
      targets: this.music,
      volume: 0,
      duration: 1500,
      onComplete: () => {
        this.scene.start('GameScene')
      },
    })

    this.sound.play('click')
  }
}
