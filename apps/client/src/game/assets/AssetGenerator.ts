/**
 * Canvas API로 싸이월드 감성 사무실 에셋을 프로그래매틱 생성
 * - 타일 크기: 48x48
 * - 책상 위에 모니터가 올려진 워크스테이션
 * - 통통하고 귀여운 의자
 * - 층별 파스텔 테마
 */

const FLOOR_THEMES: Record<number, { bg: string; accent: string; wall: string; deskColor: string }> = {
  2: { bg: '#FFE4E9', accent: '#FF8FA3', wall: '#FFD0D9', deskColor: '#E8B88A' },
  3: { bg: '#D4F5E0', accent: '#98DFAF', wall: '#C2EBD4', deskColor: '#D4B896' },
  4: { bg: '#E8DEF8', accent: '#C9B0E8', wall: '#DDD0F0', deskColor: '#D2B48C' },
  5: { bg: '#D6EEFF', accent: '#89CFF0', wall: '#C4E4FF', deskColor: '#C8AD7F' },
  6: { bg: '#FFF8DC', accent: '#FFE082', wall: '#FFF0C0', deskColor: '#DEB887' },
};

// Tile indices
export const TILE = {
  FLOOR: 0,
  WALL: 1,
  FLOOR_ALT: 2,
  DOOR: 3,
  WORKSTATION: 4,   // desk + monitor combined
  CHAIR: 5,
  PLANT: 6,
  BOOKSHELF: 7,
  WHITEBOARD: 8,
  SOFA: 9,
  TABLE: 10,
  WATER_COOLER: 11,
} as const;

export function generateFloorTileset(floor: number, tileSize: number): HTMLCanvasElement {
  const theme = FLOOR_THEMES[floor] || FLOOR_THEMES[2];
  const cols = 4;
  const rows = 4;
  const canvas = document.createElement('canvas');
  canvas.width = tileSize * cols;
  canvas.height = tileSize * rows;
  const ctx = canvas.getContext('2d')!;

  // Row 0: Base tiles
  drawFloorTile(ctx, 0, 0, tileSize, theme.bg, theme.accent);
  drawWallTile(ctx, tileSize, 0, tileSize, theme.wall, theme.accent);
  drawFloorAltTile(ctx, tileSize * 2, 0, tileSize, theme.bg, theme.accent);
  drawDoorTile(ctx, tileSize * 3, 0, tileSize, theme.accent);

  // Row 1: Furniture
  drawWorkstation(ctx, 0, tileSize, tileSize, theme.deskColor);
  drawChair(ctx, tileSize, tileSize, tileSize, theme.accent);
  drawPlant(ctx, tileSize * 2, tileSize, tileSize);
  drawBookshelf(ctx, tileSize * 3, tileSize, tileSize, theme.accent);

  // Row 2: More furniture
  drawWhiteboard(ctx, 0, tileSize * 2, tileSize);
  drawSofa(ctx, tileSize, tileSize * 2, tileSize, theme.accent);
  drawTable(ctx, tileSize * 2, tileSize * 2, tileSize, theme.deskColor);
  drawWaterCooler(ctx, tileSize * 3, tileSize * 2, tileSize);

  return canvas;
}

function drawFloorTile(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, bg: string, accent: string) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, s, s);
  // Subtle wood-like grain
  ctx.strokeStyle = accent + '20';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x, y + (s / 4) * i + s / 8);
    ctx.lineTo(x + s, y + (s / 4) * i + s / 8);
    ctx.stroke();
  }
  // Grid edge
  ctx.strokeStyle = accent + '30';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, s, s);
}

function drawFloorAltTile(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, bg: string, accent: string) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, s, s);
  // Checkered subtle pattern
  ctx.fillStyle = accent + '12';
  ctx.fillRect(x, y, s / 2, s / 2);
  ctx.fillRect(x + s / 2, y + s / 2, s / 2, s / 2);
  ctx.strokeStyle = accent + '30';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, s, s);
}

