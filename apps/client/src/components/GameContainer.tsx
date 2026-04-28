import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore.js';
import { useGameStore } from '../stores/gameStore.js';
import { useChatStore } from '../stores/chatStore.js';
import { useQuestStore } from '../stores/questStore.js';
import { useMemberStore } from '../stores/memberStore.js';
import { connectSocket, disconnectSocket } from '../services/socket.js';
import { createGame, destroyGame, getGame } from '../game/PhaserGame.js';
import * as api from '../services/api.js';
import { calcLevelInfo } from '@metaverse/shared';
import { buildSystemMessage } from '../chat/commands/types.js';
// Side-effect import: registers all slash commands into the shared registry.
import '../chat/commands/index.js';
import FloorNavigator from './hud/FloorNavigator.js';
import PlayerInfo from './hud/PlayerInfo.js';
import MemberList from './hud/MemberList.js';
import SoundSettings from './hud/SoundSettings.js';
import ChatPanel from './chat/ChatPanel.js';
import QuestPanel from './quest/QuestPanel.js';
import GoLauncher from './hud/GoLauncher.js';
import InventoryModal from './hud/InventoryModal.js';
import ArenaLobby from './arena/ArenaLobby.js';
import CombatView from './arena/CombatView.js';
import { useInventoryStore } from '../stores/inventoryStore.js';
import { useArenaStore } from '../stores/arenaStore.js';

