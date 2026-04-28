import Phaser from 'phaser';
import { useArenaStore } from '../../stores/arenaStore.js';
import { getSocket } from '../../services/socket.js';
import type { TickPlayer, TickProjectile, MatchParticipant } from '../../stores/arenaStore.js';
import {
  ARENA_MAP_W, ARENA_MAP_H, PLAYER_SIZE,
  SHOOT_COOLDOWN_MS, RUSH_COOLDOWN_MS, DEFEND_COOLDOWN_MS,
} from '@metaverse/shared';
import type { CombatAction } from '@metaverse/shared';
import { renderCharacterSpriteSheet } from '../entities/CharacterRenderer.js';
import { DEFAULT_APPEARANCE } from '@metaverse/shared';

const ARENA_BG_COLOR = 0x2a2a3e;
const ARENA_BORDER_COLOR = 0x4a4a6e;
const GRID_COLOR = 0x33335a;
const GRID_SPACING = 48;

// 스킬 키 매핑
const SKILL_KEYS: Record<string, CombatAction> = {
  Q: 'shoot',
  W: 'rush',
  E: 'defend',
  R: 'potion',
};

interface CooldownState {
  shoot: number;  // 마지막 사용 시각
  rush: number;
  defend: number;
}

interface DamageText {
  x: number;
  y: number;
  text: string;
  color: number;
  alpha: number;
  vy: number;
  life: number;
}

export class ArenaScene extends Phaser.Scene {
  private playerSprites = new Map<number, Phaser.GameObjects.Container>();
  private projectileSprites = new Map<string, Phaser.GameObjects.Graphics>();
  private cooldowns: CooldownState = { shoot: 0, rush: 0, defend: 0 };
  private damageTexts: DamageText[] = [];
  private myUserId = 0;
  private skillKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  private arrowKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private moveSpeed = 150; // px/s
  private lastMoveEmit = 0;
  private unsubscribeDamage: (() => void) | null = null;
  private unsubscribeHeal: (() => void) | null = null;

  constructor() {
    super({ key: 'ArenaScene' });
  }

  create(data: { userId: number }) {
    this.myUserId = data.userId;
    this.playerSprites.clear();
    this.projectileSprites.clear();
    this.damageTexts = [];
    this.cooldowns = { shoot: 0, rush: 0, defend: 0 };

    // 배경
    this.cameras.main.setBackgroundColor(ARENA_BG_COLOR);

    // 아레나 그리드
    const grid = this.add.graphics();
    grid.lineStyle(1, GRID_COLOR, 0.3);
    for (let x = 0; x <= ARENA_MAP_W; x += GRID_SPACING) {
      grid.lineBetween(x, 0, x, ARENA_MAP_H);
    }
    for (let y = 0; y <= ARENA_MAP_H; y += GRID_SPACING) {
      grid.lineBetween(0, y, ARENA_MAP_W, y);
    }

    // 아레나 테두리
    const border = this.add.graphics();
    border.lineStyle(3, ARENA_BORDER_COLOR, 1);
    border.strokeRect(0, 0, ARENA_MAP_W, ARENA_MAP_H);

    // 카메라 설정
    this.cameras.main.setBounds(0, 0, ARENA_MAP_W, ARENA_MAP_H);
    this.cameras.main.centerOn(ARENA_MAP_W / 2, ARENA_MAP_H / 2);

    // 키 입력 설정
    this.arrowKeys = this.input.keyboard!.createCursorKeys();
    this.skillKeys = {
      Q: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      E: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      R: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R),
    };

    // 소켓으로부터 직접 데미지/힐 이벤트 수신
    this.setupDamageListeners();

