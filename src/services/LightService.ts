import { LIGHTS, LIGHT_STATE, PLANET_SCORES } from '../constants'
import Game from '../scenes/Game'

export default class LightService {
  lightSprites?: Phaser.GameObjects.Sprite[]
  hyperspaceArrow?: Phaser.GameObjects.Sprite
  awayArrow?: Phaser.GameObjects.Sprite
  secretArrow?: Phaser.GameObjects.Sprite
  scene: Game

  constructor(scene: Game) {
    this.scene = scene
    this.scene.data.events.on('changedata-lightstate', this.changeLightData)
    this.reset()
  }

  update() {
    this.updateLights()
  }

  destroy() {
    this.scene.data.events.off('changedata-lightstate', this.changeLightData)
  }

  createLights = () => {
    const lights = LIGHTS.map((p) =>
      this.scene.add.sprite(p.x, p.y, 'light', 0).setData('label', p.label),
    )

    const lights2 = new Array(8)
      .fill('')
      .map((p) => this.scene.add.sprite(0, 0, 'light', 0))
    const lights3 = new Array(16)
      .fill('')
      .map((p) => this.scene.add.sprite(0, 0, 'light', 0))

    const light = this.scene.add
      .sprite(80, 200, 'light', 0)
      .setData('label', 'center-light')
    const circleLights = [light, ...lights2, ...lights3]
    // @ts-ignore
    lights2.forEach((l, i) => {
      l.setDataEnabled()
      l.data.set('label', `inner-circle-light:${i}`)
    })
    lights3.forEach((l, i) => {
      l.setDataEnabled()
      l.data.set('label', `outer-circle-light:${i}`)
    })
    this.lightSprites = [...circleLights, ...lights]

    Phaser.Actions.PlaceOnCircle(
      lights2,
      new Phaser.Geom.Circle(80, 200, 14),
      -1.57,
      4.71,
    )
    Phaser.Actions.PlaceOnCircle(
      lights3,
      new Phaser.Geom.Circle(80, 200, 28),
      -1.57,
      4.71,
    )

    this.hyperspaceArrow = this.scene.add
      .sprite(105, 155, 'diagonal-arrow')
      .setFlipX(true)
    this.awayArrow = this.scene.add.sprite(53, 155, 'diagonal-arrow')
    this.secretArrow = this.scene.add.sprite(11, 80, 'arrow')
  }

  reset = () => {
    this.scene.data.set('lightstate', LIGHT_STATE)
    this.scene.data.set('lightstate', LIGHT_STATE)
    this.hyperspaceArrow?.setFrame(0)
    this.awayArrow?.setFrame(0)
    this.secretArrow?.setFrame(0)
  }

  updateTravelLights = () => {
    const index = PLANET_SCORES.findIndex(
      (s) => this.scene.data.values.requiredScore === s,
    )
    const totalPrev = PLANET_SCORES[index - 1] ?? 0
    let pp =
      (this.scene.data.values.score - totalPrev) /
      (this.scene.data.values.requiredScore - totalPrev)

    const ls = this.scene.data.values.lightstate
    const n = (pp * 16) % 16

    this.scene.data.values.targetPlanet++
    ls['inner-circle-light'] = ls['inner-circle-light'].map(
      (_: any, i: number) => (index === i ? 2 : i > index ? 0 : 1),
    )
    ls['outer-circle-light'] = ls['outer-circle-light'].map(
      (_: any, i: number) => (Math.floor(n) === i ? 2 : i > n ? 0 : 1),
    )
    this.scene.data.set('lightstate', ls)
  }

  changeLightData = () => {
    const state = (this.scene.data.get('lightstate') ?? {}) as Record<
      string,
      number[]
    >
    Object.entries(state).map(([k, vs]) => {
      vs.forEach((value, index) => {
        this.lightSprites
          ?.find((l) => l.data.get('label') === `${k}:${index}`)
          ?.setFrame(value ? 1 : 0)
      })
    })
  }

  toggleLight = (label: string) => {
    const [k, i] = label.split(':')
    const state = this.scene.data.get('lightstate')
    state[k][i] = state[k][i] === 0 ? 1 : 0
    if (state['base-light'].every((n: number) => n === 1)) {
      this.scene.sound.play('secretHit')
      this.scene.time.delayedCall(1500, () => {
        this.toggleLight('base-light:0')
        this.toggleLight('base-light:1')
        this.toggleLight('base-light:2')
        this.toggleLight('base-light:3')
        this.scene.data.values.score += 25000
      })
    }
    if (state['post-light'].every((n: number) => n === 1)) {
      this.scene.sound.play('secretHit')
      this.scene.time.delayedCall(1500, () => {
        this.toggleLight('post-light:0')
        this.toggleLight('post-light:1')
        this.toggleLight('post-light:2')
        this.scene.data.values.score += 25000
      })
    }
    this.scene.data.set('lightstate', state)
  }

  flipLights = (isLeft: boolean) => {
    const state = this.scene.data.get('lightstate') as Record<string, number[]>
    const d = isLeft ? -1 : 1
    Object.entries(state).forEach(([k, v]) => {
      if (!k.match(/base|post/)) return
      const s = state[k].concat([])
      state[k] = s.map((_, i) => s[wrap(i + d, 0, s.length)])
    })
    this.scene.data.set('lightstate', state)
  }

  updateLights = () => {
    Object.entries(this.scene.data.get('lightstate')).map(([k, vs]) => {
      ;(vs as number[]).forEach((value, index) => {
        const light = this.lightSprites?.find(
          (l) => l.data.get('label') === `${k}:${index}`,
        )
        const freq = 1000

        if (value === 2)
          light?.setFrame(this.scene.time.now % freq > freq / 2 ? 1 : 0)
      })
    })
  }
}

const wrap = function (n: number, min: number, max: number) {
  var r = max - min
  return min + ((((n - min) % r) + r) % r)
}
