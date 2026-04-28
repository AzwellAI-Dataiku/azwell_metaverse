import { FLOORS } from '@metaverse/shared';
import { useGameStore } from '../../stores/gameStore.js';
import { useChatStore } from '../../stores/chatStore.js';
import { getSocket } from '../../services/socket.js';
import * as api from '../../services/api.js';

export default function FloorNavigator() {
  const currentFloor = useGameStore((s) => s.currentFloor);
  const setFloor = useGameStore((s) => s.setFloor);

  const handleFloorChange = (floor: number) => {
    if (floor === currentFloor) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit('floor:join', floor);
    setFloor(floor);
    // 층 이동 시 공개 채팅 히스토리 갱신
    useChatStore.getState().clearPublicMessages();
    api.getPublicChatHistory(floor).then((msgs) => {
      useChatStore.getState().loadRoomMessages(null, msgs);
    }).catch(console.error);
  };

  return (
    <div className="panel-cy p-2 space-y-1.5">
      <p className="text-xs font-bold text-cy-brown text-center mb-2">층 이동</p>
      {[...FLOORS].reverse().map((floor) => (
        <button
          key={floor.id}
          onClick={() => handleFloorChange(floor.id)}
          className={`w-full py-2 rounded-full text-sm font-bold transition-all ${
            currentFloor === floor.id
              ? 'text-white shadow-cy scale-105'
              : 'text-cy-brown hover:scale-105'
          }`}
          style={{
            backgroundColor: currentFloor === floor.id ? '#FF6B35' : floor.color,
            boxShadow: currentFloor === floor.id ? `0 0 12px ${floor.color}` : undefined,
          }}
        >
          {floor.name}
        </button>
      ))}
    </div>
  );
}
