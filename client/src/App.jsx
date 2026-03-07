import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { useMusic, resolveTrack } from './hooks/useMusic';
import { fetchLocations, fetchClues, fetchClueTypes, fetchConfig, createPlayer, loadPlayer, savePlayerState, saveConversation, generateNote, getStoredApiKey, setStoredApiKey } from './lib/api';
import IntroScreen from './components/IntroScreen';
import GameMap from './components/GameMap';
import LocationPanel from './components/LocationPanel';
import ChatPanel from './components/ChatPanel';
import ClueLog from './components/ClueLog';
import InvestigationBoard from './components/InvestigationBoard';
import Notifications from './components/Notifications';
import MusicPlayer from './components/MusicPlayer';
import Notebook, { appendNote } from './components/Notebook';

const PLAYERS_KEY = 'palme_players';

// Migrate old single-player localStorage to new format
(function migrate() {
  const oldId = localStorage.getItem('palme_player_id');
  if (oldId) {
    const existing = JSON.parse(localStorage.getItem(PLAYERS_KEY) || '[]');
    if (!existing.some(p => p.id === oldId)) {
      existing.push({ id: oldId, name: 'Utredare' });
      localStorage.setItem(PLAYERS_KEY, JSON.stringify(existing));
    }
    localStorage.removeItem('palme_player_id');
  }
})();

