export default class UIService {
  scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene

    this.scene.input.keyboard.on('keydown-F', () => {
      this.scene.scale.startFullscreen()
    })
    // this.scene.data.events.addListener('changedata', this.scoreUpdate)
  }

  destroy() {
    // this.scene.data.events.removeListener('changedata', this.scoreUpdate)
  }
}