export default function GameContainer() {
  const { token, user, logout } = useAuthStore();
  const { setFloor, setPlayers, updatePlayer, removePlayer, movePlayer } = useGameStore();
  const { addMessage } = useChatStore();
  const { updateProgress, setLevelInfo } = useQuestStore();
  const inCombat = useArenaStore((s) => s.isCombatOpen && (s.matchState === 'fighting' || s.matchState === 'match_end'));
  const gameRef = useRef<boolean>(false);

  // Enter 키로 채팅 활성화
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        const chatInput = document.querySelector<HTMLInputElement>('.chat-input-active');
        if (chatInput) chatInput.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);

    socket.on('floor:players', (players) => setPlayers(players));
    socket.on('player:joined', (player) => updatePlayer(player));
    socket.on('player:left', (userId) => removePlayer(userId));
    socket.on('player:moved', ({ userId, x, y, direction }) => movePlayer(userId, x, y, direction));
    socket.on('player:sat', ({ userId, x, y }) => movePlayer(userId, x, y, 'down'));
    socket.on('player:stood', ({ userId, x, y }) => movePlayer(userId, x, y, 'down'));

    socket.on('chat:public', (msg) => {
      addMessage(msg);
      // Increment unread if not viewing public tab or chat is closed
      const cs = useChatStore.getState();
      if (msg.senderId !== user?.id && (cs.activeTab !== 'public' || !cs.isOpen)) {
        cs.incrementUnread('public');
      }
    });
    socket.on('chat:private', (msg) => {
      addMessage(msg);
      // Track most recent DM sender (excluding self) for the /r reply command.
      if (user && msg.senderId !== user.id && msg.senderId !== 0) {
        useChatStore.getState().setLastDmSender(msg.senderId);
      }
      // Increment unread for the appropriate tab (dm or group)
      if (msg.senderId !== user?.id) {
        const cs = useChatStore.getState();
        const room = cs.rooms.find((r) => r.id === msg.roomId);
        const tab = room?.type === 'group' ? 'group' : 'dm';
        if (cs.activeTab !== tab || !cs.isOpen) {
          cs.incrementUnread(tab);
        }
      }
    });
    socket.on('chat:system', ({ content, roomId }) => {
      useChatStore.getState().addMessage(buildSystemMessage(content, roomId));
    });

    // Member list sync
    const memberStore = useMemberStore.getState();
    socket.on('user:online', ({ userId }) => memberStore.setOnline(userId, true));
    socket.on('user:offline', ({ userId }) => memberStore.setOnline(userId, false));
    socket.on('user:registered', (m) =>
      memberStore.addMember({ id: m.id, nickname: m.nickname, level: m.level, isOnline: false })
    );
    socket.on('player:nickname-changed', ({ userId, nickname }) =>
      memberStore.setNickname(userId, nickname)
    );
    socket.on('user:presence-changed', ({ userId, presence }) =>
      memberStore.setPresence(userId, presence)
    );

    // Ensure self is marked online once the WS handshake completes.
    // Without this, the initial GET /api/users can return before our socket
    // is registered on the server, leaving our own isOnline as false — and
    // the 'user:online' broadcast excludes the originating socket.
    socket.on('connect', () => {
      if (user) useMemberStore.getState().setOnline(user.id, true);
      api.getMembers().then((members) => useMemberStore.getState().setMembers(members)).catch(console.error);
    });

    socket.on('quest:progress', (progress) => updateProgress(progress));
    socket.on('level:up', ({ userId: uid }) => {
      if (uid === user?.id) {
        setLevelInfo(calcLevelInfo(0));
      }
    });
    socket.on('quest:completed', (data) => {
      if (user) {
        api.getDailyQuests().then((quests) => useQuestStore.getState().setQuests(quests)).catch(console.error);
        setLevelInfo(calcLevelInfo(user.xp + data.xpReward));
      }
    });

    // Arena socket listeners
    const arena = useArenaStore.getState();
    socket.on('arena:queue-update', arena._handleQueueUpdate);
    socket.on('arena:match-found', arena._handleMatchFound);
    socket.on('arena:match-start', (data) => {
      arena._handleMatchStart(data);
      // Phaser 씬 전환: OfficeScene → ArenaScene
      const game = getGame();
      if (game) {
        const sceneManager = game.scene;
        if (sceneManager.isActive('OfficeScene')) {
          sceneManager.stop('OfficeScene');
        }
        sceneManager.start('ArenaScene', { userId: user?.id });
      }
    });
    socket.on('arena:tick', arena._handleTick);
    socket.on('arena:damage', arena._handleDamage);
    socket.on('arena:heal', arena._handleHeal);
    socket.on('arena:kill', arena._handleKill);
    socket.on('arena:match-end', arena._handleMatchEnd);
    socket.on('arena:error', arena._handleError);

    socket.emit('floor:join', 2);
    setFloor(2);

    if (user) {
      setLevelInfo(calcLevelInfo(user.xp));
    }

    api.getChatRooms().then((rooms) => useChatStore.getState().setRooms(rooms)).catch(console.error);
    api.getPublicChatHistory(2).then((msgs) => {
      useChatStore.getState().loadRoomMessages(null, msgs);
    }).catch(console.error);
    // Member list fetch is triggered inside the socket 'connect' handler above,
    // so the server's fetchSockets() already contains our own socket.

    // Initialize Phaser
    if (!gameRef.current) {
      createGame('phaser-container');
      gameRef.current = true;
    }

    return () => {
      disconnectSocket();
      destroyGame();
      gameRef.current = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-cy-cream relative overflow-hidden">
      {/* Phaser Game Canvas */}
      <div id="phaser-container" className="w-full h-screen" onPointerDown={() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      }} />

      {/* HUD Overlays — 전투 중에는 숨김 */}
      {!inCombat && (
        <>
          <div className="absolute top-4 left-4 z-10 w-56 space-y-3">
            <PlayerInfo />
            <MemberList />
          </div>

          <div className="absolute top-4 right-4 z-10 space-y-3 w-24">
            <FloorNavigator />
            <SoundSettings />
          </div>

          <div className="absolute bottom-4 left-4 z-10">
            <ChatPanel />
          </div>

          <div className="absolute bottom-4 right-4 z-10 w-56">
            <QuestPanel />
          </div>

          {/* Action Buttons — 상단 중앙 */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            <button
              onClick={() => useArenaStore.getState().openLobby()}
              className="px-3 py-1.5 rounded-full bg-red-500/80 text-white text-xs hover:bg-red-500 shadow-sm"
              title="아레나"
            >
              ⚔️ 아레나
            </button>
            <button
              onClick={() => useInventoryStore.getState().openInventory()}
              className="px-3 py-1.5 rounded-full bg-white/80 text-cy-warm-gray text-xs hover:bg-white shadow-sm"
              title="인벤토리"
            >
              🎒 인벤토리
            </button>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-full bg-white/80 text-cy-warm-gray text-xs hover:bg-white shadow-sm"
            >
              로그아웃
            </button>
          </div>
        </>
      )}

      {/* Go Launcher Modal */}
      <GoLauncher />

      {/* Inventory Modal */}
      <InventoryModal />

      {/* Arena */}
      <ArenaLobby />
      <CombatView />

    </div>
  );
}