export default function App() {
  const { state, dispatch, loadData } = useGameState();
  const music = useMusic();
  const saveTimer = useRef(null);
  const [clueLogOpen, setClueLogOpen] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [savedPlayers, setSavedPlayers] = useState(() => JSON.parse(localStorage.getItem(PLAYERS_KEY) || '[]'));
  const [notebookRevision, setNotebookRevision] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  // Load game data
  useEffect(() => {
    Promise.all([fetchLocations(), fetchClues(), fetchClueTypes(), fetchConfig()])
      .then(([locations, clues, clueTypes, config]) => {
        loadData(locations, clues, clueTypes);
        if (!config.hasServerKey && !getStoredApiKey()) {
          setSettingsOpen(true);
        }
      })
      .catch(err => console.error('Failed to load game data:', err));
  }, [loadData]);

  // Switch music based on view and location
  useEffect(() => {
    const track = resolveTrack(state.currentView, state.activeLocationId);
    music.switchTrack(track);
  }, [state.currentView, state.activeLocationId]);

  // Play stinger when new clues are revealed
  const prevClueCount = useRef(state.revealedClueIds.length);
  useEffect(() => {
    if (state.revealedClueIds.length > prevClueCount.current) {
      music.playStinger();
    }
    prevClueCount.current = state.revealedClueIds.length;
  }, [state.revealedClueIds.length]);

  // Auto-save player state (debounced)
  useEffect(() => {
    if (!state.playerId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      savePlayerState(state.playerId, {
        unlockedLocations: state.unlockedLocationIds,
        revealedClues: state.revealedClueIds,
        revealedNames: state.revealedNames,
        characterSummaries: state.characterSummaries,
      }).catch(() => {});
    }, 1000);
  }, [state.playerId, state.unlockedLocationIds, state.revealedClueIds, state.revealedNames, state.characterSummaries]);

  // Save conversation when it changes
  const handleSaveConversation = useCallback((characterId) => {
    if (!state.playerId) return;
    const msgs = state.conversations[characterId];
    if (msgs?.length) {
      saveConversation(state.playerId, characterId, msgs).catch(() => {});
    }
  }, [state.playerId, state.conversations]);

  // Handle start — create new player
  const handleStart = async (playerName) => {
    music.switchTrack('intro');
    const player = await createPlayer(playerName);
    const updated = [...savedPlayers, { id: player.id, name: player.name }];
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(updated));
    setSavedPlayers(updated);
    dispatch({ type: 'LOAD_PLAYER', player });
    dispatch({ type: 'SET_VIEW', view: 'map' });
  };

  // Handle resume — load existing player
  const handleResume = async (playerId) => {
    music.switchTrack('intro');
    const player = await loadPlayer(playerId);
    if (player) {
      dispatch({ type: 'LOAD_PLAYER', player });
      dispatch({ type: 'SET_VIEW', view: 'map' });
    } else {
      // Player no longer exists in DB — remove from localStorage
      const updated = savedPlayers.filter(p => p.id !== playerId);
      localStorage.setItem(PLAYERS_KEY, JSON.stringify(updated));
      setSavedPlayers(updated);
    }
  };

  // Handle delete saved player
  const handleDeletePlayer = (playerId) => {
    const updated = savedPlayers.filter(p => p.id !== playerId);
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(updated));
    setSavedPlayers(updated);
  };

  if (!state.dataLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-noir-950">
        <p className="font-mono text-zinc-500 animate-pulse">Laddar...</p>
      </div>
    );
  }

  if (state.currentView === 'intro') {
    return (
      <IntroScreen
        onStart={handleStart}
        onResume={handleResume}
        onDeletePlayer={handleDeletePlayer}
        savedPlayers={savedPlayers}
        music={music}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-noir-950 overflow-hidden">
      {/* Map is always rendered underneath */}
      <div className="flex-1 relative">
        <GameMap
          locations={state.locations}
          unlockedLocationIds={state.unlockedLocationIds}
          onLocationClick={(id) => dispatch({ type: 'OPEN_LOCATION', locationId: id })}
        />

        {/* Side panels */}
        {state.currentView === 'location' && state.activeLocationId && (
          <LocationPanel
            locationId={state.activeLocationId}
            locations={state.locations}
            revealedNames={state.revealedNames}
            characterSummaries={state.characterSummaries}
            onBack={() => dispatch({ type: 'SET_VIEW', view: 'map' })}
            onCharacterClick={(id) => dispatch({ type: 'OPEN_CHAT', characterId: id })}
          />
        )}

        {state.currentView === 'chat' && state.activeCharacterId && (
          <ChatPanel
            characterId={state.activeCharacterId}
            locationId={state.activeLocationId}
            locations={state.locations}
            conversations={state.conversations}
            revealedClueIds={state.revealedClueIds}
            revealedNames={state.revealedNames}
            characterSummaries={state.characterSummaries}
            isLoading={state.isLoading}
            dispatch={dispatch}
            onSaveConversation={handleSaveConversation}
            onAddNote={async (characterName, message) => {
              setNotebookOpen(true);
              const note = await generateNote(characterName, message);
              if (note) {
                await appendNote(state.playerId, note);
                setNotebookRevision(r => r + 1);
              }
            }}
          />
        )}

        {/* Notebook */}
        <Notebook
          playerId={state.playerId}
          isOpen={notebookOpen}
          revision={notebookRevision}
          onClose={() => setNotebookOpen(false)}
        />

        {/* Clue log panel */}
        <ClueLog
          clues={state.clues}
          clueTypes={state.clueTypes}
          revealedClueIds={state.revealedClueIds}
          isOpen={clueLogOpen}
          onClose={() => setClueLogOpen(false)}
        />

        {/* Investigation board overlay */}
        {state.currentView === 'board' && (
          <InvestigationBoard
            clues={state.clues}
            clueTypes={state.clueTypes}
            revealedClueIds={state.revealedClueIds}
            playerId={state.playerId}
            onClose={() => dispatch({ type: 'SET_VIEW', view: 'map' })}
          />
        )}

        {/* Toast notifications */}
        <Notifications
          notifications={state.pendingNotifications}
          locations={state.locations}
          onDismiss={(id) => dispatch({ type: 'DISMISS_NOTIFICATION', notificationId: id })}
        />
      </div>

      {/* Bottom toolbar */}
      <div className="h-12 bg-noir-900 border-t border-noir-700 flex items-center justify-between px-4 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setClueLogOpen(o => !o)}
            className="font-mono text-xs text-zinc-400 hover:text-clue transition-colors
                       flex items-center gap-2 px-3 py-1.5 rounded border border-noir-700
                       hover:border-clue/30 bg-noir-800"
          >
            <span>Ledtrådar</span>
            {state.revealedClueIds.length > 0 && (
              <span className="bg-clue/20 text-clue px-1.5 py-0.5 rounded text-xs">
                {state.revealedClueIds.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setNotebookOpen(o => !o)}
            className="font-mono text-xs text-zinc-400 hover:text-zinc-200 transition-colors
                       flex items-center gap-2 px-3 py-1.5 rounded border border-noir-700
                       hover:border-zinc-500 bg-noir-800"
          >
            Anteckningar
          </button>
          {state.revealedClueIds.length >= 2 && (
            <button
              onClick={() => dispatch({ type: 'SET_VIEW', view: 'board' })}
              className="font-mono text-xs text-zinc-400 hover:text-blood transition-colors
                         flex items-center gap-2 px-3 py-1.5 rounded border border-noir-700
                         hover:border-blood/30 bg-noir-800"
            >
              Utredningstavlan
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <MusicPlayer
            muted={music.muted}
            toggleMute={music.toggleMute}
            volume={music.volume}
            setVolume={music.setVolume}
            inline
          />
          <div className="relative">
            <button
              onClick={() => setSettingsOpen(o => !o)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Inställningar"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="2.5" />
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4" />
              </svg>
            </button>
            {settingsOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-72 bg-noir-800 border border-noir-600 rounded-lg p-3 shadow-xl z-50">
                <label className="block font-mono text-[11px] text-zinc-400 mb-1">
                  OpenRouter API-nyckel
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setStoredApiKey(e.target.value);
                  }}
                  placeholder="sk-or-..."
                  className="w-full bg-noir-900 border border-noir-600 rounded px-2 py-1.5 font-mono text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
                <p className="font-mono text-[10px] text-zinc-600 mt-1.5">
                  Valfritt. Används istället för serverns nyckel.
                </p>
              </div>
            )}
          </div>
          <button
            onClick={toggleFullscreen}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            title={isFullscreen ? 'Avsluta fullskärm' : 'Fullskärm'}
          >
            {isFullscreen ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 1v4H1M11 1v4h4M5 15v-4H1M11 15v-4h4" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 5V1h4M11 1h4v4M1 11v4h4M15 11v4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
