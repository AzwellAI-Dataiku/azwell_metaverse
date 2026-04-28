import Phaser from 'phaser';

const BUBBLE_PADDING = 10;
const BUBBLE_RADIUS = 12;
const BUBBLE_MAX_WIDTH = 180;
const DISPLAY_DURATION = 4000;
const FADE_DURATION = 500;

/**
 * 싸이월드 감성 구름형 말풍선
 * - 공개 채팅 전용 (DM/그룹에서는 미표시)
 * - 3~5초 후 자동 소멸 (통통 튀며 페이드 아웃)
 */
export class SpeechBubble {
  private container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private timer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number, message: string) {
    this.scene = scene;
    this.container = scene.add.container(x, y - 55);
    this.container.setDepth(50);

    // Text
    const text = scene.add.text(0, 0, message, {
      fontSize: '12px',
      color: '#5D4037',
      fontFamily: 'Pretendard, sans-serif',
      wordWrap: { width: BUBBLE_MAX_WIDTH - BUBBLE_PADDING * 2 },
      align: 'center',
    }).setOrigin(0.5);

    const textW = Math.min(text.width, BUBBLE_MAX_WIDTH - BUBBLE_PADDING * 2);
    const textH = text.height;
    const bubbleW = textW + BUBBLE_PADDING * 2;
    const bubbleH = textH + BUBBLE_PADDING * 2;

    // Bubble background
    const bubble = scene.add.graphics();

    // Shadow
    bubble.fillStyle(0xff6b35, 0.1);
    bubble.fillRoundedRect(-bubbleW / 2 + 2, -bubbleH / 2 + 2, bubbleW, bubbleH, BUBBLE_RADIUS);

    // Main bubble (white with orange border)
    bubble.fillStyle(0xffffff, 0.95);
    bubble.fillRoundedRect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, BUBBLE_RADIUS);
    bubble.lineStyle(2, 0xff6b35, 0.6);
    bubble.strokeRoundedRect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, BUBBLE_RADIUS);

    // Tail (pointing down)
    bubble.fillStyle(0xffffff, 0.95);
    bubble.fillTriangle(-6, bubbleH / 2, 6, bubbleH / 2, 0, bubbleH / 2 + 8);
    bubble.lineStyle(2, 0xff6b35, 0.6);
    bubble.lineBetween(-6, bubbleH / 2, 0, bubbleH / 2 + 8);
    bubble.lineBetween(6, bubbleH / 2, 0, bubbleH / 2 + 8);

    this.container.add(bubble);
    this.container.add(text);

    // Pop-in animation
    this.container.setScale(0);
    scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Auto destroy after duration
    this.timer = scene.time.delayedCall(DISPLAY_DURATION, () => {
      this.fadeOut();
    });
  }

  private fadeOut() {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scale: 0.5,
      y: this.container.y - 20,
      duration: FADE_DURATION,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      },
    });
  }

  updatePosition(x: number, y: number) {
    this.container.setPosition(x, y - 55);
  }

  destroy() {
    this.timer?.destroy();
    this.container.destroy();
  }
}

/**
 * "..." 타이핑 인디케이터
 * - 공개 채팅 시에만 캐릭터 위 표시
 * - 점이 하나씩 바운스하며 나타남
 */
export class TypingIndicator {
  private container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private dots: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y - 50);
    this.container.setDepth(50);

    // Small bubble background
    const bg = scene.add.graphics();
    bg.fillStyle(0xffffff, 0.9);
    bg.fillRoundedRect(-20, -10, 40, 20, 10);
    bg.lineStyle(1.5, 0xff6b35, 0.4);
    bg.strokeRoundedRect(-20, -10, 40, 20, 10);
    this.container.add(bg);

    // Three dots with staggered bounce animation
    for (let i = 0; i < 3; i++) {
      const dot = scene.add.text(-8 + i * 8, -4, '.', {
        fontSize: '16px',
        color: '#FF8FA3',
        fontFamily: 'Pretendard, sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.container.add(dot);
      this.dots.push(dot);

      // Staggered bounce
      scene.tweens.add({
        targets: dot,
        y: dot.y - 4,
        duration: 400,
        yoyo: true,
        repeat: -1,
        delay: i * 150,
        ease: 'Sine.easeInOut',
      });
    }
  }

  updatePosition(x: number, y: number) {
    this.container.setPosition(x, y - 50);
  }

  destroy() {
    this.container.destroy();
  }
}
