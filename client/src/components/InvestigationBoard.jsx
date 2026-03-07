import { useState, useRef, useEffect, useCallback } from 'react';
import { loadBoard, saveBoard, fetchCharactersAtLocation, ASSET_BASE } from '../lib/api';

const BOARD_W = 6000;
const BOARD_H = 4000;
const CARD_W = 180;
const CARD_H = 90;
const WITNESS_W = 160;
const WITNESS_H = 120;

export default function InvestigationBoard({ clues, clueTypes, revealedClueIds, conversations, revealedNames, characterSummaries, locations, playerId, onClose }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const svgRef = useRef(null);

  // Board state
  const [cardPositions, setCardPositions] = useState({});
  const [strings, setStrings] = useState([]);
  const [notes, setNotes] = useState([]);
  const [dragItem, setDragItem] = useState(null);
  const [stringMode, setStringMode] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [flippedCards, setFlippedCards] = useState({});
  const clickStart = useRef(null);

  // Viewport state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Drawing state
  const [tool, setTool] = useState('move'); // move | draw | erase
  const [drawColor, setDrawColor] = useState('#dc2626');
  const [drawSize, setDrawSize] = useState(3);
  const isDrawing = useRef(false);
  const drawPaths = useRef([]); // saved paths for persistence
  const currentPath = useRef([]);

  const [witnesses, setWitnesses] = useState([]); // { id, name, role, portrait_mood, location_id }

  const revealedClues = clues.filter(c => revealedClueIds.includes(c.id));
  const typeMap = {};
  for (const ct of clueTypes) typeMap[ct.id] = ct;

  // Load witness data for characters we've talked to
  const talkedToIds = Object.keys(conversations || {}).filter(id => conversations[id]?.length > 0);
  useEffect(() => {
    if (!locations?.length || !talkedToIds.length) return;
    const locationIds = [...new Set(locations.map(l => l.id))];
    Promise.all(locationIds.map(lid => fetchCharactersAtLocation(lid)))
      .then(results => {
        const allChars = results.flat();
        const talked = allChars.filter(c => talkedToIds.includes(c.id));
        setWitnesses(talked);
      })
      .catch(() => {});
  }, [talkedToIds.length, locations?.length]);

  const saveTimer = useRef(null);

  const saveToDB = useCallback((data) => {
    if (!playerId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveBoard(playerId, data).catch(() => {});
    }, 1000);
  }, [playerId]);

  // Load saved state from DB, then fill in missing positions
  useEffect(() => {
    if (!playerId) return;
    loadBoard(playerId).then(saved => {
      if (saved) {
        if (saved.strings) setStrings(saved.strings);
        if (saved.notes) setNotes(saved.notes);
        if (saved.paths) drawPaths.current = saved.paths;
        if (saved.zoom) setZoom(saved.zoom);
        if (saved.pan) setPan(saved.pan);
        redrawCanvas();
        // Merge saved positions — auto-position fills gaps below
        if (saved.positions) setCardPositions(saved.positions);
      }
    }).catch(() => {});
  }, [playerId]);

  // Auto-position: always ensure every revealed clue and witness has a position
  useEffect(() => {
    setCardPositions(prev => {
      const updated = { ...prev };
      let needsUpdate = false;
      revealedClues.forEach((clue, i) => {
        if (!updated[clue.id]) {
          const col = i % 8;
          const row = Math.floor(i / 8);
          updated[clue.id] = {
            x: 200 + col * 220 + (Math.random() * 40 - 20),
            y: 200 + row * 160 + (Math.random() * 30 - 15),
          };
          needsUpdate = true;
        }
      });
      witnesses.forEach((w, i) => {
        const wKey = `witness-${w.id}`;
        if (!updated[wKey]) {
          const col = i % 6;
          const row = Math.floor(i / 6);
          updated[wKey] = {
            x: 200 + col * 200 + (Math.random() * 30 - 15),
            y: 1200 + row * 180 + (Math.random() * 20 - 10),
          };
          needsUpdate = true;
        }
      });
      return needsUpdate ? updated : prev;
    });
  }, [revealedClues.length, witnesses.length]);

  // Save on change
  useEffect(() => {
    saveToDB({
      positions: cardPositions, strings, notes,
      paths: drawPaths.current, zoom, pan,
    });
  }, [cardPositions, strings, notes, zoom, pan, saveToDB]);

  // Redraw canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, BOARD_W, BOARD_H);

    for (const path of drawPaths.current) {
      if (path.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

  // Convert screen coords to board coords
  const screenToBoard = useCallback((clientX, clientY) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [zoom, pan]);

  // Zoom with scroll wheel
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.96 : 1.04;
    const newZoom = Math.max(0.2, Math.min(3, zoom * delta));

    // Zoom toward cursor
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    setPan(prev => ({
      x: cx - (cx - prev.x) * (newZoom / zoom),
      y: cy - (cy - prev.y) * (newZoom / zoom),
    }));
    setZoom(newZoom);
  }, [zoom]);

  // Pan handling
  const handleContainerMouseDown = useCallback((e) => {
    if (e.button !== 0 && e.button !== 1) return;

    // Drawing/erasing on left click
    if ((tool === 'draw' || tool === 'erase') && e.button === 0) {
      isDrawing.current = true;
      const coords = screenToBoard(e.clientX, e.clientY);
      if (tool === 'draw') {
        currentPath.current = [coords];
      } else {
        eraseAt(coords);
      }
      e.preventDefault();
      return;
    }

    // Pan: middle-click anywhere, or left-click on empty area in move mode
    if (e.button === 1 || (e.button === 0 && tool === 'move' && !e.target.closest('[data-card]') && !e.target.closest('[data-note]'))) {
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      e.preventDefault();
    }
  }, [tool, pan, screenToBoard]);

  const handleContainerMouseMove = useCallback((e) => {
    if (isPanning.current) {
      setPan({
        x: panStart.current.panX + (e.clientX - panStart.current.x),
        y: panStart.current.panY + (e.clientY - panStart.current.y),
      });
      return;
    }

    if (isDrawing.current) {
      const coords = screenToBoard(e.clientX, e.clientY);
      if (tool === 'draw') {
        currentPath.current.push(coords);
        // Live draw
        const canvas = canvasRef.current;
        if (canvas && currentPath.current.length >= 2) {
          const ctx = canvas.getContext('2d');
          const pts = currentPath.current;
          ctx.beginPath();
          ctx.strokeStyle = drawColor;
          ctx.lineWidth = drawSize;
          ctx.lineCap = 'round';
          ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
          ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
          ctx.stroke();
        }
      } else if (tool === 'erase') {
        eraseAt(coords);
      }
      return;
    }

    if (dragItem) {
      const coords = screenToBoard(e.clientX, e.clientY);
      const newX = Math.max(0, Math.min(BOARD_W - CARD_W, coords.x - dragItem.offsetX));
      const newY = Math.max(0, Math.min(BOARD_H - CARD_H, coords.y - dragItem.offsetY));
      if (dragItem.type === 'card') {
        setCardPositions(prev => ({ ...prev, [dragItem.id]: { x: newX, y: newY } }));
      } else {
        setNotes(prev => prev.map(n => n.id === dragItem.id ? { ...n, x: newX, y: newY } : n));
      }
    }
  }, [dragItem, tool, drawColor, drawSize, screenToBoard]);

  const handleContainerMouseUp = useCallback(() => {
    isPanning.current = false;
    if (isDrawing.current && tool === 'draw' && currentPath.current.length >= 2) {
      drawPaths.current.push({ color: drawColor, size: drawSize, points: currentPath.current });
      currentPath.current = [];
      // Trigger save
      saveToDB({
        positions: cardPositions, strings, notes,
        paths: drawPaths.current, zoom, pan,
      });
    }
    isDrawing.current = false;
    setDragItem(null);
  }, [tool, drawColor, drawSize, cardPositions, strings, notes, zoom, pan, saveToDB]);

  const eraseAt = useCallback((coords) => {
    const RADIUS = 20;
    const before = drawPaths.current.length;
    drawPaths.current = drawPaths.current.filter(path =>
      !path.points.some(p =>
        Math.abs(p.x - coords.x) < RADIUS && Math.abs(p.y - coords.y) < RADIUS
      )
    );
    if (drawPaths.current.length !== before) redrawCanvas();
  }, [redrawCanvas]);

  // Card/note drag
  const handleItemMouseDown = useCallback((e, type, id) => {
    if (e.button !== 0) return;
    // Always allow string connections regardless of tool
    if (stringMode) {
      e.stopPropagation();
      e.preventDefault();
      if (type === 'card' && id !== stringMode) {
        const exists = strings.some(
          s => (s.from === stringMode && s.to === id) || (s.from === id && s.to === stringMode)
        );
        if (exists) {
          setStrings(prev => prev.filter(
            s => !((s.from === stringMode && s.to === id) || (s.from === id && s.to === stringMode))
          ));
        } else {
          setStrings(prev => [...prev, { from: stringMode, to: id }]);
        }
        setStringMode(null);
      } else {
        setStringMode(null);
      }
      return;
    }

    if (tool === 'draw' || tool === 'erase') return;
    e.stopPropagation();
    e.preventDefault();

    const pos = type === 'card' ? cardPositions[id] : notes.find(n => n.id === id);
    if (!pos) return;
    const coords = screenToBoard(e.clientX, e.clientY);
    setDragItem({ type, id, offsetX: coords.x - pos.x, offsetY: coords.y - pos.y });
  }, [stringMode, strings, cardPositions, notes, screenToBoard, tool]);

  // Double-click to add note
  const handleDoubleClick = useCallback((e) => {
    if (e.target.closest('[data-card]') || e.target.closest('[data-note]')) return;
    if (tool !== 'move') return;
    const coords = screenToBoard(e.clientX, e.clientY);
    const newNote = { id: `note-${Date.now()}`, x: coords.x - 70, y: coords.y - 30, text: '' };
    setNotes(prev => [...prev, newNote]);
    setEditingNote(newNote.id);
  }, [screenToBoard, tool]);

  // Always returns a position — uses saved position or computes and persists a fallback
  const pendingPositions = useRef({});
  const getPos = (id, index, type = 'clue') => {
    if (cardPositions[id]) return cardPositions[id];
    if (!pendingPositions.current[id]) {
      if (type === 'witness') {
        const col = index % 6;
        const row = Math.floor(index / 6);
        pendingPositions.current[id] = { x: 200 + col * 200, y: 1200 + row * 180 };
      } else {
        const col = index % 8;
        const row = Math.floor(index / 8);
        pendingPositions.current[id] = { x: 200 + col * 220, y: 200 + row * 160 };
      }
    }
    return pendingPositions.current[id];
  };

  // Flush pending positions into state so they become draggable
  useEffect(() => {
    const pending = pendingPositions.current;
    if (Object.keys(pending).length === 0) return;
    pendingPositions.current = {};
    setCardPositions(prev => ({ ...prev, ...pending }));
  });

  const getCardCenter = (clueId) => {
    const pos = cardPositions[clueId];
    if (!pos) return null;
    return { x: pos.x + CARD_W / 2, y: pos.y + CARD_H / 2 };
  };

  const zoomIn = () => setZoom(z => Math.min(3, z * 1.2));
  const zoomOut = () => setZoom(z => Math.max(0.2, z / 1.2));
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const repositionAll = () => {
    const updated = {};
    revealedClues.forEach((clue, i) => {
      const col = i % 8;
      const row = Math.floor(i / 8);
      updated[clue.id] = {
        x: 200 + col * 220 + (Math.random() * 40 - 20),
        y: 200 + row * 160 + (Math.random() * 30 - 15),
      };
    });
    witnesses.forEach((w, i) => {
      const wKey = `witness-${w.id}`;
      const col = i % 6;
      const row = Math.floor(i / 6);
      updated[wKey] = {
        x: 200 + col * 200 + (Math.random() * 30 - 15),
        y: 1200 + row * 180 + (Math.random() * 20 - 10),
      };
    });
    // Keep note positions
    notes.forEach(n => { updated[n.id] = { x: n.x, y: n.y }; });
    setCardPositions(updated);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const toolBtn = (t, label) => (
    <button
      onClick={() => { setTool(t); setStringMode(null); }}
      className={`font-mono text-xs px-3 py-1.5 rounded border transition-all ${
        tool === t
          ? 'bg-accent/20 border-accent text-accent'
          : 'bg-noir-800 border-noir-700 text-zinc-400 hover:text-zinc-200'
      }`}
    >
      {label}
    </button>
  );

  const cursorClass = tool === 'draw' ? 'cursor-crosshair' : tool === 'erase' ? 'cursor-cell' : 'cursor-grab';

  return (
    <div className="fixed inset-0 z-50 bg-noir-950 flex flex-col">
      {/* Toolbar */}
      <div className="h-12 bg-noir-900 border-b border-noir-700 flex items-center justify-between px-4 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-lg text-white">Utredningstavlan</h2>
          <span className="font-mono text-xs text-zinc-500">{revealedClues.length} ledtrådar · {witnesses.length} vittnen</span>
          <div className="w-px h-6 bg-noir-700" />
          {toolBtn('move', 'Flytta')}
          {toolBtn('draw', 'Rita')}
          {toolBtn('erase', 'Sudda')}
          {tool === 'draw' && (
            <>
              <div className="flex items-center gap-1.5 ml-1">
                {['#dc2626', '#d97706', '#2563eb', '#22c55e', '#ffffff'].map(c => (
                  <button
                    key={c}
                    onClick={() => setDrawColor(c)}
                    className={`w-5 h-5 rounded-full border-2 ${drawColor === c ? 'border-white' : 'border-transparent'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <select
                value={drawSize}
                onChange={(e) => setDrawSize(Number(e.target.value))}
                className="bg-noir-800 border border-noir-700 text-zinc-400 font-mono text-xs rounded px-1 py-1"
              >
                <option value="2">Tunn</option>
                <option value="3">Normal</option>
                <option value="6">Tjock</option>
                <option value="12">Bred</option>
              </select>
            </>
          )}
          <div className="w-px h-6 bg-noir-700" />
          <button
            onClick={() => setStringMode(stringMode ? null : '__select__')}
            className={`font-mono text-xs px-3 py-1.5 rounded border transition-all ${
              stringMode ? 'bg-blood/20 border-blood text-blood' : 'bg-noir-800 border-noir-700 text-zinc-400 hover:text-blood'
            }`}
          >
            {stringMode ? 'Välj ledtråd...' : 'Röd tråd'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={repositionAll}
            className="font-mono text-[10px] text-zinc-500 hover:text-white px-2 py-1 border border-noir-700 rounded bg-noir-800 hover:border-zinc-500 transition-colors"
          >
            Ordna alla
          </button>
          <span className="font-mono text-[10px] text-zinc-600">{Math.round(zoom * 100)}%</span>
          <button onClick={zoomOut} className="w-7 h-7 bg-noir-800 border border-noir-700 rounded text-zinc-400 hover:text-white text-sm">-</button>
          <button onClick={resetView} className="font-mono text-[10px] text-zinc-500 hover:text-white px-1">Reset</button>
          <button onClick={zoomIn} className="w-7 h-7 bg-noir-800 border border-noir-700 rounded text-zinc-400 hover:text-white text-sm">+</button>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl ml-3">&times;</button>
        </div>
      </div>

      {/* Board viewport */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-hidden ${cursorClass}`}
        style={{ backgroundColor: '#0d0d14' }}
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        onMouseLeave={handleContainerMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <div
          style={{
            width: BOARD_W,
            height: BOARD_H,
            position: 'relative',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
            backgroundSize: '40px 40px',
            border: '3px solid #2a2218',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.8)',
          }}
        >
          {/* Drawing canvas */}
          <canvas
            ref={canvasRef}
            width={BOARD_W}
            height={BOARD_H}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          />

          {/* SVG strings layer */}
          <svg
            ref={svgRef}
            width={BOARD_W}
            height={BOARD_H}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            {strings.map((s, i) => {
              const from = getCardCenter(s.from);
              const to = getCardCenter(s.to);
              if (!from || !to) return null;
              return (
                <g key={i}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke="#dc2626" strokeWidth="2" opacity="0.7" strokeDasharray="8 4" />
                  <circle cx={from.x} cy={from.y} r="4" fill="#dc2626" opacity="0.9" />
                  <circle cx={to.x} cy={to.y} r="4" fill="#dc2626" opacity="0.9" />
                </g>
              );
            })}
          </svg>

          {/* Clue cards */}
          {revealedClues.map((clue, i) => {
            const pos = getPos(clue.id, i, 'clue');
            const ct = typeMap[clue.type];
            const isStringTarget = stringMode && stringMode !== clue.id && stringMode !== '__select__';
            const isStringSource = stringMode === clue.id;
            const connectedStrings = strings.filter(s => s.from === clue.id || s.to === clue.id);
            const flipped = flippedCards[clue.id];
            const rotation = ((clue.id.charCodeAt(5) || 0) % 7) - 3;

            return (
              <div
                key={clue.id}
                data-card
                className={`absolute select-none transition-shadow ${
                  isStringSource ? 'ring-2 ring-blood shadow-lg shadow-blood/20' :
                  isStringTarget ? 'hover:ring-2 hover:ring-blood/50 cursor-crosshair' :
                  tool === 'move' ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
                style={{ left: pos.x, top: pos.y, width: CARD_W, zIndex: dragItem?.id === clue.id ? 100 : 10, perspective: 600 }}
                onMouseDown={(e) => {
                  clickStart.current = { x: e.clientX, y: e.clientY, id: clue.id };
                  if (stringMode === '__select__') { e.stopPropagation(); setStringMode(clue.id); return; }
                  handleItemMouseDown(e, 'card', clue.id);
                }}
                onMouseUp={(e) => {
                  const start = clickStart.current;
                  if (start && start.id === clue.id) {
                    const dx = Math.abs(e.clientX - start.x);
                    const dy = Math.abs(e.clientY - start.y);
                    if (dx < 4 && dy < 4 && tool === 'move' && !stringMode) {
                      setFlippedCards(prev => ({ ...prev, [clue.id]: !prev[clue.id] }));
                    }
                  }
                  clickStart.current = null;
                }}
              >
                {/* Pin */}
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-zinc-600 border border-zinc-500 shadow-md z-10" />
                {/* Flip container */}
                <div style={{
                  transform: `rotate(${rotation}deg) rotateY(${flipped ? 180 : 0}deg)`,
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.5s ease',
                }}>
                  {/* Front — Polaroid */}
                  <div className="bg-[#f5f0e8] p-1.5 pb-12 relative"
                    style={{
                      boxShadow: '0 3px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)',
                      backfaceVisibility: 'hidden',
                    }}>
                    <img src={`${ASSET_BASE}/images/clues/${clue.id}.jpg`} alt=""
                      className="w-full h-28 object-cover"
                      style={{ filter: 'contrast(1.05) saturate(0.9)' }}
                      onError={(e) => { e.target.style.display = 'none'; }} />
                    <div className="absolute bottom-1.5 left-0 right-0 px-2 text-center">
                      <span className="text-[13px] leading-tight line-clamp-2" style={{ fontFamily: "'Caveat', cursive", color: '#2a2218', fontWeight: 600 }}>
                        {clue.title}
                      </span>
                    </div>
                    {connectedStrings.length > 0 && (
                      <div className="absolute top-2 right-2 flex gap-0.5">
                        {connectedStrings.map((_, ci) => <div key={ci} className="w-1.5 h-1.5 rounded-full bg-red-600" />)}
                      </div>
                    )}
                  </div>
                  {/* Back — Description */}
                  <div className="absolute inset-0 bg-[#f5f0e8] p-3 overflow-hidden"
                    style={{
                      boxShadow: '0 3px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)',
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}>
                    <div className="text-[11px] leading-tight mb-1 pb-1 border-b" style={{ fontFamily: "'Caveat', cursive", color: '#2a2218', fontWeight: 600, borderColor: '#d0c8b8' }}>
                      {clue.title}
                    </div>
                    <div className="text-[10px] leading-snug overflow-hidden" style={{ fontFamily: "'Caveat', cursive", color: '#4a3a2a' }}>
                      {clue.description}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Witness cards */}
          {witnesses.map((w, i) => {
            const wKey = `witness-${w.id}`;
            const pos = getPos(wKey, i, 'witness');
            const knownName = (revealedNames || []).includes(w.id);
            const displayName = knownName ? w.name : (w.anonymous_name || 'Okänd');
            const summary = (characterSummaries || {})[w.id];
            const isStringTarget = stringMode && stringMode !== wKey && stringMode !== '__select__';
            const isStringSource = stringMode === wKey;
            const connectedStrings = strings.filter(s => s.from === wKey || s.to === wKey);
            const location = (locations || []).find(l => l.id === w.location_id);

            const wFlipped = flippedCards[wKey];
            const wRotation = ((w.id.charCodeAt(3) || 0) % 9) - 4;

            return (
              <div
                key={wKey}
                data-card
                className={`absolute select-none transition-shadow ${
                  isStringSource ? 'ring-2 ring-blood shadow-lg shadow-blood/20' :
                  isStringTarget ? 'hover:ring-2 hover:ring-blood/50 cursor-crosshair' :
                  tool === 'move' ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
                style={{ left: pos.x, top: pos.y, width: WITNESS_W, zIndex: dragItem?.id === wKey ? 100 : 10, perspective: 600 }}
                onMouseDown={(e) => {
                  clickStart.current = { x: e.clientX, y: e.clientY, id: wKey };
                  if (stringMode === '__select__') { e.stopPropagation(); setStringMode(wKey); return; }
                  handleItemMouseDown(e, 'card', wKey);
                }}
                onMouseUp={(e) => {
                  const start = clickStart.current;
                  if (start && start.id === wKey) {
                    const dx = Math.abs(e.clientX - start.x);
                    const dy = Math.abs(e.clientY - start.y);
                    if (dx < 4 && dy < 4 && tool === 'move' && !stringMode) {
                      setFlippedCards(prev => ({ ...prev, [wKey]: !prev[wKey] }));
                    }
                  }
                  clickStart.current = null;
                }}
              >
                {/* Pin */}
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-zinc-600 border border-zinc-500 shadow-md z-10" />
                {/* Flip container */}
                <div style={{
                  transform: `rotate(${wRotation}deg) rotateY(${wFlipped ? 180 : 0}deg)`,
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.5s ease',
                }}>
                  {/* Front — Polaroid */}
                  <div className="bg-[#f5f0e8] p-1.5 pb-12 relative"
                    style={{
                      boxShadow: '0 3px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)',
                      backfaceVisibility: 'hidden',
                    }}>
                    <img
                      src={`${ASSET_BASE}/images/characters/${w.id}.jpg`}
                      alt=""
                      className="w-full h-28 object-cover object-top"
                      style={{ filter: 'contrast(1.05) saturate(0.85)' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="absolute bottom-1.5 left-0 right-0 px-2 text-center">
                      <span className="text-[13px] leading-tight line-clamp-2 block" style={{ fontFamily: "'Caveat', cursive", color: '#2a2218', fontWeight: 600 }}>
                        {displayName}
                      </span>
                    </div>
                    {connectedStrings.length > 0 && (
                      <div className="absolute top-2 right-2 flex gap-0.5">
                        {connectedStrings.map((_, ci) => <div key={ci} className="w-1.5 h-1.5 rounded-full bg-red-600" />)}
                      </div>
                    )}
                  </div>
                  {/* Back — Summary */}
                  <div className="absolute inset-0 bg-[#f5f0e8] p-3 overflow-hidden"
                    style={{
                      boxShadow: '0 3px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)',
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}>
                    <div className="text-[11px] leading-tight mb-1 pb-1 border-b" style={{ fontFamily: "'Caveat', cursive", color: '#2a2218', fontWeight: 600, borderColor: '#d0c8b8' }}>
                      {displayName}
                    </div>
                    <div className="text-[10px] leading-snug" style={{ fontFamily: "'Caveat', cursive", color: '#6a5a4a' }}>
                      {w.role}
                    </div>
                    {summary && (
                      <div className="mt-1 text-[10px] leading-snug overflow-hidden" style={{ fontFamily: "'Caveat', cursive", color: '#4a3a2a' }}>
                        {summary}
                      </div>
                    )}
                    {!summary && (
                      <div className="mt-1.5 text-[10px] italic" style={{ fontFamily: "'Caveat', cursive", color: '#9a8a7a' }}>
                        Inget samtal ännu...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Sticky notes */}
          {notes.map(note => (
            <div
              key={note.id}
              data-note
              className={`absolute select-none ${tool === 'move' ? 'cursor-grab active:cursor-grabbing' : ''}`}
              style={{
                left: note.x, top: note.y, width: 160,
                zIndex: dragItem?.id === note.id ? 100 : 20,
                transform: `rotate(${(note.id.charCodeAt(5) % 7) - 3}deg)`,
              }}
              onMouseDown={(e) => handleItemMouseDown(e, 'note', note.id)}
            >
              <div className="bg-yellow-300/90 p-2.5 shadow-md rounded-sm relative" style={{ minHeight: 60 }}>
                <button
                  className="absolute -top-2 -right-2 w-5 h-5 bg-noir-800 text-zinc-400 rounded-full text-xs flex items-center justify-center hover:bg-blood hover:text-white transition-colors"
                  onMouseDown={(e) => { e.stopPropagation(); setNotes(prev => prev.filter(n => n.id !== note.id)); }}
                >
                  &times;
                </button>
                {editingNote === note.id ? (
                  <textarea
                    autoFocus
                    className="w-full bg-transparent text-noir-950 font-mono text-[11px] resize-none outline-none"
                    style={{ minHeight: 40 }}
                    value={note.text}
                    onChange={(e) => setNotes(prev => prev.map(n => n.id === note.id ? { ...n, text: e.target.value } : n))}
                    onBlur={() => setEditingNote(null)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setEditingNote(null); }}
                  />
                ) : (
                  <div
                    className="font-mono text-[11px] text-noir-950 whitespace-pre-wrap min-h-[20px]"
                    onDoubleClick={(e) => { e.stopPropagation(); setEditingNote(note.id); }}
                  >
                    {note.text || <span className="text-noir-950/40 italic">Dubbelklicka...</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
