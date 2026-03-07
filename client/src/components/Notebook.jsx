import { useState, useEffect, useRef, useCallback } from 'react';
import { loadNotebook, saveNotebook } from '../lib/api';

export async function appendNote(playerId, note) {
  if (!playerId) return;
  const existing = await loadNotebook(playerId);
  const separator = existing && !existing.endsWith('\n\n') ? (existing.endsWith('\n') ? '\n' : '\n\n') : '';
  await saveNotebook(playerId, existing + separator + note + '\n');
}

export default function Notebook({ playerId, isOpen, revision = 0, onClose }) {
  const [text, setText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const textareaRef = useRef(null);
  const saveTimer = useRef(null);

  // Load/reload when opened or revision changes
  useEffect(() => {
    if (!isOpen || !playerId) return;
    loadNotebook(playerId).then(content => {
      setText(content);
      setLoaded(true);
      setTimeout(() => {
        const el = textareaRef.current;
        if (el) { el.focus(); el.scrollTop = el.scrollHeight; }
      }, 100);
    }).catch(() => setLoaded(true));
  }, [isOpen, playerId, revision]);

  // Debounced save to DB
  const save = useCallback((val) => {
    if (!playerId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveNotebook(playerId, val).catch(() => {});
    }, 800);
  }, [playerId]);

  const handleChange = (e) => {
    setText(e.target.value);
    save(e.target.value);
  };

  // Search: split into paragraphs and filter
  const isSearching = search.trim().length > 0;
  const searchLower = search.trim().toLowerCase();
  const matchingNotes = isSearching
    ? text.split(/\n\n+/).filter(p => p.trim() && p.toLowerCase().includes(searchLower))
    : [];

  // Highlight search term in text
  const highlight = (str) => {
    if (!searchLower) return str;
    const parts = [];
    let remaining = str;
    let lower = remaining.toLowerCase();
    let idx;
    while ((idx = lower.indexOf(searchLower)) !== -1) {
      if (idx > 0) parts.push(<span key={parts.length}>{remaining.slice(0, idx)}</span>);
      parts.push(
        <mark key={parts.length} style={{ background: '#d97706', color: '#2a2218', borderRadius: 2, padding: '0 1px' }}>
          {remaining.slice(idx, idx + searchLower.length)}
        </mark>
      );
      remaining = remaining.slice(idx + searchLower.length);
      lower = remaining.toLowerCase();
    }
    if (remaining) parts.push(<span key={parts.length}>{remaining}</span>);
    return parts;
  };

  if (!isOpen) return null;

  return (
    <div className="absolute left-4 bottom-0 top-0 z-20 flex items-end pb-4 pointer-events-none">
      <div
        className="pointer-events-auto flex flex-col rounded-t-lg border border-noir-700 shadow-2xl overflow-hidden"
        style={{
          width: 340,
          height: 420,
          background: 'linear-gradient(135deg, #f5f0e8 0%, #e8e0d0 40%, #ddd5c5 100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b"
          style={{ borderColor: '#c8b8a8' }}>
          <div className="flex items-center gap-2">
            <span className="text-base">📓</span>
            <span className="font-serif text-sm font-bold" style={{ color: '#2a2218' }}>
              Anteckningar
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-lg leading-none hover:bg-black/10 transition-colors"
            style={{ color: '#6a5a4a' }}
          >
            &times;
          </button>
        </div>

        {/* Search bar */}
        <div className="px-3 py-2 border-b" style={{ borderColor: '#c8b8a8' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök i anteckningar..."
            className="w-full outline-none rounded px-2 py-1 text-xs"
            style={{
              background: 'rgba(255,255,255,0.5)',
              color: '#2a2218',
              fontFamily: 'monospace',
              border: '1px solid #c8b8a8',
            }}
          />
        </div>

        {/* Content area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Red margin line */}
          <div className="absolute top-0 bottom-0 left-10 w-px" style={{ background: '#d4888870' }} />

          {!loaded ? (
            <div className="flex items-center justify-center h-full">
              <span style={{ color: '#9a8a7a', fontFamily: 'monospace', fontSize: '12px' }}>Laddar...</span>
            </div>
          ) : isSearching ? (
            <div className="h-full overflow-y-auto p-3 pl-14"
              style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '24px', color: '#2a2218' }}>
              {matchingNotes.length === 0 ? (
                <p style={{ color: '#9a8a7a', fontStyle: 'italic' }}>Inga träffar</p>
              ) : (
                matchingNotes.map((note, i) => (
                  <div key={i} className="mb-4 pb-3" style={{ borderBottom: '1px dashed #c8b8a860' }}>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{highlight(note.trim())}</p>
                  </div>
                ))
              )}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              placeholder="Skriv dina anteckningar här..."
              className="w-full h-full resize-none outline-none p-3 pl-14"
              style={{
                background: 'transparent',
                color: '#2a2218',
                fontFamily: 'monospace',
                fontSize: '13px',
                lineHeight: '24px',
                backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, #c8b8a860 23px, #c8b8a860 24px)',
                backgroundPositionY: '23px',
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-1.5 flex items-center justify-between border-t" style={{ borderColor: '#c8b8a8' }}>
          {isSearching ? (
            <span style={{ color: '#6a5a4a', fontFamily: 'monospace', fontSize: '10px' }}>
              {matchingNotes.length} träff{matchingNotes.length !== 1 ? 'ar' : ''}
            </span>
          ) : (
            <span />
          )}
          <span style={{ color: '#9a8a7a', fontFamily: 'monospace', fontSize: '10px' }}>
            Sparas automatiskt
          </span>
        </div>
      </div>
    </div>
  );
}
