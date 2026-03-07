import { useEffect, useRef, useState, useCallback } from 'react';

const TRACKS = {
  intro: '/music/SVEAVÄGEN — Huvudtema.mp3',
  map: '/music/NATTLIG KARTA — Kartvyn _ Utforskning.mp3',
  mordplatsen: '/music/MORDPLATSEN — Sveavägen kl 23_21.mp3',
  chat: '/music/VITTNESMÅL — Samtalstema.mp3',
  board: '/music/UTREDNINGSTAVLAN — Detektiven kl 03_00.mp3',
  engstrom: '/music/ENGSTRÖM-TEMAT — Obehaget.mp3',
  sydafrika: '/music/SYDAFRIKASPÅRET — Internationell konspiration.mp3',
  polis: '/music/POLISSPÅRET — Paranoia.mp3',
  epilog: '/music/EPILOG — Olöst.mp3',
};

const STINGER = '/music/LEDTRÅD — Stinger.mp3';
const FADE_MS = 1500;
const FADE_STEP = 50;

// Location IDs that map to special tracks
const LOCATION_TRACKS = {
  mordplatsen: 'mordplatsen',
  sveavagen_44: 'mordplatsen',
  polishuset: 'polis',
  sapo_huset: 'polis',
  sydafrikanska_ambassaden: 'sydafrika',
};

export function resolveTrack(view, locationId) {
  if (view === 'intro') return 'intro';
  if (view === 'board') return 'board';
  if (view === 'chat') return 'chat';
  if (view === 'location' || view === 'map') {
    if (locationId && LOCATION_TRACKS[locationId]) {
      return LOCATION_TRACKS[locationId];
    }
    return 'map';
  }
  return 'map';
}

export function useMusic() {
  const audioRef = useRef(null);
  const stingerRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [volume, setVolume] = useState(0.3);
  const [muted, setMuted] = useState(false);
  const fadeInterval = useRef(null);

  // Init audio elements
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.loop = true;
    audioRef.current.volume = 0;
    stingerRef.current = new Audio(STINGER);
    stingerRef.current.volume = 0.4;
    return () => {
      audioRef.current?.pause();
      stingerRef.current?.pause();
      if (fadeInterval.current) clearInterval(fadeInterval.current);
    };
  }, []);

  // Update volume when muted/volume changes
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [muted, volume, currentTrack]);

  const switchTrack = useCallback((trackKey) => {
    if (trackKey === currentTrack) return;
    const audio = audioRef.current;
    if (!audio) return;

    const targetUrl = TRACKS[trackKey];
    if (!targetUrl) return;

    // Clear any existing fade
    if (fadeInterval.current) clearInterval(fadeInterval.current);

    if (!currentTrack) {
      // First play — just start
      audio.src = targetUrl;
      audio.volume = muted ? 0 : volume;
      audio.play().catch(() => {});
      setCurrentTrack(trackKey);
      return;
    }

    // Crossfade: fade out then switch
    const startVol = audio.volume;
    const steps = FADE_MS / FADE_STEP;
    let step = 0;

    fadeInterval.current = setInterval(() => {
      step++;
      audio.volume = Math.max(0, startVol * (1 - step / steps));

      if (step >= steps) {
        clearInterval(fadeInterval.current);
        fadeInterval.current = null;
        audio.src = targetUrl;
        audio.volume = 0;
        audio.play().catch(() => {});

        // Fade in
        let inStep = 0;
        const targetVol = muted ? 0 : volume;
        fadeInterval.current = setInterval(() => {
          inStep++;
          audio.volume = Math.min(targetVol, targetVol * (inStep / steps));
          if (inStep >= steps) {
            clearInterval(fadeInterval.current);
            fadeInterval.current = null;
          }
        }, FADE_STEP);
      }
    }, FADE_STEP);

    setCurrentTrack(trackKey);
  }, [currentTrack, volume, muted]);

  const playStinger = useCallback(() => {
    const stinger = stingerRef.current;
    if (!stinger || muted) return;
    stinger.currentTime = 0;
    stinger.volume = 0.4;
    stinger.play().catch(() => {});
  }, [muted]);

  const toggleMute = useCallback(() => setMuted(m => !m), []);

  return { switchTrack, playStinger, volume, setVolume, muted, toggleMute, currentTrack };
}
