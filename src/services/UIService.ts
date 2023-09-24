import Game from '../scenes/Game'

export default class UIService {
  message?: Phaser.GameObjects.BitmapText
  scoreText?: Phaser.GameObjects.BitmapText
  ballText?: Phaser.GameObjects.BitmapText
  scene: Game

  constructor(scene: Game) {
    this.scene = scene

    this.scene.input.keyboard.on('keydown-F', () => {
      this.scene.scale.startFullscreen()
    })

    this.createUI()
    this.resetUI()
    this.scene.data.events.on('changedata-score', this.resetUI)
  }

  destroy() {
    this.scene.data.events.off('changedata-score', this.resetUI)
  }

  update() {
    this.checkCameraPan()
  }

  showMessage = (m: string, duration = 3000) => {
    if (!this.message) return
    this.message.text = m

    this.message.setAlpha(1)
    this.ballText?.setAlpha(0)
    this.scoreText?.setAlpha(0)
    this.message.setData('activetime', this.scene.time.now + duration)
    this.scene.time.delayedCall(duration, this.resetUI)
  }

  createUI = () => {
    this.scene.add
      .rectangle(0, 144, 160, 8, 0x081820)
      .setScrollFactor(0)
      .setOrigin(0, 1)
      .setDepth(100)
    this.message = this.scene.add
      .bitmapText(1, 145, 'clarity', '', -8)
      .setScrollFactor(0)
      .setOrigin(0, 1)
      .setDepth(100)
    this.scoreText = this.scene.add
      .bitmapText(160, 145, 'clarity', '', -8)
      .setScrollFactor(0)
      .setOrigin(1, 1)
      .setDepth(100)
    this.ballText = this.scene.add
      .bitmapText(1, 145, 'clarity', '', -8)
      .setScrollFactor(0)
      .setOrigin(0, 1)
      .setDepth(100)
  }

  resetUI = () => {
    if (!this.ballText || !this.message || !this.scoreText) return
    if (
      this.message.getData('activetime') &&
      this.message.getData('activetime') > this.scene.time.now
    )
      return

    const { score, balls, rank } = this.scene.data.values
    this.message.setAlpha(0)
    this.ballText.setAlpha(1)
    this.scoreText.setAlpha(1)
    this.ballText.text = `B: ${balls ?? 3} R: ${rank ?? 0}`
    this.scoreText.text = `${score}`
  }

  getCameraPosition = () => {
    const body = this.scene.ballService!.ball?.body as MatterJS.BodyType
    let y = this.scene.cameras.main.height * 1.5
    let x = this.scene.cameras.main.width / 2
    if (body.position.x < 0) {
      x = -100
    } else {
      if (body.position.y < this.scene.cameras.main.height) {
        y = this.scene.cameras.main.height / 2
      }
      if (body.position.x > this.scene.cameras.main.width) {
        x = this.scene.cameras.main.width / 2 + 32
      }
    }
    return { x, y }
  }

  checkCameraPan = () => {
    const cameraPos = this.getCameraPosition()
    const allowPan = this.scene.data.get('allowcamerapan')

    if (
      allowPan &&
      (this.scene.cameras.main.x !== cameraPos.x ||
        this.scene.cameras.main.y !== cameraPos.y)
    ) {
      this.scene.cameras.main.pan(
        cameraPos.x,
        cameraPos.y,
        120,
        undefined,
        true,
      )
    }
  }
}
