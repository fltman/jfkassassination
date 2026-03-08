import { ASSET_BASE } from '../lib/api';

export default function ClueLog({ clues, clueTypes, revealedClueIds, isOpen, onClose }) {
  const revealedClues = clues.filter(c => revealedClueIds.includes(c.id));
  const typeMap = {};
  for (const ct of clueTypes) {
    typeMap[ct.id] = ct;
  }

  const grouped = {};
  for (const clue of revealedClues) {
    const type = clue.type || 'unknown';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(clue);
  }

  if (!isOpen) return null;

  return (
    <div className="absolute left-0 top-0 bottom-0 w-full md:w-80 bg-noir-900/95 backdrop-blur-sm
                    border-r border-noir-700 z-[55] flex flex-col overflow-y-auto">
      <div className="p-6 border-b border-noir-700 flex items-center justify-between">
        <h2 className="font-serif text-xl text-white">Clues</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">
          &times;
        </button>
      </div>

      <div className="p-4 space-y-6">
        {Object.entries(grouped).map(([typeId, typeClues]) => {
          const ct = typeMap[typeId];
          return (
            <div key={typeId}>
              <h3 className="font-mono text-xs uppercase tracking-widest mb-3 flex items-center gap-2"
                  style={{ color: ct?.color || '#71717a' }}>
                <span>{ct?.icon}</span>
                <span>{ct?.label || typeId}</span>
              </h3>
              <div className="space-y-2">
                {typeClues.map(clue => (
                  <div
                    key={clue.id}
                    className="bg-noir-800 border rounded-lg font-mono text-xs leading-relaxed overflow-hidden"
                    style={{ borderColor: typeId === 'contradiction' ? '#7c3aed40' : '#27272a' }}
                  >
                    <img
                      src={`${ASSET_BASE}/images/clues/${clue.id}.jpg`}
                      alt={clue.title}
                      className="w-full h-24 object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="p-3">
                      <div className="text-zinc-200 font-medium mb-1">{clue.title}</div>
                      <div className="text-zinc-500">{clue.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {revealedClues.length === 0 && (
          <p className="font-mono text-sm text-zinc-600 italic text-center py-8">
            No clues found yet. Talk to the witnesses.
          </p>
        )}
      </div>
    </div>
  );
}
