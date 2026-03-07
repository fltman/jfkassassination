import { useReducer, useCallback, useRef } from 'react';
import { savePlayerState, saveConversation } from '../lib/api';

const initialState = {
  currentView: 'intro', // intro | map | location | chat | board
  locations: [],
  clues: [],
  clueTypes: [],
  unlockedLocationIds: [],
  revealedClueIds: [],
  revealedNames: [], // character IDs whose real name is known
  characterSummaries: {}, // { characterId: "summary text" }
  activeLocationId: null,
  activeCharacterId: null,
  conversations: {}, // { characterId: [{ role, content }] }
  pendingNotifications: [],
  isLoading: false,
  dataLoaded: false,
  playerId: null,
  playerName: null,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'LOAD_DATA': {
      const defaultUnlocked = action.locations
        .filter(l => l.unlockedByDefault)
        .map(l => l.id);
      return {
        ...state,
        locations: action.locations,
        clues: action.clues,
        clueTypes: action.clueTypes,
        unlockedLocationIds: defaultUnlocked,
        dataLoaded: true,
      };
    }

    case 'LOAD_PLAYER': {
      return {
        ...state,
        playerId: action.player.id,
        playerName: action.player.name,
        unlockedLocationIds: action.player.unlockedLocations,
        revealedClueIds: action.player.revealedClues,
        revealedNames: action.player.revealedNames || [],
        characterSummaries: action.player.characterSummaries || {},
        conversations: action.player.conversations || {},
      };
    }

    case 'SET_VIEW':
      return { ...state, currentView: action.view };

    case 'OPEN_LOCATION':
      return {
        ...state,
        currentView: 'location',
        activeLocationId: action.locationId,
        activeCharacterId: null,
      };

    case 'OPEN_CHAT':
      return {
        ...state,
        currentView: 'chat',
        activeCharacterId: action.characterId,
      };

    case 'ADD_MESSAGE': {
      const charId = action.characterId;
      const prev = state.conversations[charId] || [];
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [charId]: [...prev, { role: action.role, content: action.content }],
        },
      };
    }

    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };

    case 'REVEAL_NAME': {
      if (state.revealedNames.includes(action.characterId)) return state;
      return {
        ...state,
        revealedNames: [...state.revealedNames, action.characterId],
      };
    }

    case 'SET_CHARACTER_SUMMARY': {
      return {
        ...state,
        characterSummaries: {
          ...state.characterSummaries,
          [action.characterId]: action.summary,
        },
      };
    }

    case 'REVEAL_CLUES': {
      const newClueIds = action.clueIds.filter(
        id => !state.revealedClueIds.includes(id)
      );
      if (newClueIds.length === 0) return state;

      const newLocationIds = [];
      for (const clueId of newClueIds) {
        const clue = state.clues.find(c => c.id === clueId);
        if (clue?.unlocksLocation && !state.unlockedLocationIds.includes(clue.unlocksLocation)) {
          newLocationIds.push(clue.unlocksLocation);
        }
      }

      const notifications = newClueIds.map(id => {
        const clue = state.clues.find(c => c.id === id);
        return {
          id: `${id}-${Date.now()}`,
          clueId: id,
          title: clue?.title || id,
          type: clue?.type,
          unlocksLocation: clue?.unlocksLocation,
        };
      });

      return {
        ...state,
        revealedClueIds: [...state.revealedClueIds, ...newClueIds],
        unlockedLocationIds: [...state.unlockedLocationIds, ...newLocationIds],
        pendingNotifications: [...state.pendingNotifications, ...notifications],
      };
    }

    case 'DISMISS_NOTIFICATION':
      return {
        ...state,
        pendingNotifications: state.pendingNotifications.filter(
          n => n.id !== action.notificationId
        ),
      };

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const saveTimerRef = useRef(null);

  const loadData = useCallback((locations, clues, clueTypes) => {
    dispatch({ type: 'LOAD_DATA', locations, clues, clueTypes });
  }, []);

  // Debounced auto-save to server
  const scheduleSave = useCallback((currentState) => {
    if (!currentState.playerId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      savePlayerState(currentState.playerId, {
        unlockedLocations: currentState.unlockedLocationIds,
        revealedClues: currentState.revealedClueIds,
        revealedNames: currentState.revealedNames,
        characterSummaries: currentState.characterSummaries,
      }).catch(() => {});
    }, 1000);
  }, []);

  return { state, dispatch, loadData, scheduleSave };
}
