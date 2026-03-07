export default function MusicPlayer({ muted, toggleMute, volume, setVolume, inline }) {
  const className = inline
    ? 'flex items-center gap-2'
    : 'absolute bottom-4 right-4 z-30 flex items-center gap-2 bg-noir-800/90 backdrop-blur-sm border border-noir-700 rounded-lg px-3 py-2';

  return (
    <div className={className}>
      <button
        onClick={toggleMute}
        className="font-mono text-xs text-zinc-400 hover:text-white transition-colors w-5 text-center"
        title={muted ? 'Ljud på' : 'Ljud av'}
      >
        {muted ? '\u{1F507}' : '\u{1F50A}'}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={muted ? 0 : volume}
        onChange={(e) => {
          setVolume(parseFloat(e.target.value));
          if (parseFloat(e.target.value) > 0 && muted) toggleMute();
        }}
        className="w-16 h-1 accent-blood appearance-none bg-noir-700 rounded-full cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                   [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-blood"
      />
    </div>
  );
}
