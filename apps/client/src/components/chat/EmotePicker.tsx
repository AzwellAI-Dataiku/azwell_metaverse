import { useState } from 'react';
import { getSocket } from '../../services/socket.js';

const EMOTES = ['😊', '😂', '😍', '🤔', '😎', '👍', '👋', '🎉', '❤️', '😢', '😮', '🔥'];

export default function EmotePicker() {
  const [isOpen, setIsOpen] = useState(false);

  const sendEmote = (emoji: string) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('player:emote', { emoji });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 rounded-full bg-cy-lavender text-sm hover:bg-cy-lavender/80 transition-all"
        title="표정 보내기"
      >
        😊
      </button>
      {isOpen && (
        <div className="absolute bottom-10 left-0 bg-white rounded-cy-lg shadow-lg border border-cy-coral/20 p-2 grid grid-cols-4 gap-1 w-44 z-50">
          {EMOTES.map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendEmote(emoji)}
              className="text-xl p-1.5 rounded-cy hover:bg-cy-cream transition-all"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
