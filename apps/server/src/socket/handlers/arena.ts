import type { Server, Socket } from 'socket.io';
import {
  joinQueue,
  leaveQueue,
  setReady,
  handleMove,
  handleSkill,
  handleStartFromQueue,
  handleDisconnect,
  handleReconnect,
  getUserMatch,
  getQueueCount,
  setArenaEventHandler,
} from '../../services/arenaService.js';
import { getPlayerState } from './floor.js';
import type { ArenaMode } from '@metaverse/shared';
import { MATCH_COUNTDOWN_SECONDS } from '@metaverse/shared';

export function registerArenaHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId as number;

  // 대기열 등록
  socket.on('arena:join', async (data) => {
    const playerState = await getPlayerState(userId);
    if (!playerState) {
      socket.emit('arena:error', { message: '캐릭터 정보를 찾을 수 없습니다' });
      return;
    }
    const result = await joinQueue(
      userId,
      playerState.nickname,
      playerState.level,
      data.mode,
      playerState.gender,
      playerState.appearance,
    );
    if (!result.success) {
      socket.emit('arena:error', { message: result.error! });
    }
  });

  // 대기열 탈퇴
  socket.on('arena:leave', async () => {
    await leaveQueue(userId);
  });

  // 레디 체크
  socket.on('arena:ready', (data) => {
    setReady(userId, data.matchId, data.ready);
  });

  // 매치 시작 요청 (로비에서 시작 버튼 클릭)
  socket.on('arena:start', async (data) => {
    await handleStartFromQueue(userId, data.mode);
  });

  // 리얼타임 이동
  socket.on('arena:move', (data) => {
    handleMove(userId, data.matchId, data.x, data.y, data.direction);
  });

  // 리얼타임 스킬 사용
  socket.on('arena:skill', (data) => {
    handleSkill(userId, data.matchId, data.action, data.targetX, data.targetY);
  });

  // 리매치
  socket.on('arena:rematch', async (data) => {
    const playerState = await getPlayerState(userId);
    if (!playerState) return;
    const result = await joinQueue(
      userId,
      playerState.nickname,
      playerState.level,
      data.mode,
      playerState.gender,
      playerState.appearance,
    );
    if (!result.success) {
      socket.emit('arena:error', { message: result.error! });
    }
  });

  // 접속 끊김 시 아레나 처리 (대기열 + 활성 매치 모두)
  socket.on('disconnect', async () => {
    await leaveQueue(userId);
    handleDisconnect(userId);
  });
}

/** 소켓 이벤트 핸들러 연결 */
export function initArenaSystem(io: Server) {
  setArenaEventHandler({
    onQueueUpdate: (mode, count) => {
      io.emit('arena:queue-update', { mode, playersInQueue: count });
    },

    onMatchFound: (match) => {
      const room = `match:${match.matchId}`;
      const participantsData = match.participants.map((p) => ({
        userId: p.userId,
        nickname: p.nickname,
        level: p.level,
        team: p.team,
        hp: p.hp,
        maxHp: p.maxHp,
        x: p.x,
        y: p.y,
        gender: p.gender,
        appearance: p.appearance,
      }));
      // 참가자를 매치 룸에 등록 + 개별 전송
      for (const p of match.participants) {
        const sockets = io.sockets.adapter.rooms.get(`user:${p.userId}`);
        if (sockets) {
          for (const sid of sockets) {
            io.sockets.sockets.get(sid)?.join(room);
          }
        }
        io.to(`user:${p.userId}`).emit('arena:match-found', {
          matchId: match.matchId,
          mode: match.mode,
          participants: participantsData,
          countdownEndsAt: Date.now() + MATCH_COUNTDOWN_SECONDS * 1000,
        });
      }
    },

    onCountdown: (matchId, secondsLeft) => {
      io.to(`match:${matchId}`).emit('arena:countdown', { matchId, secondsLeft });
    },

    onReadyCheck: (matchId, deadline) => {
      io.to(`match:${matchId}`).emit('arena:ready-check', { matchId, deadline });
    },

    onReadyStatus: (matchId, uId, ready) => {
      io.to(`match:${matchId}`).emit('arena:ready-status', { matchId, userId: uId, ready });
    },

    onMatchStart: (matchId) => {
      io.to(`match:${matchId}`).emit('arena:match-start', { matchId });
    },

    onTick: (matchId, data) => {
      io.to(`match:${matchId}`).emit('arena:tick', data);
    },

    onDamage: (matchId, attackerId, targetId, damage, action, targetHpAfter, killed) => {
      io.to(`match:${matchId}`).emit('arena:damage', { matchId, attackerId, targetId, damage, action, targetHpAfter, killed });
    },

    onHeal: (matchId, uId, amount, hpAfter) => {
      io.to(`match:${matchId}`).emit('arena:heal', { matchId, userId: uId, amount, hpAfter });
    },

    onKill: (matchId, killerId, victimId, action) => {
      io.to(`match:${matchId}`).emit('arena:kill', { matchId, killerId, victimId, action });
    },

    onMatchEnd: (matchId, result) => {
      io.to(`match:${matchId}`).emit('arena:match-end', { matchId, result });
      // 매치 종료 후 룸 정리 (소켓은 자동으로 leave하지 않으므로)
      const room = io.sockets.adapter.rooms.get(`match:${matchId}`);
      if (room) {
        for (const sid of room) {
          io.sockets.sockets.get(sid)?.leave(`match:${matchId}`);
        }
      }
    },

    onPlayerDisconnected: (matchId, uId) => {
      io.to(`match:${matchId}`).emit('arena:player-disconnected', { matchId, userId: uId });
    },

    onPlayerReconnected: (matchId, uId) => {
      io.to(`match:${matchId}`).emit('arena:player-reconnected', { matchId, userId: uId });
    },

    onError: (uId, message) => {
      io.to(`user:${uId}`).emit('arena:error', { message });
    },
  });

  console.log('Arena system initialized');
}
