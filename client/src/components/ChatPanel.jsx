import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchCharacter, sendMessage, summarizeConversation, ASSET_BASE } from '../lib/api';

function renderMarkdown(text) {
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={match.index} className="font-bold text-zinc-100">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={match.index} className="italic text-zinc-400">{match[3]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

export default function ChatPanel({
  characterId,
  locationId,
  locations,
  conversations,
  revealedClueIds,
  revealedNames = [],
  characterSummaries = {},
  isLoading,
  dispatch,
  onSaveConversation,
  onAddNote,
}) {
  const [character, setCharacter] = useState(null);
  const [input, setInput] = useState('');
  const [notingIndex, setNotingIndex] = useState(null);
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('palme_chat_width');
    return saved ? Number(saved) : 384;
  });
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isDragging = useRef(false);

  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;
    const onMove = (e) => {
      if (!isDragging.current) return;
      setPanelWidth(Math.max(320, Math.min(700, startWidth + (startX - e.clientX))));
    };
    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setPanelWidth(w => { localStorage.setItem('palme_chat_width', String(w)); return w; });
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panelWidth]);
  const messages = conversations[characterId] || [];
  const location = locations.find(l => l.id === locationId);
  const nameRevealed = revealedNames.includes(characterId);

  useEffect(() => {
    fetchCharacter(characterId).then(setCharacter);
  }, [characterId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Refocus input after loading finishes
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  // Check if character reveals their name in any message
  useEffect(() => {
    if (!character || nameRevealed) return;
    const realName = character.name;
    const firstName = realName.split(' ')[0];
    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.content.includes(firstName)) {
        dispatch({ type: 'REVEAL_NAME', characterId });
        break;
      }
    }
  }, [messages, character, characterId, nameRevealed, dispatch]);

  // Save conversation when leaving chat
  const handleBack = () => {
    if (onSaveConversation) onSaveConversation(characterId);
    // Generate AI summary if we have enough messages
    if (messages.length >= 2) {
      summarizeConversation(characterId, messages).then(summary => {
        if (summary) dispatch({ type: 'SET_CHARACTER_SUMMARY', characterId, summary });
      }).catch(() => {});
    }
    dispatch({ type: 'OPEN_LOCATION', locationId });
  };

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    dispatch({ type: 'ADD_MESSAGE', characterId, role: 'user', content: userMessage });
    dispatch({ type: 'SET_LOADING', loading: true });

    const updatedMessages = [...messages, { role: 'user', content: userMessage }];

    try {
      const result = await sendMessage(characterId, updatedMessages, revealedClueIds);
      dispatch({ type: 'ADD_MESSAGE', characterId, role: 'assistant', content: result.message });

      if (result.revealedClues?.length > 0) {
        dispatch({ type: 'REVEAL_CLUES', clueIds: result.revealedClues });
      }
    } catch {
      dispatch({
        type: 'ADD_MESSAGE',
        characterId,
        role: 'assistant',
        content: 'Karaktären svarar inte just nu. Försök igen.',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }

  const displayName = nameRevealed
    ? character?.name
    : (character?.anonymous_name || 'Okänd');
  const summary = characterSummaries[characterId];

  return (
    <div className="absolute right-0 top-0 bottom-0 w-full md:w-auto bg-noir-900/95 backdrop-blur-sm
                    border-l border-noir-700 z-20 flex flex-col" style={{ width: window.innerWidth < 768 ? '100%' : panelWidth }}>
      {/* Drag handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blood/30 transition-colors z-30"
        onMouseDown={handleDragStart}
      />
      {/* Header with full-width portrait */}
      <div className="flex-shrink-0">
        <div className="relative">
          <img
            src={`${ASSET_BASE}/images/characters/${characterId}.jpg`}
            alt=""
            className="w-full h-48 object-cover portrait-pan"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-noir-900 via-noir-900/30 to-transparent" />
          <button
            onClick={handleBack}
            className="absolute top-3 left-3 text-zinc-300 hover:text-white font-mono text-sm flex items-center gap-1
                       bg-noir-900/60 backdrop-blur-sm px-2 py-1 rounded"
          >
            &larr; {location?.name || 'Tillbaka'}
          </button>
        </div>
        <div className="px-4 pb-3 pt-1 border-b border-noir-700">
          <h2 className="font-serif text-xl text-white">{displayName}</h2>
          {summary && (
            <div className="mt-1">
              <p className={`font-mono text-xs text-zinc-500 leading-relaxed ${summaryExpanded ? '' : 'line-clamp-2'}`}>
                {summary}
              </p>
              <button
                onClick={() => setSummaryExpanded(e => !e)}
                className="font-mono text-[10px] text-zinc-600 hover:text-zinc-400 mt-0.5"
              >
                {summaryExpanded ? 'Visa mindre' : 'Visa mer'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group/msg`}
          >
            <div className="max-w-[85%]">
              <div
                className={`px-4 py-2.5 rounded-lg font-mono text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-accent/20 text-zinc-200 rounded-br-sm'
                    : 'bg-noir-800 text-zinc-300 border border-noir-700 rounded-bl-sm'
                }`}
              >
                {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
              </div>
              {msg.role === 'assistant' && onAddNote && (
                <div className="flex justify-end mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                  {notingIndex === i ? (
                    <span className="font-mono text-[10px] text-clue animate-pulse">Antecknar...</span>
                  ) : (
                    <button
                      onClick={async () => {
                        setNotingIndex(i);
                        await onAddNote(displayName, msg.content);
                        setNotingIndex(null);
                      }}
                      className="font-mono text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      + Anteckna
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-noir-800 border border-noir-700 rounded-lg px-4 py-3 rounded-bl-sm">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-noir-700 flex-shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ställ en fråga..."
            disabled={isLoading}
            autoFocus
            className="flex-1 bg-noir-800 border border-noir-700 rounded-lg px-4 py-2.5
                       font-mono text-sm text-zinc-200 placeholder-zinc-600
                       focus:outline-none focus:border-accent/50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 bg-accent/20 text-accent border border-accent/30 rounded-lg
                       font-mono text-sm hover:bg-accent/30 disabled:opacity-30 transition-colors"
          >
            Skicka
          </button>
        </div>
      </form>
    </div>
  );
}
