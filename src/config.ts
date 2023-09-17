import Phaser from 'phaser'

export default {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#081820',
  physics: {
    default: 'matter',
    matter: { debug: true, gravity: { y: 0.3 } },
  },
  pixelArt: true,
  scale: {
    width: 180,
    height: 288,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}
