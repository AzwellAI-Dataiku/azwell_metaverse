import type { ChatMessage as ChatMessageType } from '@metaverse/shared';
import { useAuthStore } from '../../stores/authStore.js';
import { useChatStore } from '../../stores/chatStore.js';
import * as api from '../../services/api.js';

interface ChatMessageProps {
  msg: ChatMessageType;
  isMine: boolean;
  color: 'blue' | 'lavender';
}

export default function ChatMessage({ msg, isMine, color }: ChatMessageProps) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  if (msg.senderId === 0) {
    return (
      <div className="text-[11px] italic text-cy-warm-gray whitespace-pre-wrap px-2 py-1">
        {msg.content}
      </div>
    );
  }

  const handleDelete = async () => {
    if (!confirm('이 메시지를 삭제하시겠습니까?')) return;
    try {
      await api.adminDeleteMessage(msg.id);
      useChatStore.getState().removeMessage(msg.id);
    } catch {
      alert('삭제 실패');
    }
  };

  const bgClass = isMine
    ? `bg-cy-${color}/20 ml-6`
    : `bg-cy-cream mr-6`;

  return (
    <div className={`group text-xs p-2 rounded-cy ${bgClass} flex items-start justify-between`}>
      <div>
        <span className="font-bold text-cy-brown">{msg.senderNickname}</span>
        <span className="text-cy-warm-gray ml-1">{msg.content}</span>
      </div>
      {isAdmin && (
        <button
          onClick={handleDelete}
          className="shrink-0 ml-1 text-[10px] text-cy-warm-gray opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
          title="메시지 삭제"
        >
          ×
        </button>
      )}
    </div>
  );
}
