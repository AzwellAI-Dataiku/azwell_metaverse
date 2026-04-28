import { useChatStore } from '../../stores/chatStore.js';
import PublicChat from './PublicChat.js';
import DirectMessage from './DirectMessage.js';
import GroupChat from './GroupChat.js';
import EmotePicker from './EmotePicker.js';

const TABS = [
  { key: 'public' as const, label: '공개' },
  { key: 'dm' as const, label: 'DM' },
  { key: 'group' as const, label: '그룹' },
];

export default function ChatPanel() {
  const { activeTab, setActiveTab, isOpen, toggleOpen, unread } = useChatStore();

  return (
    <div className="w-80">
      {/* Toggle + Emote */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleOpen}
          className="flex-1 py-1.5 rounded-t-cy-lg bg-cy-coral text-white text-sm font-bold"
        >
          {isOpen ? '💬 채팅 ▼' : '💬 채팅 ▲'}
        </button>
        <EmotePicker />
      </div>

      {isOpen && (
        <div className="panel-cy rounded-t-none border-t-0">
          {/* Tabs */}
          <div className="flex gap-1 mb-3">
            {TABS.map((tab) => {
              const count = unread[tab.key];
              const hasUnread = count > 0 && activeTab !== tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                    activeTab === tab.key
                      ? 'bg-cy-lavender text-cy-brown'
                      : 'bg-cy-cream text-cy-warm-gray hover:bg-cy-lavender/40'
                  } ${hasUnread ? 'tab-unread' : ''}`}
                >
                  {tab.label}
                  {hasUnread && (
                    <span className="absolute -top-1.5 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-cy-coral text-white text-[10px] font-bold px-1">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="h-52">
            {activeTab === 'public' && <PublicChat />}
            {activeTab === 'dm' && <DirectMessage />}
            {activeTab === 'group' && <GroupChat />}
          </div>
        </div>
      )}
    </div>
  );
}
