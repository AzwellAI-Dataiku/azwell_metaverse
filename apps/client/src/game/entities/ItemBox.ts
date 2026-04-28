import Phaser from 'phaser';

const TILE_SIZE = 48;

export class ItemBox extends Phaser.GameObjects.Container {
  public boxId: string;
  public tileX: number;
  public tileY: number;
  private glowTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, boxId: string, tileX: number, tileY: number) {
    const px = tileX * TILE_SIZE + TILE_SIZE / 2;
    const py = tileY * TILE_SIZE + TILE_SIZE / 2;
    super(scene, px, py);

    this.boxId = boxId;
    this.tileX = tileX;
    this.tileY = tileY;

    // 상자 본체
    const box = scene.add.graphics();
    // 상자 몸통
    box.fillStyle(0xd4a574, 1);
    box.fillRoundedRect(-14, -10, 28, 20, 3);
    // 상자 뚜껑
    box.fillStyle(0xc4955a, 1);
    box.fillRoundedRect(-16, -14, 32, 8, 3);
    // 잠금장치
    box.fillStyle(0xffd700, 1);
    box.fillCircle(0, -2, 3);
    // 반짝임
    box.fillStyle(0xffffff, 0.7);
    box.fillCircle(-6, -8, 2);

    this.add(box);

    // 물음표 텍스트
    const questionMark = scene.add.text(0, -22, '?', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add(questionMark);

    // 글로우 애니메이션
    this.glowTween = scene.tweens.add({
      targets: this,
      scaleX: { from: 1, to: 1.1 },
      scaleY: { from: 1, to: 1.1 },
      alpha: { from: 1, to: 0.8 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 물음표 바운스
    scene.tweens.add({
      targets: questionMark,
      y: -26,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    scene.add.existing(this);
    this.setDepth(py - 1);
  }

  /** 픽업 시 파티클 효과 + 제거 */
  playPickupEffect(callback?: () => void): void {
    // 반짝임 효과
    const sparkles = ['✨', '💫', '⭐'];
    for (let i = 0; i < 5; i++) {
      const sparkle = this.scene.add.text(
        this.x + Phaser.Math.Between(-20, 20),
        this.y + Phaser.Math.Between(-20, 10),
        sparkles[Phaser.Math.Between(0, sparkles.length - 1)],
        { fontSize: '14px' }
      ).setOrigin(0.5).setDepth(9999);

      this.scene.tweens.add({
        targets: sparkle,
        y: sparkle.y - 30,
        alpha: 0,
        scale: 0.3,
        duration: 500,
        delay: i * 80,
        onComplete: () => sparkle.destroy(),
      });
    }

    // 상자 사라지는 애니메이션
    if (this.glowTween) this.glowTween.stop();
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 300,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.destroy();
        callback?.();
      },
    });
  }

  /** 만료 시 페이드아웃 제거 */
  playExpireEffect(): void {
    if (this.glowTween) this.glowTween.stop();
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 1000,
      onComplete: () => this.destroy(),
    });
  }
}
