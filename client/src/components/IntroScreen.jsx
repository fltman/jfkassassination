import { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { ASSET_BASE, getStoredApiKey, setStoredApiKey } from '../lib/api';

export default function IntroScreen({ onStart, onResume, onDeletePlayer, savedPlayers = [], music, needsApiKey }) {
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());
  const [players, setPlayers] = useState(savedPlayers);
  const [showQR, setShowQR] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const scannerRef = useRef(null);

  const handleStart = () => {
    if (!name.trim()) return;
    if (needsApiKey && !getStoredApiKey()) return;
    onStart(name.trim());
  };

  const handleDelete = (e, playerId) => {
    e.stopPropagation();
    setConfirmDelete(playerId);
  };

  const confirmDeletePlayer = () => {
    onDeletePlayer(confirmDelete);
    setPlayers(prev => prev.filter(p => p.id !== confirmDelete));
    setConfirmDelete(null);
  };

  const handleShare = (e, player) => {
    e.stopPropagation();
    setShowQR(showQR === player.id ? null : player.id);
  };

  const handleImportScanned = (playerId, playerName) => {
    // Add to local players list if not already there
    const exists = players.some(p => p.id === playerId);
    if (!exists) {
      const updated = [...players, { id: playerId, name: playerName }];
      setPlayers(updated);
      localStorage.setItem('jfk_players', JSON.stringify(updated));
    }
    setScanning(false);
    onResume(playerId);
  };

  const startScanner = async () => {
    setScanError(null);
    setScanning(true);
  };

  useEffect(() => {
    if (!scanning) return;
    let scanner = null;
    let stopped = false;

    const stopScanner = async () => {
      if (stopped || !scanner) return;
      stopped = true;
      try {
        const state = scanner.getState();
        if (state === 2 || state === 3) { // SCANNING or PAUSED
          await scanner.stop();
        }
      } catch {
        // already stopped
      }
    };

    const init = async () => {
      try {
        scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            try {
              const data = JSON.parse(decoded);
              if (data.jfk_player_id && data.name) {
                stopScanner();
                handleImportScanned(data.jfk_player_id, data.name);
              }
            } catch {
              // Not valid JSON, ignore
            }
          },
        );
      } catch (err) {
        setScanError('Could not start camera. Check permissions.');
        setScanning(false);
      }
    };

    // Small delay so the div is mounted
    const t = setTimeout(init, 100);
    return () => {
      clearTimeout(t);
      stopScanner();
    };
  }, [scanning]);

  return (
    <div className="h-screen bg-noir-950 relative overflow-hidden">
      <div
        className="fixed inset-0 bg-cover bg-center opacity-60"
        style={{ backgroundImage: `url('${ASSET_BASE}/images/locations/dealey_plaza.jpg')` }}
      />
      <div className="fixed inset-0 bg-gradient-to-t from-noir-950 via-noir-950/90 to-noir-950/70" />
      <div className="relative z-10 h-full overflow-y-auto flex flex-col items-center justify-center px-6 py-10 text-center">

      <div className="space-y-4 relative z-10" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6)' }}>
        <p className="text-3xl md:text-5xl font-serif text-white">DALLAS, TEXAS</p>
        <p className="text-xl md:text-2xl font-serif text-zinc-400">NOVEMBER 22, 1963</p>
        <p className="text-4xl md:text-6xl font-serif text-blood">12:30 PM</p>
        <div className="h-4" />
        <p className="text-base md:text-lg font-mono text-zinc-300 max-w-lg">
          President John F. Kennedy has just been shot in Dealey Plaza.
        </p>
        <div className="h-4" />
        <p className="text-base font-mono text-zinc-500">You arrive at the scene.</p>
      </div>

      <div className="relative z-10 mt-10 flex flex-col items-center gap-4 w-full max-w-sm">
        {/* Saved players */}
        {players.length > 0 && (
          <div className="w-full space-y-2 mb-2">
            <p className="font-mono text-xs text-zinc-600 uppercase tracking-wider">Resume investigation</p>
            {players.map(p => (
              <div key={p.id}>
                <button
                  onClick={() => { if (needsApiKey && !getStoredApiKey()) return; onResume(p.id); }}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg
                             bg-noir-800/80 border border-noir-700 backdrop-blur-sm
                             hover:border-zinc-500 transition-all group"
                >
                  <span className="font-mono text-sm text-zinc-200">{p.name}</span>
                  <span className="flex items-center gap-2">
                    <span
                      onClick={(e) => handleShare(e, p)}
                      className="text-zinc-700 hover:text-zinc-300 text-xs font-mono transition-colors opacity-0 group-hover:opacity-100"
                      title="Share profile"
                    >
                      QR
                    </span>
                    <span
                      onClick={(e) => handleDelete(e, p.id)}
                      className="text-zinc-700 hover:text-blood text-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      &times;
                    </span>
                  </span>
                </button>
              </div>
            ))}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1 h-px bg-noir-700" />
              <span className="font-mono text-xs text-zinc-600">or</span>
              <div className="flex-1 h-px bg-noir-700" />
            </div>
          </div>
        )}

        {/* New player */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          placeholder="Enter your name..."
          autoFocus={players.length === 0}
          className="bg-noir-800/80 border border-noir-700 rounded-lg px-4 py-2.5 w-full
                     font-mono text-sm text-zinc-200 placeholder-zinc-600 text-center
                     focus:outline-none focus:border-blood/50 backdrop-blur-sm"
        />
        <button
          onClick={handleStart}
          disabled={!name.trim() || (needsApiKey && !apiKey)}
          className="px-8 py-3 border border-blood text-blood font-mono text-sm uppercase tracking-widest
                     hover:bg-blood hover:text-white transition-all duration-300
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          New Investigation
        </button>

        {/* API key input */}
        {(needsApiKey && !apiKey) && (
          <div className="w-full bg-noir-800/80 border border-clue/30 rounded-lg p-4 backdrop-blur-sm">
            <p className="font-mono text-xs text-clue mb-2">OpenRouter API key required</p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setStoredApiKey(e.target.value);
              }}
              placeholder="sk-or-..."
              className="w-full bg-noir-900 border border-noir-600 rounded px-3 py-2 font-mono text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-clue/50"
            />
            <p className="font-mono text-[10px] text-zinc-600 mt-1.5">
              Get your key at openrouter.ai/keys
            </p>
          </div>
        )}

        {/* Import via QR scan */}
        <div className="mt-2">
          {!scanning ? (
            <button
              onClick={startScanner}
              className="font-mono text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Scan QR code to import profile
            </button>
          ) : (
            <div className="space-y-2">
              <div id="qr-reader" className="w-72 h-72 mx-auto rounded-lg overflow-hidden" />
              <button
                onClick={() => setScanning(false)}
                className="font-mono text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
          {scanError && <p className="font-mono text-xs text-blood mt-1">{scanError}</p>}
        </div>
      </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-noir-900 border border-noir-700 rounded-lg p-6 max-w-xs text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-mono text-sm text-zinc-200 mb-1">Delete profile?</p>
            <p className="font-mono text-xs text-zinc-500 mb-5">
              {players.find(p => p.id === confirmDelete)?.name}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 font-mono text-xs text-zinc-400 border border-noir-700 rounded hover:border-zinc-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePlayer}
                className="px-4 py-2 font-mono text-xs text-white bg-blood border border-blood rounded hover:bg-blood/80 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR business card modal */}
      {showQR && (() => {
        const p = players.find(pl => pl.id === showQR);
        if (!p) return null;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowQR(null)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <div
                className="relative w-full max-w-[28rem] rounded-sm overflow-hidden shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, #f5f0e8 0%, #e8e0d0 40%, #ddd5c5 100%)',
                  transform: 'rotate(-1deg)',
                }}
              >
                {/* Worn texture overlay */}
                <div className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
                  }}
                />
                {/* Coffee stain */}
                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-[0.07]"
                  style={{ background: 'radial-gradient(circle, #8B4513 0%, transparent 70%)' }}
                />
                {/* Fold line */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px opacity-[0.08]"
                  style={{ background: 'linear-gradient(to bottom, transparent, #5a4a3a 30%, #5a4a3a 70%, transparent)' }}
                />

                <div className="relative p-7 flex gap-6 items-center">
                  <div className="flex-1 text-left">
                    <p className="text-xs uppercase tracking-[0.3em] mb-4"
                      style={{ color: '#8a7a6a', fontFamily: 'serif' }}>
                      Dallas Police Department — Investigation Unit
                    </p>
                    <p className="text-2xl font-bold tracking-wide mb-1.5"
                      style={{ color: '#2a2218', fontFamily: 'serif' }}>
                      {p.name}
                    </p>
                    <p className="text-sm italic mb-5"
                      style={{ color: '#6a5a4a', fontFamily: 'serif' }}>
                      Investigator
                    </p>
                    <div className="w-14 h-px mb-3" style={{ background: '#b8a898' }} />
                    <p className="text-[11px]" style={{ color: '#9a8a7a', fontFamily: 'monospace' }}>
                      Case: Dealey Plaza Assassination
                    </p>
                    <p className="text-[11px]" style={{ color: '#9a8a7a', fontFamily: 'monospace' }}>
                      Date: Nov 22, 1963
                    </p>
                  </div>
                  <div className="shrink-0 p-3 rounded-sm" style={{ background: 'rgba(255,255,255,0.6)' }}>
                    <QRCodeSVG
                      value={JSON.stringify({ jfk_player_id: p.id, name: p.name })}
                      size={140}
                      level="M"
                      fgColor="#2a2218"
                      bgColor="transparent"
                    />
                  </div>
                </div>

                <div className="h-1 opacity-10"
                  style={{ background: 'linear-gradient(to right, #5a4a3a, transparent 20%, transparent 80%, #5a4a3a)' }}
                />
              </div>
              <p className="text-center font-mono text-xs text-zinc-500 mt-4">Click outside to close</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
