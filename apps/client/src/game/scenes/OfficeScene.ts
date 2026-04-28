import Phaser from 'phaser';
import { generateOfficeMap, generateCollisionMap, getChairPositions, TILE } from '../assets/AssetGenerator.js';
import { useAuthStore } from '../../stores/authStore.js';
import { getSocket } from '../../services/socket.js';
import { SpeechBubble, TypingIndicator } from '../entities/SpeechBubble.js';
import { createLevelUpEffect, createQuestCompleteEffect, createMoveTrail } from '../entities/ParticleEffects.js';
import { renderCharacterSpriteSheet } from '../entities/CharacterRenderer.js';
import { ItemBox } from '../entities/ItemBox.js';
import { DEFAULT_APPEARANCE } from '@metaverse/shared';
import type { PlayerState, CharacterAppearance, Gender } from '@metaverse/shared';

const TILE_SIZE = 48;
const MOVE_SPEED = 160;

export class OfficeScene extends Phaser.Scene {
  private localPlayer!: Phaser.GameObjects.Container;
  private remotePlayers: Map<number, Phaser.GameObjects.Container> = new Map();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private collisionMap: boolean[][] = [];
  private mapData: number[][] = [];
  private currentFloor: number = 2;
  private lastSentX: number = 0;
  private lastSentY: number = 0;
  private localPlayerBody!: Phaser.Physics.Arcade.Body;

  // Speech bubbles & typing indicators
  private speechBubbles: Map<number, SpeechBubble> = new Map();
  private typingIndicators: Map<number, TypingIndicator> = new Map();
  private moveTrailCounter: number = 0;
  private chairPositions: Array<{ x: number; y: number }> = [];
  private isSitting: boolean = false;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private lastClickTime: number = 0;
  private lastClickTileX: number = -1;
  private lastClickTileY: number = -1;

  // Item boxes
  private itemBoxes: Map<string, ItemBox> = new Map();
  private pickupCooldown: boolean = false;

  constructor() {
    super({ key: 'OfficeScene' });
  }

  init(data: { floor: number }) {
    this.currentFloor = data.floor || 2;
  }

