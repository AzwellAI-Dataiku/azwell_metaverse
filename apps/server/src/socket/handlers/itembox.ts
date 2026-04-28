import type { Server, Socket } from 'socket.io';
import {
  pickupBox,
  getActiveBoxes,
  setBoxEventHandler,
  startItemBoxSpawner,
} from '../../services/itemBoxService.js';
import { addItem } from '../../services/inventoryService.js';
import { RARITY_NAMES } from '@metaverse/shared';
import type { ItemRarity } from '@metaverse/shared';

export function registerItemBoxHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId as number;

  // 층 입장 시 현재 활성 박스 전송
  socket.on('floor:join', (floor: number) => {
    const boxes = getActiveBoxes(floor);
    for (const box of boxes) {
      socket.emit('itembox:spawned', {
        boxId: box.boxId,
        floor: box.floor,
        x: box.x,
        y: box.y,
      });
    }
  });

  // 박스 픽업
  socket.on('itembox:pickup', async (data) => {
    const result = pickupBox(userId, data.boxId);

    if (!result.success || !result.items) {
      return;
    }

    // 아이템을 인벤토리에 추가
    for (const item of result.items) {
      await addItem(userId, item.id);
    }

    // 픽업 알림을 같은 층에 브로드캐스트
    const floor = socket.data.floor as number;
    const firstItem = result.items[0];
    if (firstItem) {
      io.to(`floor:${floor}`).emit('itembox:picked', {
        boxId: data.boxId,
        userId,
        itemName: firstItem.name,
        rarity: RARITY_NAMES[firstItem.rarity as ItemRarity] ?? '일반',
      });
    }
  });
}

/** 서버 시작 시 호출 — 스폰 타이머 시작 + 이벤트 핸들러 연결 */
export function initItemBoxSystem(io: Server) {
  setBoxEventHandler({
    onSpawn: (box) => {
      io.to(`floor:${box.floor}`).emit('itembox:spawned', {
        boxId: box.boxId,
        floor: box.floor,
        x: box.x,
        y: box.y,
      });
    },
    onExpire: (boxId, floor) => {
      io.to(`floor:${floor}`).emit('itembox:expired', { boxId });
    },
    onAnnounce: (floor, secondsUntil) => {
      io.to(`floor:${floor}`).emit('itembox:announce', { floor, secondsUntil });
    },
  });

  startItemBoxSpawner();
  console.log('Item box spawner started (15min interval)');
}
