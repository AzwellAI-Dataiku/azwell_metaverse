import type { PresenceInfo, PresenceMode } from '@metaverse/shared';

// In-memory presence map. Ephemeral by design — cleared on user's last socket
// disconnect. No DB persistence.
const presenceMap = new Map<number, PresenceInfo>();

export function setPresence(
  userId: number,
  mode: PresenceMode,
  message: string | null = null,
  brbUntil: number | null = null
): PresenceInfo {
  const info: PresenceInfo = { mode, message, brbUntil };
  presenceMap.set(userId, info);
  return info;
}

export function getPresence(userId: number): PresenceInfo | null {
  const info = presenceMap.get(userId);
  if (!info) return null;
  // Auto-expire brb if brbUntil has passed
  if (info.brbUntil && info.brbUntil < Date.now()) {
    presenceMap.delete(userId);
    return null;
  }
  return info;
}

export function clearPresence(userId: number): void {
  presenceMap.delete(userId);
}

export function getAllPresence(): Map<number, PresenceInfo> {
  // Return a fresh snapshot, pruning expired entries
  const now = Date.now();
  const snapshot = new Map<number, PresenceInfo>();
  for (const [uid, info] of presenceMap.entries()) {
    if (info.brbUntil && info.brbUntil < now) {
      presenceMap.delete(uid);
      continue;
    }
    snapshot.set(uid, info);
  }
  return snapshot;
}
