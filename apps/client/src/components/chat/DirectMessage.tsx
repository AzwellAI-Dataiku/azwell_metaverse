import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { getSocket } from '../../services/socket.js';
import * as api from '../../services/api.js';
import { dispatchCommand, isCommand } from '../../chat/commands/index.js';
import CommandSuggest from './CommandSuggest.js';
import ChatMessage from './ChatMessage.js';

export default function DirectMessage() {
  const [input, setInput] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ id: number; nickname: string }>>([]);
  const [loading, setLoading] = useState(false);
  const { rooms, activeRoomId, setActiveRoom, setRooms, messages } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const dmRooms = rooms.filter((r) => r.type === 'dm');
  const roomMessages = messages.filter((m) => m.roomId === activeRoomId);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [roomMessages]);

  // 채팅방 진입 시 메시지 히스토리 로드 (중복 방지)
  useEffect(() => {
    if (activeRoomId) {
      api.getChatHistory(activeRoomId).then((msgs) => {
        useChatStore.getState().loadRoomMessages(activeRoomId, msgs);
      }).catch(console.error);
    }
  }, [activeRoomId]);

  const loadOnlineUsers = async () => {
    setLoading(true);
    try {
      const users = await api.getOnlineUsers();
      setOnlineUsers(users);
    } catch {
      setOnlineUsers([]);
    }
    setLoading(false);
  };

  const startDM = async (targetUserId: number) => {
    try {
      const room = await api.createDM(targetUserId);
      // rooms 목록 갱신
      const updatedRooms = await api.getChatRooms();
      setRooms(updatedRooms);
      setActiveRoom(room.id);
      setShowUserList(false);
    } catch (err) {
      console.error('DM 생성 실패', err);
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !activeRoomId) return;
    const socket = getSocket();
    if (!socket) return;

    if (isCommand(trimmed)) {
      const res = await dispatchCommand(trimmed, { tabType: 'dm', roomId: activeRoomId });
      if (res.handled) {
        setInput('');
        return;
      }
    }

    socket.emit('chat:private', { roomId: activeRoomId, content: trimmed });
    setInput('');
  };

  // 유저 선택 화면
  if (showUserList) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-cy-brown">대화 상대 선택</span>
          <button
            onClick={() => setShowUserList(false)}
            className="text-xs text-cy-warm-gray hover:text-cy-brown"
          >
            취소
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {loading && <p className="text-xs text-cy-warm-gray text-center py-4">로딩 중...</p>}
          {!loading && onlineUsers.length === 0 && (
            <p className="text-xs text-cy-warm-gray text-center py-4">온라인 유저가 없습니다</p>
          )}
          {onlineUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => startDM(u.id)}
              className="w-full text-left p-2 rounded-cy bg-cy-cream hover:bg-cy-blue/20 text-xs transition-all"
            >
              <span className="font-bold text-cy-brown">{u.nickname}</span>
              <span className="text-cy-warm-gray ml-1">🟢 온라인</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 대화 목록 화면
  if (!activeRoomId) {
    return (
      <div className="flex flex-col h-full">
        <button
          onClick={() => { setShowUserList(true); loadOnlineUsers(); }}
          className="w-full py-1.5 mb-2 rounded-full bg-cy-blue/20 text-cy-brown text-xs font-bold hover:bg-cy-blue/30 transition-all"
        >
          + 새 DM 시작
        </button>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {dmRooms.map((room) => (
            <div key={room.id} className="flex items-center gap-1">
              <button
                onClick={() => setActiveRoom(room.id)}
                className="flex-1 text-left p-2 rounded-cy bg-cy-cream hover:bg-cy-lavender/40 text-xs"
              >
                <span className="font-bold text-cy-brown">{room.name || 'DM'}</span>
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm('이 대화방을 삭제하시겠습니까?')) return;
                  try {
                    await api.deleteRoom(room.id);
                    useChatStore.getState().removeRoom(room.id);
                  } catch { /* ignore */ }
                }}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full
                           text-cy-warm-gray hover:bg-red-100 hover:text-red-500 text-sm"
                title="대화방 삭제"
              >
                ×
              </button>
            </div>
          ))}
          {dmRooms.length === 0 && (
            <p className="text-xs text-cy-warm-gray text-center py-4">DM이 없습니다</p>
          )}
        </div>
      </div>
    );
  }

  // 대화 화면
  return (
    <div className="flex flex-col h-full">
      <button
        onClick={() => setActiveRoom(null)}
        className="text-xs text-cy-orange font-bold mb-2 text-left hover:underline"
      >
        ← 목록으로
      </button>
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-1.5 mb-2">
        {roomMessages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} isMine={msg.senderId === user?.id} color="blue" />
        ))}
        {roomMessages.length === 0 && (
          <p className="text-xs text-cy-warm-gray text-center py-4">메시지가 없습니다. 대화를 시작해보세요!</p>
        )}
      </div>
      <div className="relative flex gap-1.5">
        <CommandSuggest input={input} onSelect={setInput} />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
            if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
          }}
          className="chat-input-active flex-1 px-3 py-1.5 rounded-full border border-cy-blue/30 text-xs bg-white focus:border-cy-blue"
          placeholder="메시지를 입력하세요..."
        />
        <button onClick={handleSend} className="px-3 py-1.5 rounded-full bg-cy-blue text-white text-xs font-bold">
          전송
        </button>
      </div>
    </div>
  );
}
