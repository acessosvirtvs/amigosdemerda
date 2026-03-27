import { database } from '../config/firebase';
import {
  ref,
  set,
  onValue,
  off,
  remove,
  push,
  onDisconnect,
} from 'firebase/database';

export interface SyncGameState {
  players: Array<{
    id: string;
    name: string;
    photoUri: string | null;
    cardCount: number;
  }>;
  currentPlayerIndex: number;
  usedCardsList: string[];
  availableCards: string[];
  currentCard: string | null;
  votes: Record<string, string>;
  gameStarted: boolean;
  roundComplete: boolean;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

class SyncService {
  private roomCode: string | null = null;
  private unsubscribe: (() => void) | null = null;
  private isHost: boolean = false;

  async createRoom(): Promise<string> {
    const code = generateRoomCode();
    const roomRef = ref(database, `rooms/${code}`);
    await set(roomRef, {
      createdAt: Date.now(),
      status: 'waiting',
    });

    // Auto-cleanup on disconnect
    onDisconnect(roomRef).remove();

    this.roomCode = code;
    this.isHost = true;
    return code;
  }

  async joinRoom(code: string): Promise<boolean> {
    return new Promise((resolve) => {
      const roomRef = ref(database, `rooms/${code}`);
      onValue(
        roomRef,
        (snapshot) => {
          if (snapshot.exists()) {
            this.roomCode = code;
            this.isHost = false;
            off(roomRef);
            resolve(true);
          } else {
            off(roomRef);
            resolve(false);
          }
        },
        { onlyOnce: true }
      );
    });
  }

  async syncState(state: SyncGameState): Promise<void> {
    if (!this.roomCode) return;

    const stateRef = ref(database, `rooms/${this.roomCode}/gameState`);
    await set(stateRef, state);
  }

  listenToState(callback: (state: SyncGameState) => void): void {
    if (!this.roomCode) return;

    const stateRef = ref(database, `rooms/${this.roomCode}/gameState`);

    this.unsubscribe = () => off(stateRef);

    onValue(stateRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback(data);
      }
    });
  }

  async leaveRoom(): Promise<void> {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.roomCode && this.isHost) {
      const roomRef = ref(database, `rooms/${this.roomCode}`);
      await remove(roomRef);
    }

    this.roomCode = null;
    this.isHost = false;
  }

  getRoomCode(): string | null {
    return this.roomCode;
  }

  getIsHost(): boolean {
    return this.isHost;
  }
}

export const syncService = new SyncService();
