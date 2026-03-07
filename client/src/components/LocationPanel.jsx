import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchCharactersAtLocation } from '../lib/api';

function ExpandableSummary({ text }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
      <p className={`font-mono text-xs text-zinc-500 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
        {text}
      </p>
      {text.length > 80 && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(e2 => !e2); }}
          className="font-mono text-[10px] text-zinc-600 hover:text-zinc-400 mt-0.5"
        >
          {expanded ? 'Visa mindre' : 'Visa mer'}
        </button>
      )}
    </div>
  );
}

export default function LocationPanel({ locationId, locations, revealedNames = [], characterSummaries = {}, onBack, onCharacterClick }) {
  const [characters, setCharacters] = useState([]);
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('palme_location_width');
    return saved ? Number(saved) : 384;
  });
  const isDragging = useRef(false);
  const location = locations.find(l => l.id === locationId);

  useEffect(() => {
    fetchCharactersAtLocation(locationId).then(setCharacters);
  }, [locationId]);

  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMove = (e) => {
      if (!isDragging.current) return;
      const delta = startX - e.clientX;
      setPanelWidth(Math.max(320, Math.min(700, startWidth + delta)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setPanelWidth(w => { localStorage.setItem('palme_location_width', String(w)); return w; });
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panelWidth]);

  if (!location) return null;

  return (
    <div
      className="absolute right-0 top-0 bottom-0 bg-noir-900/95 backdrop-blur-sm
                  border-l border-noir-700 z-20 flex flex-col animate-slide-in-right overflow-y-auto"
      style={{ width: panelWidth }}
    >
      {/* Drag handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blood/30 transition-colors z-30"
        onMouseDown={handleDragStart}
      />

      {/* Location image */}
      <div className="relative h-48 shrink-0 overflow-hidden">
        <img
          src={`/images/locations/${locationId}.png`}
          alt={location.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-noir-900 via-noir-900/40 to-transparent" />
        <button
          onClick={onBack}
          className="absolute top-4 left-4 text-zinc-400 hover:text-zinc-200 font-mono text-sm flex items-center gap-2
                     bg-noir-900/60 backdrop-blur-sm px-2 py-1 rounded"
        >
          &larr; Kartan
        </button>
      </div>

      {/* Header */}
      <div className="px-6 pb-4 pt-2 border-b border-noir-700">
        <h2 className="font-serif text-2xl text-white">{location.name}</h2>
        <p className="font-mono text-sm text-zinc-400 mt-2 leading-relaxed">
          {location.description}
        </p>
      </div>

      {/* Characters */}
      <div className="p-6 space-y-4">
        {characters.length > 0 && (
          <h3 className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            Personer på platsen
          </h3>
        )}
        {characters.map(char => {
          const nameRevealed = revealedNames.includes(char.id);
          const displayName = nameRevealed ? char.name : (char.anonymous_name || 'Okänd');
          const summary = characterSummaries[char.id];

          return (
            <button
              key={char.id}
              onClick={() => onCharacterClick(char.id)}
              className="w-full text-left p-3 bg-noir-800 border border-noir-700 rounded-lg
                         hover:border-clue/50 hover:bg-noir-800/80 transition-all group flex items-center gap-3"
            >
              <img
                src={`/images/characters/${char.id}.png`}
                alt=""
                className="w-14 h-14 rounded-lg object-cover border border-noir-600 shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="min-w-0 flex-1">
                <div className="font-serif text-lg text-white group-hover:text-clue transition-colors">
                  {displayName}
                </div>
                {summary && (
                  <ExpandableSummary text={summary} />
                )}
              </div>
            </button>
          );
        })}

        {characters.length === 0 && (
          <p className="font-mono text-sm text-zinc-600 italic">
            Ingen att prata med här just nu.
          </p>
        )}
      </div>
    </div>
  );
}
