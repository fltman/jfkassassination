import { useEffect } from 'react';
import { ASSET_BASE } from '../lib/api';

export default function Notifications({ notifications, locations, onDismiss }) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 items-center">
      {notifications.map(notif => (
        <Toast
          key={notif.id}
          notification={notif}
          locations={locations}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

function Toast({ notification, locations, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), 4000);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const location = notification.unlocksLocation
    ? locations.find(l => l.id === notification.unlocksLocation)
    : null;

  return (
    <div
      onClick={() => onDismiss(notification.id)}
      className="bg-noir-800/95 backdrop-blur-sm border border-clue/30 rounded-lg overflow-hidden
                 font-mono text-sm cursor-pointer hover:border-clue/50 transition-all
                 animate-slide-up shadow-lg shadow-black/50 max-w-sm flex items-center gap-3"
    >
      <img
        src={`${ASSET_BASE}/images/clues/${notification.clueId}.jpg`}
        alt=""
        className="w-16 h-16 object-cover shrink-0"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      <div className="py-3 pr-4">
        <div className="text-clue flex items-center gap-2">
          <span className="text-base">&#x1f50d;</span>
          <span>Ny ledtråd: {notification.title}</span>
        </div>
        {location && (
          <div className="text-zinc-500 text-xs mt-1">
            Ny plats på kartan: {location.name}
          </div>
        )}
      </div>
    </div>
  );
}
