import Phaser from 'phaser'
import { PHYSICS_DEBUG } from './constants'

export default {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#081820',
  physics: {
    default: 'matter',
    matter: {
      debug: PHYSICS_DEBUG
        ? {
            showSeparation: true,
            showAngleIndicator: true,
            showCollisions: true,
            showSleeping: true,
            showBody: true,
            showStaticBody: true,
          }
        : false,
      gravity: { y: 0.44 },
      enableSleeping: true,
      positionIterations: 20,
      velocityIterations: 20,
    },
  },
  pixelArt: true,
  scale: {
    width: 160,
    height: 144,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}
