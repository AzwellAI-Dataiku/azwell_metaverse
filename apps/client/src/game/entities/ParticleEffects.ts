import Phaser from 'phaser';

/**
 * 싸이월드 감성 파티클 이펙트
 * - 레벨업: 반짝이 + 별 폭발
 * - 퀘스트 완료: 도토리 파티클
 * - 이동 흔적: 작은 별/하트
 */

export function createSparkleEffect(scene: Phaser.Scene, x: number, y: number) {
  const colors = [0xFFD700, 0xFF8FA3, 0x89CFF0, 0x98DFAF, 0xFFE082];

  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    const dist = 30 + Math.random() * 20;
    const color = colors[Math.floor(Math.random() * colors.length)];

    const star = scene.add.star(x, y, 4, 2, 5, color, 1);
    star.setDepth(100);

    scene.tweens.add({
      targets: star,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      scale: 0,
      rotation: Math.PI * 2,
      duration: 600 + Math.random() * 400,
      ease: 'Power2',
      onComplete: () => star.destroy(),
    });
  }
}

export function createLevelUpEffect(scene: Phaser.Scene, x: number, y: number) {
  // Big sparkle burst
  createSparkleEffect(scene, x, y);

  // Rising text
  const text = scene.add.text(x, y - 40, '⭐ LEVEL UP! ⭐', {
    fontSize: '16px',
    color: '#FF6B35',
    fontFamily: 'Pretendard, sans-serif',
    fontStyle: 'bold',
    stroke: '#FFFFFF',
    strokeThickness: 3,
  }).setOrigin(0.5).setDepth(100);

  scene.tweens.add({
    targets: text,
    y: y - 100,
    alpha: 0,
    scale: 1.5,
    duration: 1500,
    ease: 'Power2',
    onComplete: () => text.destroy(),
  });

  // Ring effect
  const ring = scene.add.circle(x, y, 5, 0xFF6B35, 0.5);
  ring.setDepth(99);
  scene.tweens.add({
    targets: ring,
    scale: 8,
    alpha: 0,
    duration: 800,
    ease: 'Power2',
    onComplete: () => ring.destroy(),
  });
}

export function createQuestCompleteEffect(scene: Phaser.Scene, x: number, y: number) {
  const text = scene.add.text(x, y - 40, '🌰 퀘스트 완료!', {
    fontSize: '14px',
    color: '#98DFAF',
    fontFamily: 'Pretendard, sans-serif',
    fontStyle: 'bold',
    stroke: '#FFFFFF',
    strokeThickness: 2,
  }).setOrigin(0.5).setDepth(100);

  scene.tweens.add({
    targets: text,
    y: y - 80,
    alpha: 0,
    duration: 1200,
    ease: 'Power2',
    onComplete: () => text.destroy(),
  });

  // Small sparkles
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6;
    const star = scene.add.star(x, y - 20, 4, 2, 4, 0x98DFAF, 1);
    star.setDepth(100);
    scene.tweens.add({
      targets: star,
      x: x + Math.cos(angle) * 25,
      y: y - 20 + Math.sin(angle) * 25,
      alpha: 0,
      scale: 0,
      duration: 500,
      delay: i * 50,
      onComplete: () => star.destroy(),
    });
  }
}

export function createMoveTrail(scene: Phaser.Scene, x: number, y: number) {
  const colors = [0xFFE4E9, 0xFFD4DC];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const dot = scene.add.circle(x, y + 16, 2, color, 0.6);
  dot.setDepth(5);
  scene.tweens.add({
    targets: dot,
    alpha: 0,
    scale: 0.3,
    duration: 400,
    onComplete: () => dot.destroy(),
  });
}