  create() {
    this.remotePlayers.clear();
    this.speechBubbles.clear();
    this.typingIndicators.clear();
    this.itemBoxes.clear();

    this.isSitting = false;
    this.drawMap();
    this.chairPositions = getChairPositions(this.mapData);
    this.createLocalPlayer();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey('SPACE');
    // 모든 키의 글로벌 캡처(preventDefault) 해제 → HTML input에서 정상 입력 가능
    this.input.keyboard!.disableGlobalCapture();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const tileX = Math.floor(pointer.worldX / TILE_SIZE);
      const tileY = Math.floor(pointer.worldY / TILE_SIZE);
      const now = Date.now();

      // Double-click detection on chair tiles
      const isChair = this.chairPositions.some((c) => c.x === tileX && c.y === tileY);
      if (isChair && now - this.lastClickTime < 400 && this.lastClickTileX === tileX && this.lastClickTileY === tileY) {
        this.sitOnChair(tileX, tileY);
        this.lastClickTime = 0;
        return;
      }

      this.lastClickTime = now;
      this.lastClickTileX = tileX;
      this.lastClickTileY = tileY;

      if (this.isSitting) this.standUp();
      this.moveToPoint(pointer.worldX, pointer.worldY);
    });

    this.setupSocketListeners();

    this.cameras.main.startFollow(this.localPlayer, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);

    const floorNames: Record<number, string> = { 2: '2F', 3: '3F', 4: '4F', 5: '5F', 6: '6F' };
    this.add.text(16, 16, `🏢 ${floorNames[this.currentFloor] || ''}`, {
      fontSize: '16px',
      color: '#5D4037',
      fontFamily: 'Pretendard, sans-serif',
      backgroundColor: '#FFFFFF80',
      padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(100);
  }

  private drawMap() {
    this.mapData = generateOfficeMap(this.currentFloor);
    this.collisionMap = generateCollisionMap(this.mapData);
    const tilesetKey = `tileset-floor-${this.currentFloor}`;
    const drawnWorkstations = new Set<string>();
    const drawnBookshelves = new Set<string>();
    const drawnDoors = new Set<string>();

    for (let y = 0; y < this.mapData.length; y++) {
      for (let x = 0; x < this.mapData[y].length; x++) {
        const tileIndex = this.mapData[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        // Always draw floor underneath
        this.add.image(px + TILE_SIZE / 2, py + TILE_SIZE / 2, tilesetKey)
          .setCrop(0, 0, TILE_SIZE, TILE_SIZE)
          .setDisplaySize(TILE_SIZE, TILE_SIZE);

        // Draw 2x2 workstation as a single large graphic
        if (tileIndex === TILE.WORKSTATION) {
          const key = `${Math.floor(x / 2) * 2},${Math.floor(y / 2) * 2}`;
          if (!drawnWorkstations.has(key)) {
            drawnWorkstations.add(key);
            // Find top-left of this 2x2 cluster
            const ox = (x > 0 && this.mapData[y][x - 1] === TILE.WORKSTATION) ? x - 1 : x;
            const oy = (y > 0 && this.mapData[y - 1]?.[x] === TILE.WORKSTATION) ? y - 1 : y;
            this.drawLargeWorkstation(ox * TILE_SIZE, oy * TILE_SIZE);
          }
          continue;
        }

        // Draw 1×2 bookshelf (세로 2칸)
        if (tileIndex === TILE.BOOKSHELF) {
          const bkey = `${x},${Math.min(y, (this.mapData[y - 1]?.[x] === TILE.BOOKSHELF) ? y - 1 : y)}`;
          if (!drawnBookshelves.has(bkey)) {
            drawnBookshelves.add(bkey);
            const oy = (y > 0 && this.mapData[y - 1]?.[x] === TILE.BOOKSHELF) ? y - 1 : y;
            this.drawLargeBookshelf(x * TILE_SIZE, oy * TILE_SIZE);
          }
          continue;
        }

        // Draw 1×2 door (세로 2칸)
        if (tileIndex === TILE.DOOR) {
          const dkey = `${x},${Math.min(y, (this.mapData[y - 1]?.[x] === TILE.DOOR) ? y - 1 : y)}`;
          if (!drawnDoors.has(dkey)) {
            drawnDoors.add(dkey);
            const oy = (y > 0 && this.mapData[y - 1]?.[x] === TILE.DOOR) ? y - 1 : y;
            this.drawLargeDoor(x * TILE_SIZE, oy * TILE_SIZE);
          }
          continue;
        }

        if (tileIndex > 0) {
          const col = tileIndex % 4;
          const row = Math.floor(tileIndex / 4);
          const img = this.add.image(px + TILE_SIZE / 2, py + TILE_SIZE / 2, tilesetKey)
            .setDisplaySize(TILE_SIZE, TILE_SIZE);
          img.setCrop(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

          if (this.collisionMap[y][x]) {
            img.setDepth(1);
          }
        }
      }
    }

    const worldW = this.mapData[0].length * TILE_SIZE;
    const worldH = this.mapData.length * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
  }

  private drawLargeWorkstation(px: number, py: number) {
    const S = TILE_SIZE * 2; // 2x2 tiles
    const g = this.add.graphics();
    g.setDepth(2);

    // Center the workstation compactly within the 2x2 tile area
    const cx = px + S / 2;
    const deskW = S * 0.52; // ~50px desk width
    const deskL = cx - deskW / 2;

    // Desk surface
    g.fillStyle(0xDEB887, 1);
    g.fillRoundedRect(deskL, py + S * 0.42, deskW, S * 0.22, 4);
    // Desk edge
    g.fillStyle(0xC8A06E, 1);
    g.fillRoundedRect(deskL + 2, py + S * 0.60, deskW - 4, S * 0.04, 2);
    // Desk legs
    g.fillStyle(0xA0784C, 1);
    g.fillRect(deskL + 4, py + S * 0.63, 3, S * 0.18);
    g.fillRect(deskL + deskW - 7, py + S * 0.63, 3, S * 0.18);

    // Monitor (centered, compact)
    const monW = S * 0.40; // ~38px monitor width
    const monL = cx - monW / 2;
    // Stand
    g.fillStyle(0x555555, 1);
    g.fillRect(cx - 1, py + S * 0.32, 3, 6);
    g.fillRect(cx - 5, py + S * 0.38, 10, 2);
    // Screen frame
    g.fillStyle(0x2D2D2D, 1);
    g.fillRoundedRect(monL, py + S * 0.14, monW, S * 0.17, 3);
    // Screen
    g.fillStyle(0x4FC3F7, 1);
    g.fillRoundedRect(monL + 3, py + S * 0.16, monW - 6, S * 0.12, 2);
    // Screen glow
    g.fillStyle(0xB3E5FC, 0.3);
    g.fillRect(monL + 5, py + S * 0.18, monW * 0.35, S * 0.04);
    // Code lines on screen
    g.fillStyle(0xFFFFFF, 0.4);
    for (let i = 0; i < 2; i++) {
      g.fillRect(monL + 5, py + S * 0.19 + i * 4, monW * (0.2 + Math.random() * 0.3), 1.5);
    }

    // Keyboard
    g.fillStyle(0x888888, 1);
    g.fillRoundedRect(cx - 10, py + S * 0.46, 20, S * 0.05, 2);
    g.fillStyle(0xAAAAAA, 1);
    g.fillRoundedRect(cx - 8, py + S * 0.47, 16, S * 0.03, 1);

    // Mouse
    g.fillStyle(0x999999, 1);
    g.fillRoundedRect(cx + 14, py + S * 0.46, 5, 7, 2);

    // Coffee mug
    g.fillStyle(0xFFFFFF, 1);
    g.fillRoundedRect(deskL + deskW - 10, py + S * 0.44, 6, 7, 2);
    g.fillStyle(0xFF8FA3, 1);
    g.fillRoundedRect(deskL + deskW - 9, py + S * 0.45, 4, 2, 1);
  }

  private drawLargeBookshelf(px: number, py: number) {
    const W = TILE_SIZE;      // 48px 너비
    const H = TILE_SIZE * 2;  // 96px 높이 (1×2 타일)
    const g = this.add.graphics();
    g.setDepth(2);

    // 책장 프레임 (나무색)
    g.fillStyle(0xA0784C, 1);
    g.fillRoundedRect(px + 4, py + 4, W - 8, H - 8, 3);

    // 내부 배경
    g.fillStyle(0xC8A06E, 1);
    g.fillRoundedRect(px + 6, py + 6, W - 12, H - 12, 2);

    // 선반 4단
    const shelfColor = 0xB8956A;
    const shelfPositions = [0.25, 0.45, 0.65, 0.85];
    for (const ratio of shelfPositions) {
      g.fillStyle(shelfColor, 1);
      g.fillRect(px + 6, py + H * ratio, W - 12, 2);
    }

    // 각 칸에 책 배치
    const bookColors = [0xFF8FA3, 0x89CFF0, 0x98DFAF, 0xE8DEF8, 0xFFE082, 0xFF6B35];
    const sections = [
      { top: py + 6, bottom: py + H * 0.25 },
      { top: py + H * 0.25 + 2, bottom: py + H * 0.45 },
      { top: py + H * 0.45 + 2, bottom: py + H * 0.65 },
      { top: py + H * 0.65 + 2, bottom: py + H * 0.85 },
    ];
    for (let row = 0; row < sections.length; row++) {
      let bx = px + 8;
      const bh = sections[row].bottom - sections[row].top - 2;
      for (let b = 0; b < 4; b++) {
        const bw = 4 + Math.random() * 4;
        g.fillStyle(bookColors[(row * 4 + b) % bookColors.length], 1);
        g.fillRect(bx, sections[row].top + 1, bw, bh);
        bx += bw + 1;
      }
    }

    // 상단 장식 — 작은 화분
    g.fillStyle(0xE07B53, 1);
    g.fillRoundedRect(px + W / 2 - 5, py + 8, 10, 6, 2);
    g.fillStyle(0x66BB6A, 1);
    g.beginPath();
    g.arc(px + W / 2, py + 7, 4, 0, Math.PI * 2);
    g.fill();
  }

  private drawLargeDoor(px: number, py: number) {
    const W = TILE_SIZE;      // 48px 너비
    const H = TILE_SIZE * 2;  // 96px 높이 (1×2 타일)
    const g = this.add.graphics();
    g.setDepth(2);

    // 배경 (벽색)
    g.fillStyle(0xFAFAFA, 1);
    g.fillRect(px, py, W, H);

    // 문틀
    g.fillStyle(0xA0784C, 1);
    g.fillRoundedRect(px + 6, py + 2, W - 12, H - 4, 4);

    // 문 패널
    g.fillStyle(0xC8A06E, 1);
    g.fillRoundedRect(px + 10, py + 6, W - 20, H - 12, 3);

    // 상단 유리창 (더 크게)
    g.fillStyle(0xD6EEFF, 1);
    g.fillRoundedRect(px + 13, py + 10, W - 26, 24, 2);
    // 유리 반사
    g.fillStyle(0xFFFFFF, 0.3);
    g.fillRect(px + 15, py + 12, 6, 18);

    // 하단 패널 장식
    g.fillStyle(0xB8956A, 1);
    g.fillRoundedRect(px + 13, py + H * 0.45, W - 26, H * 0.35, 2);
    g.fillStyle(0xC8A06E, 0.5);
    g.fillRoundedRect(px + 15, py + H * 0.47, W - 30, H * 0.31, 1);

    // 손잡이
    g.fillStyle(0xFFD700, 1);
    g.beginPath();
    g.arc(px + W - 15, py + H * 0.50, 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle(0xFFF8DC, 1);
    g.beginPath();
    g.arc(px + W - 15, py + H * 0.50, 2, 0, Math.PI * 2);
    g.fill();
  }

  private getFrame(_key: string, _index: number) {
    return true;
  }

  private generatePlayerTexture(userId: number, gender: Gender, appearance: CharacterAppearance): string {
    const key = `char-player-${userId}`;
    if (this.textures.exists(key)) {
      this.textures.remove(key);
    }
    const canvas = renderCharacterSpriteSheet(gender, appearance);
    this.textures.addCanvas(key, canvas);
    return key;
  }

  private createLocalPlayer() {
    const startX = 5 * TILE_SIZE;
    const startY = 5 * TILE_SIZE;

    this.localPlayer = this.add.container(startX, startY);

    // Start with default texture, then update async
    const user = useAuthStore.getState().user;
    const defaultTexture = 'char-female';
    const sprite = this.add.image(0, 0, defaultTexture)
      .setDisplaySize(48, 64)
      .setCrop(0, 0, 48, 64);
    this.localPlayer.add(sprite);
    this.localPlayer.setSize(32, 32);
    this.localPlayer.setDepth(10);

    // Name tag for local player
    if (user) {
      const nameTag = this.add.text(0, -48, `🌰Lv.${user.level} ${user.nickname}`, {
        fontSize: '10px',
        color: '#5D4037',
        fontFamily: 'Pretendard, sans-serif',
        align: 'center',
      }).setOrigin(0.5);
      this.localPlayer.add(nameTag);

      // Async: load real appearance and update sprite
      const loadAppearance = () => {
        import('../../services/api.js').then(({ getCharacter }) =>
          getCharacter().then((char) => {
            if (char && this.localPlayer) {
              const key = this.generatePlayerTexture(user.id, char.gender as Gender, char.appearance);
              sprite.setTexture(key);
              sprite.setCrop(0, 0, 48, 64);
            }
          })
        ).catch(() => {});
      };
      loadAppearance();

      // 캐릭터 에디터에서 저장 시 스프라이트 갱신
      const onCharUpdated = () => loadAppearance();
      window.addEventListener('character:updated', onCharUpdated);
      this.events.on('shutdown', () => window.removeEventListener('character:updated', onCharUpdated));
    }

    this.physics.world.enable(this.localPlayer);
    this.localPlayerBody = this.localPlayer.body as Phaser.Physics.Arcade.Body;
    this.localPlayerBody.setCollideWorldBounds(true);

    this.lastSentX = startX;
    this.lastSentY = startY;
  }

  private setupSocketListeners() {
    const socket = getSocket();
    if (!socket) return;

    const user = useAuthStore.getState().user;
    const myUserId = user?.id;

    socket.on('floor:players', (players: PlayerState[]) => {
      this.clearRemotePlayers();
      players.forEach((p) => {
        if (p.userId !== myUserId) {
          this.addRemotePlayer(p);
        }
      });
    });

    socket.on('player:joined', (player: PlayerState) => {
      if (player.userId !== myUserId) {
        this.addRemotePlayer(player);
      }
    });

    socket.on('player:left', (userId: number) => {
      this.removeRemotePlayer(userId);
      // Clean up speech bubble and typing indicator
      this.speechBubbles.get(userId)?.destroy();
      this.speechBubbles.delete(userId);
      this.typingIndicators.get(userId)?.destroy();
      this.typingIndicators.delete(userId);
    });

    socket.on('player:moved', ({ userId, x, y }) => {
      this.moveRemotePlayer(userId, x, y);
    });

    // Speech bubble on public chat
    socket.on('chat:public', (msg) => {
      const senderId = msg.senderId;

      // Remove existing speech bubble for this user
      this.speechBubbles.get(senderId)?.destroy();

      let playerX: number, playerY: number;

      if (senderId === myUserId) {
        playerX = this.localPlayer.x;
        playerY = this.localPlayer.y;
      } else {
        const remoteContainer = this.remotePlayers.get(senderId);
        if (!remoteContainer) return;
        playerX = remoteContainer.x;
        playerY = remoteContainer.y;
      }

      // Remove typing indicator when message is sent
      this.typingIndicators.get(senderId)?.destroy();
      this.typingIndicators.delete(senderId);

      const bubble = new SpeechBubble(this, playerX, playerY, msg.content);
      this.speechBubbles.set(senderId, bubble);
    });

    // Typing indicator
    socket.on('chat:typing', ({ userId, isTyping }) => {
      if (userId === myUserId) return;

      if (isTyping) {
        if (!this.typingIndicators.has(userId)) {
          const remoteContainer = this.remotePlayers.get(userId);
          if (remoteContainer) {
            const indicator = new TypingIndicator(this, remoteContainer.x, remoteContainer.y);
            this.typingIndicators.set(userId, indicator);
          }
        }
      } else {
        this.typingIndicators.get(userId)?.destroy();
        this.typingIndicators.delete(userId);
      }
    });

    // Nickname change sync
    socket.on('player:nickname-changed', ({ userId: uid, nickname }) => {
      if (uid === myUserId) {
        const nameTag = this.localPlayer.getAt(1) as Phaser.GameObjects.Text | undefined;
        if (nameTag && 'setText' in nameTag) nameTag.setText(nickname);
      } else {
        const remote = this.remotePlayers.get(uid);
        if (remote) {
          const nameTag = remote.getAt(1) as Phaser.GameObjects.Text | undefined;
          if (nameTag && 'setText' in nameTag) nameTag.setText(nickname);
        }
      }
    });

    // Level up effect
    socket.on('level:up', ({ userId: uid, newLevel }) => {
      if (uid === myUserId) {
        createLevelUpEffect(this, this.localPlayer.x, this.localPlayer.y);
        // Update level badge
        const badge = this.localPlayer.getAt(2) as Phaser.GameObjects.Text;
        if (badge) badge.setText(`🌰 Lv.${newLevel}`);
      } else {
        const remote = this.remotePlayers.get(uid);
        if (remote) {
          createLevelUpEffect(this, remote.x, remote.y);
        }
      }
    });

    // Emote display
    socket.on('player:emote', ({ userId: uid, emoji }) => {
      let targetX: number, targetY: number;
      if (uid === myUserId) {
        targetX = this.localPlayer.x;
        targetY = this.localPlayer.y;
      } else {
        const remote = this.remotePlayers.get(uid);
        if (!remote) return;
        targetX = remote.x;
        targetY = remote.y;
      }
      this.showEmote(targetX, targetY, emoji);
    });

    // Quest completed effect
    socket.on('quest:completed', () => {
      createQuestCompleteEffect(this, this.localPlayer.x, this.localPlayer.y);
    });

    // ── Item Box events ──

    socket.on('itembox:spawned', (data) => {
      if (data.floor !== this.currentFloor) return;
      if (this.itemBoxes.has(data.boxId)) return;
      const box = new ItemBox(this, data.boxId, data.x, data.y);
      this.itemBoxes.set(data.boxId, box);
    });

    socket.on('itembox:picked', (data) => {
      const box = this.itemBoxes.get(data.boxId);
      if (box) {
        box.playPickupEffect();
        this.itemBoxes.delete(data.boxId);
      }
      // 토스트 알림
      this.showItemBoxToast(data.userId === myUserId
        ? `🎁 ${data.itemName} (${data.rarity}) 획득!`
        : `📦 다른 유저가 ${data.itemName}을(를) 획득했습니다`);
    });

    socket.on('itembox:expired', (data) => {
      const box = this.itemBoxes.get(data.boxId);
      if (box) {
        box.playExpireEffect();
        this.itemBoxes.delete(data.boxId);
      }
    });

    socket.on('itembox:announce', (data) => {
      if (data.floor !== this.currentFloor) return;
      this.showItemBoxToast(`⏰ ${data.secondsUntil}초 후 아이템 박스가 출현합니다!`);
    });
  }

  private addRemotePlayer(player: PlayerState) {
    if (this.remotePlayers.has(player.userId)) return;

    const container = this.add.container(player.x, player.y);

    const playerAppearance = player.appearance || DEFAULT_APPEARANCE;
    const textureKey = this.generatePlayerTexture(player.userId, player.gender, playerAppearance);
    const sprite = this.add.image(0, 0, textureKey)
      .setDisplaySize(48, 64)
      .setCrop(0, 0, 48, 64);
    container.add(sprite);
    container.setDepth(10);

    const nameTag = this.add.text(0, -48, `🌰Lv.${player.level} ${player.nickname}`, {
      fontSize: '10px',
      color: '#5D4037',
      fontFamily: 'Pretendard, sans-serif',
      align: 'center',
    }).setOrigin(0.5);
    container.add(nameTag);

    this.remotePlayers.set(player.userId, container);
  }

  private removeRemotePlayer(userId: number) {
    const container = this.remotePlayers.get(userId);
    if (container) {
      container.destroy();
      this.remotePlayers.delete(userId);
    }
  }

  private moveRemotePlayer(userId: number, x: number, y: number) {
    const container = this.remotePlayers.get(userId);
    if (!container) return;

    this.tweens.add({
      targets: container,
      x,
      y,
      duration: 150,
      ease: 'Power1',
    });

    // Speech bubble and typing indicator positions are synced in update() loop
  }

  private clearRemotePlayers() {
    this.remotePlayers.forEach((c) => c.destroy());
    this.remotePlayers.clear();
  }

  private moveToPoint(worldX: number, worldY: number) {
    const dx = worldX - this.localPlayer.x;
    const dy = worldY - this.localPlayer.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) return;

    const duration = (dist / MOVE_SPEED) * 1000;

    this.tweens.add({
      targets: this.localPlayer,
      x: worldX,
      y: worldY,
      duration: Math.min(duration, 2000),
      ease: 'Power2',
      onUpdate: () => this.sendPositionUpdate(),
    });
  }

  private sendPositionUpdate() {
    const socket = getSocket();
    if (!socket) return;

    const x = this.localPlayer.x;
    const y = this.localPlayer.y;
    const dx = x - this.lastSentX;
    const dy = y - this.lastSentY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      let direction: 'up' | 'down' | 'left' | 'right' = 'down';
      if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? 'right' : 'left';
      } else {
        direction = dy > 0 ? 'down' : 'up';
      }

      socket.emit('player:move', { x, y, direction });
      this.lastSentX = x;
      this.lastSentY = y;
    }
  }

  private sitOnChair(tileX: number, tileY: number) {
    const chairX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const chairY = tileY * TILE_SIZE + TILE_SIZE / 2;

    // Move to chair first, then sit
    this.tweens.add({
      targets: this.localPlayer,
      x: chairX,
      y: chairY,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.isSitting = true;
        this.localPlayerBody.setVelocity(0, 0);

        const socket = getSocket();
        if (socket) {
          socket.emit('player:sit', { x: chairX, y: chairY });
        }

        // PC에 앉으면 Go Launcher 팝업 열기
        import('../../stores/goLauncherStore.js').then(({ useGoLauncherStore }) => {
          useGoLauncherStore.getState().open();
        });
      },
    });
  }

  private standUp() {
    this.isSitting = false;
    const socket = getSocket();
    if (socket) {
      socket.emit('player:stand');
    }
  }

  private isBlocked(tileX: number, tileY: number): boolean {
    if (tileY < 0 || tileY >= this.collisionMap.length) return true;
    if (tileX < 0 || tileX >= this.collisionMap[0].length) return true;
    return this.collisionMap[tileY][tileX];
  }

  private isInputFocused(): boolean {
    const tag = document.activeElement?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  update() {
    if (!this.localPlayer || !this.cursors) return;

    // Sync speech bubbles and typing indicators every frame (before any early return)
    const user = useAuthStore.getState().user;
    if (user) {
      const bubble = this.speechBubbles.get(user.id);
      if (bubble) bubble.updatePosition(this.localPlayer.x, this.localPlayer.y);
      const indicator = this.typingIndicators.get(user.id);
      if (indicator) indicator.updatePosition(this.localPlayer.x, this.localPlayer.y);
    }
    this.remotePlayers.forEach((container, userId) => {
      const bubble = this.speechBubbles.get(userId);
      if (bubble) bubble.updatePosition(container.x, container.y);
      const indicator = this.typingIndicators.get(userId);
      if (indicator) indicator.updatePosition(container.x, container.y);
    });

    // HTML input에 포커스가 있으면 게임 키 입력 무시
    if (this.isInputFocused()) {
      this.localPlayerBody.setVelocity(0, 0);
      return;
    }

    // Spacebar: sit on nearest chair or stand up
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      if (this.isSitting) {
        this.standUp();
        return;
      }
      const playerTileX = Math.floor(this.localPlayer.x / TILE_SIZE);
      const playerTileY = Math.floor(this.localPlayer.y / TILE_SIZE);
      const nearest = this.chairPositions.find(
        (c) => Math.abs(c.x - playerTileX) <= 1 && Math.abs(c.y - playerTileY) <= 1
      );
      if (nearest) {
        this.sitOnChair(nearest.x, nearest.y);
        return;
      }
    }

    // Stand up on movement key press while sitting
    if (this.isSitting) {
      const anyKey = this.cursors.left.isDown || this.cursors.right.isDown ||
        this.cursors.up.isDown || this.cursors.down.isDown;
      if (anyKey) {
        this.standUp();
      } else {
        this.localPlayerBody.setVelocity(0, 0);
        return;
      }
    }

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown) vx = -MOVE_SPEED;
    else if (this.cursors.right.isDown) vx = MOVE_SPEED;

    if (this.cursors.up.isDown) vy = -MOVE_SPEED;
    else if (this.cursors.down.isDown) vy = MOVE_SPEED;

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.localPlayerBody.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      const nextTileX = Math.floor((this.localPlayer.x + vx * 0.02) / TILE_SIZE);
      const nextTileY = Math.floor((this.localPlayer.y + vy * 0.02) / TILE_SIZE);

      if (this.isBlocked(nextTileX, nextTileY)) {
        this.localPlayerBody.setVelocity(0, 0);
      }

      this.sendPositionUpdate();

      // Bounce animation
      const sprite = this.localPlayer.first as Phaser.GameObjects.Image;
      if (sprite) {
        sprite.y = Math.sin(this.time.now * 0.01) * 2;
      }

      // Move trail particles (every 8 frames)
      this.moveTrailCounter++;
      if (this.moveTrailCounter % 8 === 0) {
        createMoveTrail(this, this.localPlayer.x, this.localPlayer.y);
      }

      // 근접 아이템 박스 자동 픽업
      this.checkItemBoxPickup();
    } else {
      // Idle bounce
      const sprite = this.localPlayer.first as Phaser.GameObjects.Image;
      if (sprite) {
        sprite.y = Math.sin(this.time.now * 0.003) * 1.5;
      }
    }

  }

  private showEmote(x: number, y: number, emoji: string) {
    const emoteText = this.add.text(x, y - 50, emoji, {
      fontSize: '28px',
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: emoteText,
      y: y - 90,
      alpha: { from: 1, to: 0 },
      scale: { from: 1.2, to: 0.6 },
      duration: 1500,
      ease: 'Power2',
      onComplete: () => emoteText.destroy(),
    });
  }

  private checkItemBoxPickup() {
    if (this.pickupCooldown) return;

    const px = this.localPlayer.x;
    const py = this.localPlayer.y;
    const PICKUP_DIST = 48; // 1타일 거리

    for (const [boxId, box] of this.itemBoxes) {
      const dx = px - box.x;
      const dy = py - box.y;
      if (dx * dx + dy * dy < PICKUP_DIST * PICKUP_DIST) {
        const socket = getSocket();
        if (socket) {
          socket.emit('itembox:pickup', { boxId });
          this.pickupCooldown = true;
          this.time.delayedCall(500, () => { this.pickupCooldown = false; });
        }
        break;
      }
    }
  }

  private showItemBoxToast(message: string) {
    const cam = this.cameras.main;
    const toast = this.add.text(
      cam.scrollX + cam.width / 2,
      cam.scrollY + 60,
      message,
      {
        fontSize: '14px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#FFFFFF',
        backgroundColor: '#00000099',
        padding: { x: 12, y: 6 },
      }
    ).setOrigin(0.5).setDepth(10000).setScrollFactor(0);

    this.tweens.add({
      targets: toast,
      alpha: { from: 1, to: 0 },
      y: toast.y - 30,
      duration: 2500,
      delay: 1500,
      onComplete: () => toast.destroy(),
    });
  }

  changeFloor(floor: number) {
    // Clean up speech bubbles and typing indicators
    this.speechBubbles.forEach((b) => b.destroy());
    this.speechBubbles.clear();
    this.typingIndicators.forEach((t) => t.destroy());
    this.typingIndicators.clear();

    // Clean up item boxes
    this.itemBoxes.forEach((box) => box.destroy());
    this.itemBoxes.clear();

    this.currentFloor = floor;
    this.scene.restart({ floor });
  }
}
