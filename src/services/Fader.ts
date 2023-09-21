import { shuffle } from 'lodash'
import Phaser from 'phaser'

export class Fader {
  scene: Phaser.Scene
  graphics: Phaser.GameObjects.Graphics
  num: number
  active: boolean
  inverted: boolean
  pixels: number[][]
  constructor(scene: Phaser.Scene, inverted?: boolean) {
    this.scene = scene
    this.num = 0
    this.active = false
    this.inverted = !!inverted
    this.pixels = []
    for (let x = 0; x < 160; x += 1)
      for (let y = 0; y < 144; y += 1) this.pixels.push([x, y])
    this.pixels = shuffle(this.pixels)
    this.graphics = this.scene.add.graphics()
    this.graphics.setScrollFactor(0, 0)
  }

  fade(duration = 1500) {
    this.active = true
    this.scene.tweens.add({
      targets: this,
      num: this.pixels.length,
      ease: this.inverted
        ? Phaser.Math.Easing.Quadratic.InOut
        : Phaser.Math.Easing.Quintic.Out,
      duration,
    })
  }

  update() {
    if (!this.active && !this.inverted) return
    const num = Math.floor(this.num)

    this.graphics.clear()
    this.graphics.fillStyle(0x081820)
    const pixels = this.inverted
      ? this.pixels.slice(num)
      : this.pixels.slice(0, num)
    pixels.forEach(([x, y]) => {
      this.graphics.fillRect(x, y, 1, 1)
    })
    if (num >= this.pixels.length - 1) {
      this.active = false
    }
  }
}
