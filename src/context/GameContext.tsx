import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { CARD_BANK, generateNewCard } from '../data/cards';

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
  votes: Record<string, string>; // voterId -> votedForId
  gameStarted: boolean;
  roundComplete: boolean;
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
  | { type: 'END_GAME' };

const initialState: GameState = {
  players: [],
  currentPlayerIndex: 0,
  usedCards: new Set(),
  availableCards: [...CARD_BANK],
  currentCard: null,
  votes: {},
  gameStarted: false,
  roundComplete: false,
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

      // If 70% of original bank used, generate new cards
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

    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  getMostVoted: () => { winners: Player[]; voteCount: number };
  allVoted: () => boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

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
    <GameContext.Provider value={{ state, dispatch, getMostVoted, allVoted }}>
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
