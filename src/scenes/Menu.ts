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
    this.music = this.sound.add('menu', { volume: 0 })
    this.tweens.add({
      targets: this.music,
      volume: 0.3,
      duration: 1500,
    })
    this.music.play()
    this.add.rectangle(0, 0, 160, 144, 0x081820).setOrigin(0, 0)
    const title = this.add.image(80, 28, 'title').setOrigin(0.5, 0.5)
    const guy = this.add.sprite(84, 82, 'guy').setOrigin(0.5, 0.5)

    this.add.tween({
      targets: guy,
      y: guy.y - 3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: Phaser.Math.Easing.Quadratic.InOut,
    })

    this.time.addEvent({
      repeat: -1,
      callback: () => {
        guy.setFrame(1)
        this.time.delayedCall(250, () => guy.setFrame(0))
      },
      delay: 5000,
    })

    this.time.delayedCall(1500, () => {
      this.time.addEvent({
        repeat: -1,
        callback: () => {
          start.setAlpha(start.alpha === 1 ? 0 : 1)
        },
        delay: 500,
      })
    })

    const start = this.add
      .bitmapText(
        this.cameras.main.width / 2,
        136,
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
