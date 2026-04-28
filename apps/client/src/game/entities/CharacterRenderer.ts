import type { CharacterAppearance, Gender } from '@metaverse/shared';

const FW = 48; // frame width
const FH = 64; // frame height

/**
 * CharacterAppearance 기반 미니미 캐릭터 렌더러
 * - Canvas API로 외형 옵션에 따라 실제로 다른 캐릭터를 그린다
 * - 미리보기(React)와 게임(Phaser) 양쪽에서 사용
 */

export function renderCharacterToCanvas(
  gender: Gender,
  appearance: CharacterAppearance,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = FW;
  canvas.height = FH;
  const ctx = canvas.getContext('2d')!;
  drawMiniMi(ctx, 0, 0, FW, FH, gender, appearance, 'down', 0);
  return canvas;
}

export function renderCharacterSpriteSheet(
  gender: Gender,
  appearance: CharacterAppearance,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = FW * 3;
  canvas.height = FH * 4;
  const ctx = canvas.getContext('2d')!;

  const directions: Array<'down' | 'left' | 'right' | 'up'> = ['down', 'left', 'right', 'up'];
  directions.forEach((dir, row) => {
    for (let frame = 0; frame < 3; frame++) {
      drawMiniMi(ctx, frame * FW, row * FH, FW, FH, gender, appearance, dir, frame);
    }
  });

  return canvas;
}