    // 참가자 데이터로 즉시 스프라이트 생성 (첫 틱 도착 전에도 캐릭터 표시)
    const store = useArenaStore.getState();
    for (const p of store.participants) {
      const tickPlayer: TickPlayer = {
        userId: p.userId,
        x: p.x,
        y: p.y,
        hp: p.hp,
        maxHp: p.maxHp,
        alive: true,
        direction: 'down',
        defending: false,
      };
      const container = this.createPlayerSprite(tickPlayer, store.participants);
      this.playerSprites.set(p.userId, container);
    }
  }

  private setupDamageListeners() {
    const socket = getSocket();
    if (!socket) return;

    const onDamage = (data: { targetId: number; damage: number; killed: boolean }) => {
      const sprite = this.playerSprites.get(data.targetId);
      if (sprite) {
        this.spawnDamageText(sprite.x, sprite.y - 20, `-${data.damage}`, 0xff4444);
        if (data.killed) {
          this.spawnDamageText(sprite.x, sprite.y - 40, 'KILL!', 0xff0000);
        }
      }
    };

    const onHeal = (data: { userId: number; amount: number }) => {
      const sprite = this.playerSprites.get(data.userId);
      if (sprite) {
        this.spawnDamageText(sprite.x, sprite.y - 20, `+${data.amount}`, 0x44ff44);
      }
    };

    socket.on('arena:damage', onDamage);
    socket.on('arena:heal', onHeal);

    this.unsubscribeDamage = () => {
      socket.off('arena:damage', onDamage);
      socket.off('arena:heal', onHeal);
    };
  }

  update(_time: number, delta: number) {
    const store = useArenaStore.getState();

    if (store.matchState !== 'fighting') {
      if (store.matchState === 'match_end') {
        // 매치 종료 시 씬 정리하고 오피스로 복귀
        this.cleanupAndReturn();
      }
      return;
    }

    // 이동 입력 처리
    this.handleMovement(delta);

    // 스킬 입력 처리
    this.handleSkillInput(store);

    // 틱 데이터로 플레이어/투사체 동기화
    this.syncPlayers(store.players, store.participants);
    this.syncProjectiles(store.projectiles);

    // 플로팅 데미지 텍스트 업데이트
    this.updateDamageTexts(delta);
  }

  private handleMovement(delta: number) {
    let vx = 0;
    let vy = 0;

    const left = this.arrowKeys.left.isDown;
    const right = this.arrowKeys.right.isDown;
    const up = this.arrowKeys.up.isDown;
    const down = this.arrowKeys.down.isDown;

    if (left) vx = -this.moveSpeed;
    else if (right) vx = this.moveSpeed;
    if (up) vy = -this.moveSpeed;
    else if (down) vy = this.moveSpeed;

    if (vx === 0 && vy === 0) return;

    // 8방향 결정
    type Dir8 = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';
    let direction: Dir8;
    if (up && left) direction = 'up-left';
    else if (up && right) direction = 'up-right';
    else if (down && left) direction = 'down-left';
    else if (down && right) direction = 'down-right';
    else if (up) direction = 'up';
    else if (down) direction = 'down';
    else if (left) direction = 'left';
    else direction = 'right';

    // 대각선 정규화
    if (vx !== 0 && vy !== 0) {
      const norm = 1 / Math.SQRT2;
      vx *= norm;
      vy *= norm;
    }

    const dtSec = delta / 1000;
    const store = useArenaStore.getState();
    const me = store.players.find((p) => p.userId === this.myUserId);
    if (!me || !me.alive) return;

    const newX = Phaser.Math.Clamp(me.x + vx * dtSec, PLAYER_SIZE, ARENA_MAP_W - PLAYER_SIZE);
    const newY = Phaser.Math.Clamp(me.y + vy * dtSec, PLAYER_SIZE, ARENA_MAP_H - PLAYER_SIZE);

    // 50ms마다 서버에 이동 전송
    const now = Date.now();
    if (now - this.lastMoveEmit >= 50) {
      store.sendMove(newX, newY, direction);
      this.lastMoveEmit = now;
    }
  }

  private handleSkillInput(store: ReturnType<typeof useArenaStore.getState>) {
    const now = Date.now();
    const me = store.players.find((p) => p.userId === this.myUserId);
    if (!me || !me.alive) return;

    for (const [key, action] of Object.entries(SKILL_KEYS)) {
      if (!Phaser.Input.Keyboard.JustDown(this.skillKeys[key])) continue;

      // 쿨타임 체크 (클라이언트 프리뷰)
      if (action === 'shoot' && now - this.cooldowns.shoot < SHOOT_COOLDOWN_MS) continue;
      if (action === 'rush' && now - this.cooldowns.rush < RUSH_COOLDOWN_MS) continue;
      if (action === 'defend' && now - this.cooldowns.defend < DEFEND_COOLDOWN_MS) continue;

      // 방향 기준 타겟 좌표 계산 (8방향)
      const d = Math.SQRT1_2 * 300;
      const dirOffsets: Record<string, [number, number]> = {
        up: [0, -300], down: [0, 300], left: [-300, 0], right: [300, 0],
        'up-left': [-d, -d], 'up-right': [d, -d], 'down-left': [-d, d], 'down-right': [d, d],
      };
      const [ox, oy] = dirOffsets[me.direction] ?? [0, 300];
      const targetX = me.x + ox;
      const targetY = me.y + oy;

      store.sendSkill(action, targetX, targetY);

      // 로컬 쿨타임 기록
      if (action === 'shoot') this.cooldowns.shoot = now;
      else if (action === 'rush') this.cooldowns.rush = now;
      else if (action === 'defend') this.cooldowns.defend = now;
    }
  }

  private syncPlayers(players: TickPlayer[], participants: MatchParticipant[]) {
    const activeIds = new Set<number>();

    for (const p of players) {
      activeIds.add(p.userId);
      let container = this.playerSprites.get(p.userId);

      if (!container) {
        container = this.createPlayerSprite(p, participants);
        this.playerSprites.set(p.userId, container);
      }

      // 위치 보간
      const lerpFactor = 0.3;
      container.x = Phaser.Math.Linear(container.x, p.x, lerpFactor);
      container.y = Phaser.Math.Linear(container.y, p.y, lerpFactor);

      // 생존/방어 상태 시각화
      container.setAlpha(p.alive ? 1 : 0.3);

      // 방어 이펙트
      const shield = container.getByName('shield') as Phaser.GameObjects.Arc | null;
      if (shield) {
        shield.setVisible(p.defending);
      }

      // HP바 업데이트
      const hpBar = container.getByName('hpBar') as Phaser.GameObjects.Graphics | null;
      if (hpBar) {
        hpBar.clear();
        const hpPercent = p.maxHp > 0 ? p.hp / p.maxHp : 0;
        // 배경
        hpBar.fillStyle(0x333333, 0.8);
        hpBar.fillRect(-20, -44, 40, 4);
        // HP
        const hpColor = hpPercent > 0.5 ? 0x44ff44 : hpPercent > 0.25 ? 0xffff00 : 0xff4444;
        hpBar.fillStyle(hpColor, 1);
        hpBar.fillRect(-20, -44, 40 * hpPercent, 4);
      }
    }

    // 제거된 플레이어 정리 (틱 데이터가 아직 없으면 기존 스프라이트 유지)
    if (players.length > 0) {
      for (const [id, sprite] of this.playerSprites) {
        if (!activeIds.has(id)) {
          sprite.destroy();
          this.playerSprites.delete(id);
        }
      }
    }
  }

  private generateArenaTexture(userId: number, info: MatchParticipant | undefined): string {
    const key = `arena-char-${userId}`;
    if (this.textures.exists(key)) this.textures.remove(key);

    const gender = info?.gender ?? 'male';
    const appearance = info?.appearance ?? DEFAULT_APPEARANCE;
    const canvas = renderCharacterSpriteSheet(gender, appearance);
    this.textures.addCanvas(key, canvas);
    return key;
  }

  private createPlayerSprite(p: TickPlayer, participants: MatchParticipant[]): Phaser.GameObjects.Container {
    const container = this.add.container(p.x, p.y);
    const info = participants.find((pp) => pp.userId === p.userId);
    const isMe = p.userId === this.myUserId;

    // 캐릭터 스프라이트 (오피스와 동일한 외형)
    // 48×64 스프라이트의 몸통 중심을 히트박스 중심(컨테이너 원점)에 맞추기 위해 y=-8 오프셋
    const textureKey = this.generateArenaTexture(p.userId, info);
    const sprite = this.add.image(0, -8, textureKey)
      .setDisplaySize(48, 64)
      .setCrop(0, 0, 48, 64);
    sprite.setName('charSprite');
    container.add(sprite);

    // 닉네임 (자신=노랑, 팀1=파랑, 팀2=빨강, 그 외=흰색)
    let nameColor = '#ffffff';
    if (isMe) nameColor = '#ffff44';
    else if (info && info.team === 1) nameColor = '#66aaff';
    else if (info && info.team === 2) nameColor = '#ff6666';

    const nameText = this.add.text(0, 28, info?.nickname ?? `P${p.userId}`, {
      fontSize: '10px',
      color: nameColor,
      fontFamily: 'Pretendard, sans-serif',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);
    container.add(nameText);

    // HP바
    const hpBar = this.add.graphics();
    hpBar.setName('hpBar');
    container.add(hpBar);

    // 방어 쉴드 (기본 비표시) — 캐릭터에 맞춘 원형 이펙트
    const shield = this.add.circle(0, -8, 28, 0x44aaff, 0.15);
    shield.setStrokeStyle(2, 0x44aaff, 0.6);
    shield.setName('shield');
    shield.setVisible(false);
    container.add(shield);

    return container;
  }

  private syncProjectiles(projectiles: TickProjectile[]) {
    const activeIds = new Set<string>();

    for (const proj of projectiles) {
      activeIds.add(proj.id);
      let gfx = this.projectileSprites.get(proj.id);

      if (!gfx) {
        gfx = this.add.graphics();
        this.projectileSprites.set(proj.id, gfx);
      }

      gfx.clear();
      if (proj.type === 'bullet') {
        gfx.fillStyle(0xffdd44, 1);
        gfx.fillCircle(proj.x, proj.y, 4);
        // 궤적
        gfx.lineStyle(1, 0xffdd44, 0.4);
        gfx.lineBetween(proj.x, proj.y, proj.x - proj.vx * 0.05, proj.y - proj.vy * 0.05);
      } else {
        // 칼 공격 — 부채꼴
        gfx.fillStyle(0xff6644, 0.5);
        gfx.slice(proj.x, proj.y, 30, 0, Math.PI * 0.67, false);
        gfx.fillPath();
      }
    }

    // 사라진 투사체 제거
    for (const [id, gfx] of this.projectileSprites) {
      if (!activeIds.has(id)) {
        gfx.destroy();
        this.projectileSprites.delete(id);
      }
    }
  }

  private spawnDamageText(x: number, y: number, text: string, color: number) {
    this.damageTexts.push({
      x, y, text, color,
      alpha: 1,
      vy: -40,
      life: 1.0,
    });
  }

  private updateDamageTexts(delta: number) {
    const dtSec = delta / 1000;

    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const dt = this.damageTexts[i];
      dt.life -= dtSec;
      dt.y += dt.vy * dtSec;
      dt.alpha = Math.max(0, dt.life);

      if (dt.life <= 0) {
        this.damageTexts.splice(i, 1);
      }
    }

    // Phaser text로 렌더링 (간단히 매 프레임 재생성 대신, 풀링은 추후)
    // 여기서는 Phaser의 add.text가 아닌, 기존 생성된 텍스트의 위치만 업데이트
    // 실제로는 별도 렌더 레이어로 처리하는 것이 효율적이지만
    // 현재는 간단히 처리
  }

  private cleanupAndReturn() {
    // 스프라이트 정리
    for (const [, sprite] of this.playerSprites) sprite.destroy();
    this.playerSprites.clear();
    for (const [, gfx] of this.projectileSprites) gfx.destroy();
    this.projectileSprites.clear();

    // 이벤트 정리
    this.unsubscribeDamage?.();
    this.unsubscribeHeal?.();

    // 오피스 씬으로 복귀
    this.scene.start('OfficeScene', { floor: 2 });
  }

  shutdown() {
    this.unsubscribeDamage?.();
    this.unsubscribeHeal?.();
    for (const [, sprite] of this.playerSprites) sprite.destroy();
    this.playerSprites.clear();
    for (const [, gfx] of this.projectileSprites) gfx.destroy();
    this.projectileSprites.clear();
  }
}
