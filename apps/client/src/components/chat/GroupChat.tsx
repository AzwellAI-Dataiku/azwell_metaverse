import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { getSocket } from '../../services/socket.js';
import * as api from '../../services/api.js';
import { dispatchCommand, isCommand } from '../../chat/commands/index.js';
import CommandSuggest from './CommandSuggest.js';
import ChatMessage from './ChatMessage.js';

export default function GroupChat() {
  const [input, setInput] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<Array<{ id: number; nickname: string }>>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const { rooms, activeRoomId, setActiveRoom, setRooms, messages } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const groupRooms = rooms.filter((r) => r.type === 'group');
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

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedIds.size === 0) return;
    try {
      await api.createGroupChat(groupName.trim(), [...selectedIds]);
      const updatedRooms = await api.getChatRooms();
      setRooms(updatedRooms);
      setShowCreate(false);
      setGroupName('');
      setSelectedIds(new Set());
    } catch (err) {
      console.error('그룹 생성 실패', err);
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !activeRoomId) return;
    const socket = getSocket();
    if (!socket) return;

    if (isCommand(trimmed)) {
      const res = await dispatchCommand(trimmed, { tabType: 'group', roomId: activeRoomId });
      if (res.handled) {
        setInput('');
        return;
      }
    }

    socket.emit('chat:private', { roomId: activeRoomId, content: trimmed });
    setInput('');
  };

  // 그룹 생성 화면
  if (showCreate) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-cy-brown">새 그룹 만들기</span>
          <button
            onClick={() => { setShowCreate(false); setSelectedIds(new Set()); setGroupName(''); }}
            className="text-xs text-cy-warm-gray hover:text-cy-brown"
          >
            취소
          </button>
        </div>
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="px-3 py-1.5 rounded-full border border-cy-lavender text-xs bg-white focus:border-cy-lavender mb-2"
          placeholder="그룹 이름을 입력하세요"
        />
        <div className="flex-1 overflow-y-auto space-y-1 mb-2">
          <p className="text-xs text-cy-warm-gray mb-1">멤버 선택 ({selectedIds.size}명)</p>
          {loading && <p className="text-xs text-cy-warm-gray text-center py-2">로딩 중...</p>}
          {!loading && onlineUsers.length === 0 && (
            <p className="text-xs text-cy-warm-gray text-center py-2">온라인 유저가 없습니다</p>
          )}
          {onlineUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => toggleSelect(u.id)}
              className={`w-full text-left p-2 rounded-cy text-xs transition-all ${
                selectedIds.has(u.id)
                  ? 'bg-cy-lavender text-cy-brown font-bold'
                  : 'bg-cy-cream hover:bg-cy-lavender/30 text-cy-brown'
              }`}
            >
              {selectedIds.has(u.id) ? '✓ ' : ''}{u.nickname}
              <span className="text-cy-warm-gray ml-1">🟢</span>
            </button>
          ))}
        </div>
        <button
          onClick={createGroup}
          disabled={!groupName.trim() || selectedIds.size === 0}
          className="w-full py-1.5 rounded-full bg-cy-lavender text-cy-brown text-xs font-bold hover:bg-cy-lavender/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          그룹 만들기 ({selectedIds.size}명)
        </button>
      </div>
    );
  }

  // 목록 화면
  if (!activeRoomId) {
    return (
      <div className="flex flex-col h-full">
        <button
          onClick={() => { setShowCreate(true); loadOnlineUsers(); }}
          className="w-full py-1.5 mb-2 rounded-full bg-cy-lavender/30 text-cy-brown text-xs font-bold hover:bg-cy-lavender/50 transition-all"
        >
          + 새 그룹 만들기
        </button>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {groupRooms.map((room) => (
            <div key={room.id} className="flex items-center gap-1">
              <button
                onClick={() => setActiveRoom(room.id)}
                className="flex-1 text-left p-2 rounded-cy bg-cy-cream hover:bg-cy-lavender/40 text-xs"
              >
                <span className="font-bold text-cy-brown">{room.name || '그룹'}</span>
                <span className="text-cy-warm-gray ml-1">({room.members.length}명)</span>
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm('이 그룹에서 나가시겠습니까?')) return;
                  try {
                    await api.deleteRoom(room.id);
                    useChatStore.getState().removeRoom(room.id);
                  } catch { /* ignore */ }
                }}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full
                           text-cy-warm-gray hover:bg-red-100 hover:text-red-500 text-sm"
                title="그룹 나가기"
              >
                ×
              </button>
            </div>
          ))}
          {groupRooms.length === 0 && (
            <p className="text-xs text-cy-warm-gray text-center py-4">그룹 채팅이 없습니다</p>
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
          <ChatMessage key={msg.id} msg={msg} isMine={msg.senderId === user?.id} color="lavender" />
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
          className="chat-input-active flex-1 px-3 py-1.5 rounded-full border border-cy-lavender text-xs bg-white focus:border-cy-lavender"
          placeholder="메시지를 입력하세요..."
        />
        <button onClick={handleSend} className="px-3 py-1.5 rounded-full bg-cy-lavender text-cy-brown text-xs font-bold">
          전송
        </button>
      </div>
    </div>
  );
}