function drawMiniMi(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  gender: Gender,
  app: CharacterAppearance,
  direction: string,
  frame: number,
) {
  const cx = x + w / 2;
  const headR = w * 0.35;
  const headY = y + headR + 4;
  const bodyTop = headY + headR + 2;
  const legOffset = frame === 1 ? 3 : frame === 2 ? -3 : 0;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.beginPath();
  ctx.ellipse(cx, y + h - 4, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outfit / body
  ctx.fillStyle = app.outfit.color;
  ctx.beginPath();
  ctx.ellipse(cx, bodyTop + 12, 10, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Outfit collar detail based on style
  if (app.outfit.style % 3 === 0) {
    ctx.fillStyle = lightenColor(app.outfit.color, 40);
    ctx.fillRect(cx - 5, bodyTop + 1, 10, 4);
  } else if (app.outfit.style % 3 === 1) {
    // V-neck line
    ctx.strokeStyle = lightenColor(app.outfit.color, 60);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 4, bodyTop + 2);
    ctx.lineTo(cx, bodyTop + 7);
    ctx.lineTo(cx + 4, bodyTop + 2);
    ctx.stroke();
  }
  // Outfit pattern based on style
  if (app.outfit.style >= 5) {
    ctx.fillStyle = lightenColor(app.outfit.color, 30);
    ctx.beginPath();
    ctx.arc(cx, bodyTop + 14, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Legs
  ctx.fillStyle = app.body.skinColor;
  ctx.fillRect(cx - 6 + legOffset, bodyTop + 20, 5, 12);
  ctx.fillRect(cx + 1 - legOffset, bodyTop + 20, 5, 12);
  // Shoes
  ctx.fillStyle = darkenColor(app.outfit.color, 40);
  ctx.fillRect(cx - 7 + legOffset, bodyTop + 30, 6, 3);
  ctx.fillRect(cx + 0 - legOffset, bodyTop + 30, 6, 3);

  // Arms based on body type
  ctx.fillStyle = app.body.skinColor;
  if (app.body.type <= 2) {
    // Thin arms
    ctx.fillRect(cx - 12, bodyTop + 6, 4, 10);
    ctx.fillRect(cx + 8, bodyTop + 6, 4, 10);
  } else {
    // Wider arms
    ctx.fillRect(cx - 13, bodyTop + 5, 5, 12);
    ctx.fillRect(cx + 8, bodyTop + 5, 5, 12);
  }

  // Head
  ctx.fillStyle = app.body.skinColor;
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Head outline
  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.stroke();

  // Hair - different styles based on style number
  drawHair(ctx, cx, headY, headR, gender, app.hair.style, app.hair.color, direction);

  // Face (only when not facing up)
  if (direction !== 'up') {
    const faceOffsetX = direction === 'left' ? -2 : direction === 'right' ? 2 : 0;

    // Eyes
    drawEyes(ctx, cx + faceOffsetX, headY, app.eyes.style, app.eyes.color, direction);

    // Nose
    drawNose(ctx, cx + faceOffsetX, headY, app.nose.style);

    // Mouth
    drawMouth(ctx, cx + faceOffsetX, headY, app.mouth.style);

    // Blush (always)
    ctx.fillStyle = 'rgba(255,143,163,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx - 10 + faceOffsetX, headY + 4, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 10 + faceOffsetX, headY + 4, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHair(
  ctx: CanvasRenderingContext2D,
  cx: number, headY: number, headR: number,
  gender: Gender, style: number, color: string, direction: string,
) {
  ctx.fillStyle = color;
  const s = style % 12 || 12;

  if (s <= 2) {
    // Short hair
    ctx.beginPath();
    ctx.arc(cx, headY - 3, headR + 2, Math.PI, Math.PI * 2);
    ctx.fill();
    if (s === 2) {
      // Bangs
      ctx.fillRect(cx - headR + 2, headY - headR, headR * 2 - 4, 6);
    }
  } else if (s <= 4) {
    // Medium bob
    ctx.beginPath();
    ctx.arc(cx, headY - 2, headR + 3, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();
    // Side hair
    ctx.fillRect(cx - headR - 2, headY - 4, 6, headR + 4);
    ctx.fillRect(cx + headR - 4, headY - 4, 6, headR + 4);
    if (s === 4) {
      ctx.fillRect(cx - headR + 2, headY - headR, headR * 2 - 4, 7);
    }
  } else if (s <= 6) {
    // Long hair
    ctx.beginPath();
    ctx.arc(cx, headY - 2, headR + 3, Math.PI * 0.7, Math.PI * 2.3);
    ctx.fill();
    ctx.fillRect(cx - headR - 2, headY - 4, 6, headR + 14);
    ctx.fillRect(cx + headR - 4, headY - 4, 6, headR + 14);
    if (s === 6) {
      // Bangs with part
      ctx.fillRect(cx - headR + 2, headY - headR, headR - 2, 8);
    }
  } else if (s <= 8) {
    // Ponytail / bun (especially for female)
    ctx.beginPath();
    ctx.arc(cx, headY - 3, headR + 2, Math.PI, Math.PI * 2);
    ctx.fill();
    if (s === 7) {
      // High ponytail
      ctx.beginPath();
      ctx.arc(cx + (direction === 'left' ? -8 : 8), headY - headR - 4, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx + (direction === 'left' ? -6 : 4), headY - headR, 3, 8);
    } else {
      // Twin tails
      ctx.beginPath();
      ctx.arc(cx - headR + 2, headY - 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + headR - 2, headY - 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - headR, headY - 2, 4, 10);
      ctx.fillRect(cx + headR - 4, headY - 2, 4, 10);
    }
  } else if (s <= 10) {
    // Spiky / messy
    ctx.beginPath();
    ctx.arc(cx, headY - 4, headR + 2, Math.PI, Math.PI * 2);
    ctx.fill();
    // Spikes
    for (let i = 0; i < 5; i++) {
      const angle = Math.PI + (Math.PI * i) / 5;
      const sx = cx + Math.cos(angle) * (headR + 2);
      const sy = headY - 4 + Math.sin(angle) * (headR + 2);
      ctx.beginPath();
      ctx.moveTo(sx - 3, sy + 2);
      ctx.lineTo(sx, sy - 5);
      ctx.lineTo(sx + 3, sy + 2);
      ctx.fill();
    }
  } else {
    // Curly / wavy
    ctx.beginPath();
    ctx.arc(cx, headY - 2, headR + 3, Math.PI * 0.75, Math.PI * 2.25);
    ctx.fill();
    // Curly bumps
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI * 0.8 + (Math.PI * 1.4 * i) / 6;
      const bx = cx + Math.cos(angle) * (headR + 4);
      const by = headY - 2 + Math.sin(angle) * (headR + 4);
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (s === 12) {
      ctx.fillRect(cx - headR - 1, headY, 5, headR + 8);
      ctx.fillRect(cx + headR - 4, headY, 5, headR + 8);
    }
  }
}

function drawEyes(
  ctx: CanvasRenderingContext2D,
  cx: number, headY: number,
  style: number, color: string, direction: string,
) {
  const eyeSpacing = direction === 'left' || direction === 'right' ? 5 : 6;
  const eyeY = headY;
  const s = style % 8 || 8;

  ctx.fillStyle = color;

  if (s <= 2) {
    // Round eyes
    const r = s === 1 ? 2.5 : 3;
    ctx.beginPath();
    ctx.arc(cx - eyeSpacing, eyeY, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + eyeSpacing, eyeY, r, 0, Math.PI * 2);
    ctx.fill();
  } else if (s <= 4) {
    // Oval / almond eyes
    ctx.beginPath();
    ctx.ellipse(cx - eyeSpacing, eyeY, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + eyeSpacing, eyeY, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (s === 4) {
      // Eyelashes
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - eyeSpacing - 3, eyeY - 2);
      ctx.lineTo(cx - eyeSpacing - 1, eyeY - 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + eyeSpacing + 3, eyeY - 2);
      ctx.lineTo(cx + eyeSpacing + 1, eyeY - 3);
      ctx.stroke();
    }
  } else if (s <= 6) {
    // Dot eyes (cute)
    ctx.beginPath();
    ctx.arc(cx - eyeSpacing, eyeY, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + eyeSpacing, eyeY, 1.5, 0, Math.PI * 2);
    ctx.fill();
    if (s === 6) {
      // ^^ happy eyes
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx - eyeSpacing, eyeY + 1, 2.5, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + eyeSpacing, eyeY + 1, 2.5, Math.PI, 0);
      ctx.stroke();
    }
  } else {
    // Star / sparkle eyes
    ctx.beginPath();
    ctx.arc(cx - eyeSpacing, eyeY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + eyeSpacing, eyeY, 3, 0, Math.PI * 2);
    ctx.fill();
    // Star highlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - eyeSpacing + 1, eyeY - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + eyeSpacing + 1, eyeY - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - eyeSpacing - 0.5, eyeY + 1, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + eyeSpacing - 0.5, eyeY + 1, 0.8, 0, Math.PI * 2);
    ctx.fill();
    return; // Skip default shine
  }

  // Default eye shine
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx - eyeSpacing + 1, eyeY - 1, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + eyeSpacing + 1, eyeY - 1, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawNose(ctx: CanvasRenderingContext2D, cx: number, headY: number, style: number) {
  const s = style % 4 || 4;
  const ny = headY + 4;

  if (s === 1) {
    // Small dot
    ctx.fillStyle = darkenColor('#FFDBB5', 20);
    ctx.beginPath();
    ctx.arc(cx, ny, 1, 0, Math.PI * 2);
    ctx.fill();
  } else if (s === 2) {
    // Small line
    ctx.strokeStyle = 'rgba(139,69,19,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, ny - 1);
    ctx.lineTo(cx, ny + 2);
    ctx.stroke();
  } else if (s === 3) {
    // Triangle nose
    ctx.fillStyle = 'rgba(139,69,19,0.2)';
    ctx.beginPath();
    ctx.moveTo(cx - 1.5, ny - 1);
    ctx.lineTo(cx + 1.5, ny - 1);
    ctx.lineTo(cx, ny + 2);
    ctx.closePath();
    ctx.fill();
  } else {
    // Round cute nose
    ctx.fillStyle = 'rgba(255,143,163,0.3)';
    ctx.beginPath();
    ctx.arc(cx, ny, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMouth(ctx: CanvasRenderingContext2D, cx: number, headY: number, style: number) {
  const s = style % 6 || 6;
  const my = headY + 7;

  if (s === 1) {
    // Smile arc
    ctx.fillStyle = '#FF8FA3';
    ctx.beginPath();
    ctx.arc(cx, my, 3, 0, Math.PI);
    ctx.fill();
  } else if (s === 2) {
    // Small 'o'
    ctx.fillStyle = '#FF8FA3';
    ctx.beginPath();
    ctx.arc(cx, my, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (s === 3) {
    // Wide smile
    ctx.strokeStyle = '#FF8FA3';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, my - 1, 4, 0.1, Math.PI - 0.1);
    ctx.stroke();
  } else if (s === 4) {
    // Cat mouth :3
    ctx.strokeStyle = '#FF8FA3';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx - 2, my, 2, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 2, my, 2, 0, Math.PI);
    ctx.stroke();
  } else if (s === 5) {
    // > < grin
    ctx.fillStyle = '#FF8FA3';
    ctx.beginPath();
    ctx.moveTo(cx - 4, my - 1);
    ctx.lineTo(cx, my + 2);
    ctx.lineTo(cx + 4, my - 1);
    ctx.closePath();
    ctx.fill();
  } else {
    // Line smile
    ctx.strokeStyle = '#FF8FA3';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 3, my);
    ctx.lineTo(cx + 3, my);
    ctx.stroke();
  }
}

// Utility: lighten a hex color
function lightenColor(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r},${g},${b})`;
}
