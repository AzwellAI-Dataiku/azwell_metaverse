import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore.js';
import { useGameStore } from '../../stores/gameStore.js';
import { getSocket } from '../../services/socket.js';
import { useAuthStore } from '../../stores/authStore.js';
import { dispatchCommand, isCommand } from '../../chat/commands/index.js';
import * as api from '../../services/api.js';
import CommandSuggest from './CommandSuggest.js';

export default function PublicChat() {
  const [input, setInput] = useState('');
  const currentFloor = useGameStore((s) => s.currentFloor);
  const messages = useChatStore((s) =>
    s.messages.filter((m) => m.roomId === null && (m.senderId === 0 || m.floor === currentFloor))
  );
  const user = useAuthStore((s) => s.user);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const socket = getSocket();
    if (!socket) return;

    if (isCommand(trimmed)) {
      const res = await dispatchCommand(trimmed, { tabType: 'public', roomId: null });
      if (res.handled) {
        socket.emit('chat:stop-typing');
        setInput('');
        return;
      }
    }

    socket.emit('chat:public', { content: trimmed });
    socket.emit('chat:stop-typing');
    setInput('');
  };

  const handleTyping = (value: string) => {
    setInput(value);
    const socket = getSocket();
    if (!socket) return;
    if (value) {
      socket.emit('chat:typing', { isPublic: true });
    } else {
      socket.emit('chat:stop-typing');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-1.5 mb-2 pr-1">
        {messages.map((msg) =>
          msg.senderId === 0 ? (
            <div
              key={msg.id}
              className="text-[11px] italic text-cy-warm-gray whitespace-pre-wrap px-2 py-1"
            >
              {msg.content}
            </div>
          ) : (
            <div
              key={msg.id}
              className={`group text-xs p-2 rounded-cy flex items-start justify-between ${
                msg.senderId === user?.id ? 'bg-cy-coral/20 ml-6' : 'bg-cy-cream mr-6'
              }`}
            >
              <div>
                <span className="font-bold text-cy-brown">{msg.senderNickname}</span>
                <span className="text-cy-warm-gray ml-1">{msg.content}</span>
              </div>
              {user?.role === 'admin' && (
                <button
                  onClick={async () => {
                    if (!confirm('이 메시지를 삭제하시겠습니까?')) return;
                    try {
                      await api.adminDeleteMessage(msg.id);
                      useChatStore.getState().removeMessage(msg.id);
                    } catch { alert('삭제 실패'); }
                  }}
                  className="shrink-0 ml-1 text-[10px] text-cy-warm-gray opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                  title="메시지 삭제"
                >
                  ×
                </button>
              )}
            </div>
          )
        )}
        {messages.length === 0 && (
          <p className="text-xs text-cy-warm-gray text-center py-4">아직 메시지가 없어요 💬</p>
        )}
      </div>
      <div className="relative flex gap-1.5">
        <CommandSuggest input={input} onSelect={setInput} />
        <input
          value={input}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
            if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
          }}
          className="chat-input-active flex-1 px-3 py-1.5 rounded-full border border-cy-coral/30 text-xs bg-white focus:border-cy-coral"
          placeholder="메시지를 입력하세요..."
        />
        <button onClick={handleSend} className="px-3 py-1.5 rounded-full bg-cy-coral text-white text-xs font-bold">
          전송
        </button>
      </div>
    </div>
  );
}
