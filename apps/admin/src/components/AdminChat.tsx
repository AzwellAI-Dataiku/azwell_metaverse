import { useEffect, useState } from 'react';
import * as adminApi from '../services/adminApi.js';
import type { AdminRoom, AdminMessage } from '../services/adminApi.js';

export default function AdminChat() {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);

  const loadRooms = () => adminApi.getRooms().then(setRooms).catch(console.error);

  useEffect(() => { loadRooms(); }, []);

  useEffect(() => {
    if (selectedRoom) {
      adminApi.getRoomMessages(selectedRoom).then(setMessages).catch(console.error);
    } else {
      setMessages([]);
    }
  }, [selectedRoom]);

  const handleDeleteRoom = async (id: number, name: string) => {
    if (!confirm(`"${name}" 채팅방을 삭제하시겠습니까? 모든 메시지가 삭제됩니다.`)) return;
    try {
      await adminApi.deleteRoom(id);
      if (selectedRoom === id) setSelectedRoom(null);
      loadRooms();
    } catch {
      alert('삭제 실패');
    }
  };

  const handleDeleteMessage = async (id: number) => {
    try {
      await adminApi.deleteMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch {
      alert('삭제 실패');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-cy-brown mb-4">채팅 관리</h2>
      <div className="flex gap-4 h-[600px]">
        {/* Room List */}
        <div className="w-72 panel-cy overflow-y-auto">
          <p className="text-xs font-bold text-cy-warm-gray p-2 border-b border-cy-cream">
            채팅방 ({rooms.length})
          </p>
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`flex items-center justify-between p-2 border-b border-cy-cream cursor-pointer hover:bg-cy-pink/20 ${
                selectedRoom === room.id ? 'bg-cy-pink/30' : ''
              }`}
              onClick={() => setSelectedRoom(room.id)}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-cy-brown truncate">{room.name || '(이름 없음)'}</p>
                <p className="text-xs text-cy-warm-gray">
                  {room.type === 'dm' ? 'DM' : '그룹'} · {room.memberCount}명 · {room.messageCount}메시지
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id, room.name); }}
                className="shrink-0 ml-1 px-2 py-1 rounded text-xs bg-red-100 text-red-600 hover:bg-red-200"
              >
                삭제
              </button>
            </div>
          ))}
          {rooms.length === 0 && (
            <p className="text-xs text-cy-warm-gray text-center py-4">채팅방이 없습니다</p>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 panel-cy overflow-y-auto">
          {!selectedRoom ? (
            <p className="text-sm text-cy-warm-gray text-center py-8">채팅방을 선택하세요</p>
          ) : (
            <>
              <p className="text-xs font-bold text-cy-warm-gray p-2 border-b border-cy-cream">
                메시지 ({messages.length})
              </p>
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-start justify-between p-2 border-b border-cy-cream hover:bg-cy-pink/10">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-cy-brown">{msg.senderNickname}</span>
                      <span className="text-[10px] text-cy-warm-gray">{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-cy-brown mt-0.5">{msg.content}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="shrink-0 ml-2 px-2 py-1 rounded text-xs bg-red-100 text-red-600 hover:bg-red-200"
                  >
                    삭제
                  </button>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-xs text-cy-warm-gray text-center py-4">메시지가 없습니다</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
