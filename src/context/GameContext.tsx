import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { CARD_BANK, generateNewCard } from '../data/cards';
import { syncService, SyncGameState } from '../services/syncService';

export interface Player {
  id: string;
  name: string;
  photoUri: string | null;
  cardCount: number;
}

interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  usedCards: Set<string>;
  availableCards: string[];
  currentCard: string | null;
  votes: Record<string, string>;
  gameStarted: boolean;
  roundComplete: boolean;
  // Sync-related
  roomCode: string | null;
  isHost: boolean;
  syncEnabled: boolean;
}

type GameAction =
  | { type: 'ADD_PLAYER'; name: string; photoUri: string | null }
  | { type: 'REMOVE_PLAYER'; id: string }
  | { type: 'REORDER_PLAYERS'; players: Player[] }
  | { type: 'START_GAME' }
  | { type: 'DRAW_CARD' }
  | { type: 'CAST_VOTE'; voterId: string; votedForId: string }
  | { type: 'CLEAR_VOTES' }
  | { type: 'ASSIGN_CARD'; playerId: string }
  | { type: 'NEXT_ROUND' }
  | { type: 'RESET_GAME' }
  | { type: 'END_GAME' }
  | { type: 'SET_ROOM'; roomCode: string; isHost: boolean }
  | { type: 'LEAVE_ROOM' }
  | { type: 'SYNC_STATE'; syncState: SyncGameState };

const initialState: GameState = {
  players: [],
  currentPlayerIndex: 0,
  usedCards: new Set(),
  availableCards: [...CARD_BANK],
  currentCard: null,
  votes: {},
  gameStarted: false,
  roundComplete: false,
  roomCode: null,
  isHost: false,
  syncEnabled: false,
};

let playerIdCounter = 0;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ADD_PLAYER': {
      const newPlayer: Player = {
        id: `player_${++playerIdCounter}`,
        name: action.name,
        photoUri: action.photoUri,
        cardCount: 0,
      };
      return { ...state, players: [...state.players, newPlayer] };
    }

    case 'REMOVE_PLAYER':
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.id),
      };

    case 'REORDER_PLAYERS':
      return { ...state, players: action.players };

    case 'START_GAME':
      return {
        ...state,
        gameStarted: true,
        currentPlayerIndex: 0,
        usedCards: new Set(),
        availableCards: shuffleArray([...CARD_BANK]),
        currentCard: null,
        votes: {},
        players: state.players.map((p) => ({ ...p, cardCount: 0 })),
      };

    case 'DRAW_CARD': {
      let { availableCards, usedCards } = state;

      const usageThreshold = Math.floor(CARD_BANK.length * 0.7);
      if (usedCards.size >= usageThreshold && availableCards.length < 10) {
        const newCards: string[] = [];
        for (let i = 0; i < 20; i++) {
          const newCard = generateNewCard(usedCards);
          if (!usedCards.has(newCard)) {
            newCards.push(newCard);
          }
        }
        availableCards = [...availableCards, ...shuffleArray(newCards)];
      }

      if (availableCards.length === 0) {
        return state;
      }

      const card = availableCards[0];
      const remaining = availableCards.slice(1);
      const newUsed = new Set(usedCards);
      newUsed.add(card);

      return {
        ...state,
        currentCard: card,
        availableCards: remaining,
        usedCards: newUsed,
        votes: {},
        roundComplete: false,
      };
    }

    case 'CAST_VOTE':
      return {
        ...state,
        votes: { ...state.votes, [action.voterId]: action.votedForId },
      };

    case 'CLEAR_VOTES':
      return { ...state, votes: {} };

    case 'ASSIGN_CARD': {
      const players = state.players.map((p) =>
        p.id === action.playerId ? { ...p, cardCount: p.cardCount + 1 } : p
      );
      return { ...state, players, roundComplete: true };
    }

    case 'NEXT_ROUND': {
      const nextIndex =
        (state.currentPlayerIndex + 1) % state.players.length;
      return {
        ...state,
        currentPlayerIndex: nextIndex,
        currentCard: null,
        votes: {},
        roundComplete: false,
      };
    }

    case 'RESET_GAME':
      playerIdCounter = 0;
      return { ...initialState };

    case 'END_GAME':
      return { ...state, gameStarted: false };

    case 'SET_ROOM':
      return {
        ...state,
        roomCode: action.roomCode,
        isHost: action.isHost,
        syncEnabled: true,
      };

    case 'LEAVE_ROOM':
      return {
        ...state,
        roomCode: null,
        isHost: false,
        syncEnabled: false,
      };

    case 'SYNC_STATE': {
      const s = action.syncState;
      return {
        ...state,
        players: s.players,
        currentPlayerIndex: s.currentPlayerIndex,
        usedCards: new Set(s.usedCardsList || []),
        availableCards: s.availableCards || [],
        currentCard: s.currentCard,
        votes: s.votes || {},
        gameStarted: s.gameStarted,
        roundComplete: s.roundComplete,
      };
    }

    default:
      return state;
  }
}

