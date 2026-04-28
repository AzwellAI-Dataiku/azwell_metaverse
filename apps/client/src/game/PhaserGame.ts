import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { OfficeScene } from './scenes/OfficeScene.js';
import { ArenaScene } from './scenes/ArenaScene.js';

let gameInstance: Phaser.Game | null = null;

export function createGame(parentId: string): Phaser.Game {
  if (gameInstance) {
    gameInstance.destroy(true);
  }

  gameInstance = new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentId,
    width: 960,
    height: 720,
    backgroundColor: '#FFF0F5',
    pixelArt: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, OfficeScene, ArenaScene],
  });

  return gameInstance;
}

export function destroyGame() {
  if (gameInstance) {
    gameInstance.destroy(true);
    gameInstance = null;
  }
}

export function getGame(): Phaser.Game | null {
  return gameInstance;
}
