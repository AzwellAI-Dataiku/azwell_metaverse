import Phaser from 'phaser';
import { generateFloorTileset } from '../assets/AssetGenerator.js';
import { renderCharacterSpriteSheet } from '../entities/CharacterRenderer.js';
import { DEFAULT_APPEARANCE } from '@metaverse/shared';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Generate tilesets for each floor
    for (let floor = 2; floor <= 6; floor++) {
      const canvas = generateFloorTileset(floor, 48);
      this.textures.addCanvas(`tileset-floor-${floor}`, canvas);
    }

    // Generate character placeholder sprites
    this.generateCharacterSprites();

    // Generate particle textures
    this.generateParticleTextures();

    // Loading bar
    const { width, height } = this.cameras.main;
    const bar = this.add.graphics();
    const barBg = this.add.graphics();

    barBg.fillStyle(0xffe4e9, 1);
    barBg.fillRoundedRect(width / 2 - 150, height / 2 - 12, 300, 24, 12);

    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(0xff8fa3, 1);
      bar.fillRoundedRect(width / 2 - 148, height / 2 - 10, 296 * value, 20, 10);
    });

    // Loading text
    this.add.text(width / 2, height / 2 - 40, '🌰 로딩 중...', {
      fontSize: '18px',
      color: '#5D4037',
      fontFamily: 'Pretendard, sans-serif',
    }).setOrigin(0.5);
  }

  private generateCharacterSprites() {
    // Default fallback sprites using CharacterRenderer
    const maleApp = { ...DEFAULT_APPEARANCE, outfit: { ...DEFAULT_APPEARANCE.outfit, color: '#89CFF0' } };
    const femaleApp = { ...DEFAULT_APPEARANCE, outfit: { ...DEFAULT_APPEARANCE.outfit, color: '#FF8FA3' } };

    const maleCanvas = renderCharacterSpriteSheet('male', maleApp);
    this.textures.addCanvas('char-male', maleCanvas);

    const femaleCanvas = renderCharacterSpriteSheet('female', femaleApp);
    this.textures.addCanvas('char-female', femaleCanvas);
  }

  private generateParticleTextures() {
    // Sparkle texture
    const sparkleCanvas = document.createElement('canvas');
    sparkleCanvas.width = 16;
    sparkleCanvas.height = 16;
    const sCtx = sparkleCanvas.getContext('2d')!;
    sCtx.fillStyle = '#FFD700';
    sCtx.beginPath();
    sCtx.arc(8, 8, 4, 0, Math.PI * 2);
    sCtx.fill();
    sCtx.fillStyle = '#FFFFFF';
    sCtx.beginPath();
    sCtx.arc(8, 8, 2, 0, Math.PI * 2);
    sCtx.fill();
    this.textures.addCanvas('particle-sparkle', sparkleCanvas);
  }

  create() {
    this.scene.start('OfficeScene', { floor: 2 });
  }
}