function stateToSyncState(state: GameState): SyncGameState {
  return {
    players: state.players,
    currentPlayerIndex: state.currentPlayerIndex,
    usedCardsList: Array.from(state.usedCards),
    availableCards: state.availableCards,
    currentCard: state.currentCard,
    votes: state.votes,
    gameStarted: state.gameStarted,
    roundComplete: state.roundComplete,
  };
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  getMostVoted: () => { winners: Player[]; voteCount: number };
  allVoted: () => boolean;
  createRoom: () => Promise<string>;
  joinRoom: (code: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const isFromSync = useRef(false);
  const prevStateRef = useRef(state);

  // Sync state to Firebase when it changes (host only)
  useEffect(() => {
    if (isFromSync.current) {
      isFromSync.current = false;
      prevStateRef.current = state;
      return;
    }

    if (state.syncEnabled && state.isHost) {
      const syncState = stateToSyncState(state);
      syncService.syncState(syncState);
    }

    prevStateRef.current = state;
  }, [state]);

  const createRoom = useCallback(async (): Promise<string> => {
    const code = await syncService.createRoom();
    dispatch({ type: 'SET_ROOM', roomCode: code, isHost: true });

    // Upload initial state
    const syncState = stateToSyncState(state);
    await syncService.syncState(syncState);

    return code;
  }, [state]);

  const joinRoom = useCallback(async (code: string): Promise<boolean> => {
    const success = await syncService.joinRoom(code.toUpperCase());
    if (success) {
      dispatch({ type: 'SET_ROOM', roomCode: code.toUpperCase(), isHost: false });

      // Listen for state changes from host
      syncService.listenToState((syncState) => {
        isFromSync.current = true;
        dispatch({ type: 'SYNC_STATE', syncState });
      });

      return true;
    }
    return false;
  }, []);

  const leaveRoom = useCallback(async () => {
    await syncService.leaveRoom();
    dispatch({ type: 'LEAVE_ROOM' });
  }, []);

  const getMostVoted = (): { winners: Player[]; voteCount: number } => {
    const voteCounts: Record<string, number> = {};
    Object.values(state.votes).forEach((votedId) => {
      voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
    });

    let maxVotes = 0;
    Object.values(voteCounts).forEach((count) => {
      if (count > maxVotes) maxVotes = count;
    });

    const winnerIds = Object.entries(voteCounts)
      .filter(([, count]) => count === maxVotes)
      .map(([id]) => id);

    const winners = state.players.filter((p) => winnerIds.includes(p.id));
    return { winners, voteCount: maxVotes };
  };

  const allVoted = (): boolean => {
    return Object.keys(state.votes).length === state.players.length;
  };

  return (
    <GameContext.Provider
      value={{ state, dispatch, getMostVoted, allVoted, createRoom, joinRoom, leaveRoom }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