function drawWallTile(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, bg: string, accent: string) {
  // Wall body
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, s, s);
  // Wainscoting
  ctx.fillStyle = accent + '25';
  ctx.fillRect(x, y + s * 0.65, s, s * 0.35);
  // Trim line
  ctx.strokeStyle = accent + '50';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.65);
  ctx.lineTo(x + s, y + s * 0.65);
  ctx.stroke();
  // Baseboard
  ctx.fillStyle = accent + '40';
  ctx.fillRect(x, y + s - 4, s, 4);
}

function drawDoorTile(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, accent: string) {
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(x, y, s, s);
  // Door frame
  ctx.fillStyle = '#A0784C';
  roundRect(ctx, x + 6, y + 2, s - 12, s - 2, 4);
  // Door panel
  ctx.fillStyle = '#C8A06E';
  roundRect(ctx, x + 10, y + 6, s - 20, s - 8, 3);
  // Window on door
  ctx.fillStyle = '#D6EEFF';
  roundRect(ctx, x + 14, y + 10, s - 28, 14, 2);
  // Knob
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(x + s - 16, y + s * 0.55, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF8DC';
  ctx.beginPath();
  ctx.arc(x + s - 16, y + s * 0.55, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawWorkstation(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, deskColor: string) {
  // Desk top (big, prominent)
  ctx.fillStyle = deskColor;
  roundRect(ctx, x + 2, y + s * 0.35, s - 4, s * 0.35, 4);
  // Desk edge shadow
  ctx.fillStyle = darken(deskColor, 30);
  roundRect(ctx, x + 3, y + s * 0.6, s - 6, s * 0.1, 3);
  // Desk legs
  ctx.fillStyle = darken(deskColor, 40);
  ctx.fillRect(x + 6, y + s * 0.68, 3, s * 0.25);
  ctx.fillRect(x + s - 9, y + s * 0.68, 3, s * 0.25);

  // Monitor on desk
  // Monitor stand
  ctx.fillStyle = '#555555';
  ctx.fillRect(x + s / 2 - 2, y + s * 0.25, 4, 10);
  ctx.fillRect(x + s / 2 - 6, y + s * 0.33, 12, 3);
  // Monitor screen frame
  ctx.fillStyle = '#2D2D2D';
  roundRect(ctx, x + s * 0.18, y + 3, s * 0.64, s * 0.3, 3);
  // Screen
  ctx.fillStyle = '#4FC3F7';
  roundRect(ctx, x + s * 0.22, y + 6, s * 0.56, s * 0.22, 2);
  // Screen reflection
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x + s * 0.24, y + 7, s * 0.2, s * 0.1);
  // Keyboard on desk
  ctx.fillStyle = '#888888';
  roundRect(ctx, x + s * 0.25, y + s * 0.4, s * 0.35, s * 0.08, 2);
  ctx.fillStyle = '#AAAAAA';
  roundRect(ctx, x + s * 0.27, y + s * 0.41, s * 0.31, s * 0.05, 1);
  // Mouse
  ctx.fillStyle = '#999999';
  ctx.beginPath();
  ctx.ellipse(x + s * 0.72, y + s * 0.44, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, accent: string) {
  // Chair legs / base (5-star base)
  ctx.fillStyle = '#777777';
  ctx.beginPath();
  ctx.arc(x + s / 2, y + s * 0.80, 10, 0, Math.PI * 2);
  ctx.fill();
  // Pole
  ctx.fillStyle = '#888888';
  ctx.fillRect(x + s / 2 - 2, y + s * 0.62, 4, s * 0.18);

  // Seat cushion (big, round, cute)
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(x + s / 2, y + s * 0.55, s * 0.38, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Seat highlight
  ctx.fillStyle = lighten(accent, 40);
  ctx.beginPath();
  ctx.ellipse(x + s / 2, y + s * 0.52, s * 0.24, s * 0.10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Backrest (rounded, plush)
  ctx.fillStyle = accent;
  roundRect(ctx, x + s * 0.14, y + s * 0.08, s * 0.72, s * 0.42, 12);
  // Backrest highlight
  ctx.fillStyle = lighten(accent, 30);
  roundRect(ctx, x + s * 0.20, y + s * 0.13, s * 0.60, s * 0.24, 8);

  // Subtle border
  ctx.strokeStyle = darken(accent, 30);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x + s / 2, y + s * 0.55, s * 0.38, s * 0.18, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  // Pot
  ctx.fillStyle = '#E07B53';
  roundRect(ctx, x + s * 0.25, y + s * 0.58, s * 0.50, s * 0.34, 5);
  ctx.fillStyle = '#C8694A';
  roundRect(ctx, x + s * 0.22, y + s * 0.56, s * 0.56, s * 0.10, 3);
  // Soil
  ctx.fillStyle = '#8B6914';
  ctx.beginPath();
  ctx.ellipse(x + s / 2, y + s * 0.60, s * 0.22, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stem
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + s / 2, y + s * 0.56);
  ctx.lineTo(x + s / 2, y + s * 0.28);
  ctx.stroke();
  // Leaves (round, cute)
  const leafColors = ['#66BB6A', '#81C784', '#4CAF50'];
  const leaves = [
    { cx: s / 2, cy: s * 0.20, rx: 8, ry: 6 },
    { cx: s * 0.34, cy: s * 0.30, rx: 6, ry: 5 },
    { cx: s * 0.66, cy: s * 0.30, rx: 6, ry: 5 },
    { cx: s * 0.38, cy: s * 0.42, rx: 5, ry: 4 },
    { cx: s * 0.62, cy: s * 0.42, rx: 5, ry: 4 },
  ];
  leaves.forEach((l, i) => {
    ctx.fillStyle = leafColors[i % leafColors.length];
    ctx.beginPath();
    ctx.ellipse(x + l.cx, y + l.cy, l.rx, l.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // Leaf highlight
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.ellipse(x + s / 2 - 2, y + s * 0.18, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, accent: string) {
  // Shelf frame
  ctx.fillStyle = '#A0784C';
  roundRect(ctx, x + 4, y + 4, s - 8, s - 8, 3);
  // Shelves
  ctx.fillStyle = '#B8956A';
  ctx.fillRect(x + 6, y + s * 0.33, s - 12, 2);
  ctx.fillRect(x + 6, y + s * 0.62, s - 12, 2);
  // Books (colorful)
  const bookColors = ['#FF8FA3', '#89CFF0', '#98DFAF', '#E8DEF8', '#FFE082', '#FF6B35'];
  for (let row = 0; row < 3; row++) {
    const by = y + 6 + row * (s * 0.29);
    let bx = x + 8;
    for (let b = 0; b < 4; b++) {
      const bw = 4 + Math.random() * 4;
      const bh = s * 0.24;
      ctx.fillStyle = bookColors[(row * 4 + b) % bookColors.length];
      ctx.fillRect(bx, by, bw, bh);
      bx += bw + 1;
    }
  }
}

function drawWhiteboard(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  // Frame
  ctx.fillStyle = '#CCCCCC';
  roundRect(ctx, x + 3, y + 4, s - 6, s * 0.7, 3);
  // Board
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, x + 6, y + 7, s - 12, s * 0.62, 2);
  // Some doodles
  ctx.strokeStyle = '#FF6B35';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 16);
  ctx.lineTo(x + s - 14, y + 16);
  ctx.stroke();
  ctx.strokeStyle = '#89CFF0';
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 22);
  ctx.lineTo(x + s * 0.6, y + 22);
  ctx.stroke();
  // Tray
  ctx.fillStyle = '#AAAAAA';
  ctx.fillRect(x + 8, y + s * 0.7, s - 16, 3);
  // Marker
  ctx.fillStyle = '#FF6B35';
  ctx.fillRect(x + 12, y + s * 0.68, 8, 3);
  // Stand
  ctx.fillStyle = '#999999';
  ctx.fillRect(x + s / 2 - 2, y + s * 0.75, 4, s * 0.2);
  ctx.fillRect(x + s * 0.3, y + s * 0.92, s * 0.4, 3);
}

function drawSofa(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, accent: string) {
  // Sofa body
  ctx.fillStyle = accent;
  roundRect(ctx, x + 3, y + s * 0.28, s - 6, s * 0.48, 8);
  // Seat cushion
  ctx.fillStyle = lighten(accent, 20);
  roundRect(ctx, x + 6, y + s * 0.48, s - 12, s * 0.23, 6);
  // Armrests
  ctx.fillStyle = darken(accent, 15);
  roundRect(ctx, x + 2, y + s * 0.30, 8, s * 0.38, 4);
  roundRect(ctx, x + s - 10, y + s * 0.30, 8, s * 0.38, 4);
  // Cushion lines
  ctx.strokeStyle = darken(accent, 20) + '60';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x + s / 2, y + s * 0.50);
  ctx.lineTo(x + s / 2, y + s * 0.68);
  ctx.stroke();
  // Legs
  ctx.fillStyle = '#A0784C';
  ctx.fillRect(x + 8, y + s * 0.80, 4, 5);
  ctx.fillRect(x + s - 12, y + s * 0.80, 4, 5);
}

function drawTable(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, deskColor: string) {
  // Table top (round)
  ctx.fillStyle = deskColor;
  ctx.beginPath();
  ctx.ellipse(x + s / 2, y + s * 0.40, s * 0.36, s * 0.20, 0, 0, Math.PI * 2);
  ctx.fill();
  // Edge
  ctx.fillStyle = darken(deskColor, 25);
  ctx.beginPath();
  ctx.ellipse(x + s / 2, y + s * 0.45, s * 0.34, s * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  // Leg
  ctx.fillStyle = darken(deskColor, 35);
  ctx.fillRect(x + s / 2 - 2, y + s * 0.50, 4, s * 0.32);
  ctx.fillRect(x + s * 0.32, y + s * 0.82, s * 0.36, 3);
  // Cup on table
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(x + s * 0.6, y + s * 0.36, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FF8FA3';
  ctx.beginPath();
  ctx.ellipse(x + s * 0.6, y + s * 0.35, 2, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawWaterCooler(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  // Body
  ctx.fillStyle = '#E0E0E0';
  roundRect(ctx, x + s * 0.28, y + s * 0.35, s * 0.44, s * 0.50, 4);
  // Water bottle
  ctx.fillStyle = '#B3E5FC';
  roundRect(ctx, x + s * 0.34, y + 6, s * 0.32, s * 0.32, 5);
  ctx.fillStyle = '#81D4FA';
  roundRect(ctx, x + s * 0.37, y + 10, s * 0.26, s * 0.18, 3);
  // Tap area
  ctx.fillStyle = '#BDBDBD';
  ctx.fillRect(x + s * 0.32, y + s * 0.55, s * 0.36, 3);
  // Taps
  ctx.fillStyle = '#F44336';
  ctx.beginPath();
  ctx.arc(x + s * 0.42, y + s * 0.58, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2196F3';
  ctx.beginPath();
  ctx.arc(x + s * 0.58, y + s * 0.58, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Legs
  ctx.fillStyle = '#999999';
  ctx.fillRect(x + s * 0.32, y + s * 0.85, 3, s * 0.1);
  ctx.fillRect(x + s * 0.65, y + s * 0.85, 3, s * 0.1);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function lighten(hex: string, amt: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amt);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amt);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amt);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function darken(hex: string, amt: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amt);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amt);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amt);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function generateOfficeMap(floor: number): number[][] {
  const W = 20;
  const H = 15;

  // Base: all floor
  const map: number[][] = Array.from({ length: H }, () => Array(W).fill(TILE.FLOOR));

  // Walls (top 2 rows and sides)
  for (let x = 0; x < W; x++) {
    map[0][x] = TILE.WALL;
    map[1][x] = TILE.WALL;
  }
  for (let y = 0; y < H; y++) {
    map[y][0] = TILE.WALL;
    map[y][W - 1] = TILE.WALL;
  }

  // Subtle floor pattern
  for (let y = 2; y < H; y++) {
    for (let x = 1; x < W - 1; x++) {
      if ((x + y) % 5 === 0) map[y][x] = TILE.FLOOR_ALT;
    }
  }

  // Door (1×2 세로 — 벽 2줄 활용)
  map[0][Math.floor(W / 2)] = TILE.DOOR;
  map[1][Math.floor(W / 2)] = TILE.DOOR;

  // Workstation rows (2x2 desk + chairs below)
  const deskRows = floor % 2 === 0 ? [3, 8] : [4, 9];
  for (const row of deskRows) {
    if (row + 2 >= H - 1) continue;
    for (let x = 2; x < W - 4; x += 5) {
      // 2x2 workstation block
      map[row][x] = TILE.WORKSTATION;
      map[row][x + 1] = TILE.WORKSTATION;
      map[row + 1][x] = TILE.WORKSTATION;
      map[row + 1][x + 1] = TILE.WORKSTATION;
      // Chairs in front
      map[row + 2][x] = TILE.CHAIR;
      map[row + 2][x + 1] = TILE.CHAIR;
    }
  }

  // Meeting area (varies by floor)
  const meetX = floor % 2 === 0 ? 14 : 2;
  const meetY = floor % 2 === 0 ? 12 : 12;
  if (meetY + 1 < H && meetX + 2 < W) {
    map[meetY][meetX] = TILE.SOFA;
    map[meetY][meetX + 1] = TILE.TABLE;
    map[meetY][meetX + 2] = TILE.SOFA;
  }

  // Whiteboard on wall
  map[2][3] = TILE.WHITEBOARD;

  // Bookshelf against wall (1×2 세로 — 벽+바닥 활용)
  map[1][W - 4] = TILE.BOOKSHELF;
  map[2][W - 4] = TILE.BOOKSHELF;
  map[1][W - 5] = TILE.BOOKSHELF;
  map[2][W - 5] = TILE.BOOKSHELF;

  // Plants at corners and decorative spots
  map[2][1] = TILE.PLANT;
  map[2][W - 2] = TILE.PLANT;
  map[H - 2][1] = TILE.PLANT;
  map[H - 2][W - 2] = TILE.PLANT;
  // Extra plant mid-row
  map[6][1] = TILE.PLANT;
  map[10][W - 2] = TILE.PLANT;

  // Water cooler
  map[H - 3][Math.floor(W / 2)] = TILE.WATER_COOLER;

  return map;
}

export function generateCollisionMap(mapData: number[][]): boolean[][] {
  const BLOCKING = new Set<number>([
    TILE.WALL,
    TILE.WORKSTATION,
    TILE.PLANT,
    TILE.BOOKSHELF,
    TILE.WHITEBOARD,
    TILE.TABLE,
    TILE.WATER_COOLER,
  ]);
  return mapData.map((row) => row.map((tile) => BLOCKING.has(tile)));
}

// Chair positions for sit interaction
export function getChairPositions(mapData: number[][]): Array<{ x: number; y: number }> {
  const chairs: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < mapData.length; y++) {
    for (let x = 0; x < mapData[y].length; x++) {
      if (mapData[y][x] === TILE.CHAIR) {
        chairs.push({ x, y });
      }
    }
  }
  return chairs;
}
