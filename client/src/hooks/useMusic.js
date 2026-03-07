import { useEffect, useRef, useState, useCallback } from 'react';

const B = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

const TRACKS = {
  intro: B + '/music/SVEAVÄGEN — Huvudtema.mp3',
  map: B + '/music/NATTLIG KARTA — Kartvyn _ Utforskning.mp3',
  mordplatsen: B + '/music/MORDPLATSEN — Sveavägen kl 23_21.mp3',
  chat: B + '/music/VITTNESMÅL — Samtalstema.mp3',
  board: B + '/music/UTREDNINGSTAVLAN — Detektiven kl 03_00.mp3',
  engstrom: B + '/music/ENGSTRÖM-TEMAT — Obehaget.mp3',
  sydafrika: B + '/music/SYDAFRIKASPÅRET — Internationell konspiration.mp3',
  polis: B + '/music/POLISSPÅRET — Paranoia.mp3',
  epilog: B + '/music/EPILOG — Olöst.mp3',
  kyrka: B + '/music/ADOLF FREDRIKS KYRKA — Sorgens eko.mp3',
  kyrkogard: B + '/music/ADOLF FREDRIKS KYRKOGÅRD — Palmes grav.mp3',
  cedergren: B + '/music/CEDERGRENS LÄGENHET — Sigges hemlighet.mp3',
  david_bagare: B + '/music/DAVID BAGARES GATA — Skuggorna.mp3',
  dekorima: B + '/music/DEKORIMAS DÖRRÖPPNING — Ögonblicket.mp3',
  palmes_bostad: B + '/music/PALMES BOSTAD — Västerlånggatan.mp3',
  grand: B + '/music/BIOGRAFEN GRAND — Sista filmen.mp3',
  pkk: B + '/music/PKK-LOKALEN — Holmérs spår.mp3',
  rosenbad: B + '/music/ROSENBAD — Makten.mp3',
  sabbatsberg: B + '/music/SABBATSBERGS SJUKHUS — Sista andetaget.mp3',
  skandia: B + '/music/SKANDIAS ENTRÉ — Väntan.mp3',
  stay_behind: B + '/music/STAY BEHIND — Thulehuset.mp3',
  taxi: B + '/music/TAXINS POSITION — Väntan vid ratten.mp3',
  telefonkiosk: B + '/music/TELEFONKIOSKEN — Samtalet.mp3',
  tunnelgatan: B + '/music/TUNNELGATAN — Flykten.mp3',
};

const STINGER = B + '/music/LEDTRÅD — Stinger.mp3';
const FADE_MS = 1500;
const FADE_STEP = 50;

// Location IDs that map to tracks (for both location view and chat)
const LOCATION_TRACKS = {
  murder_scene: 'mordplatsen',
  dekorima_doorway: 'dekorima',
  skandia_entrance: 'skandia',
  taxi_position: 'taxi',
  telefonkiosken: 'telefonkiosk',
  tunnelgatan_stairs: 'tunnelgatan',
  adolf_fredriks_church: 'kyrka',
  adolf_fredriks_kyrkogard: 'kyrkogard',
  cedergrens_lagenhet: 'cedergren',
  david_bagares_gata: 'david_bagare',
  gamla_stan_palmes_bostad: 'palmes_bostad',
  grand_cinema: 'grand',
  petterssons_bostad: 'engstrom',
  rotebro_narkotikamiljon: 'engstrom',
  pkk_lokalen: 'pkk',
  polishuset_kungsholmen: 'polis',
  rosenbad: 'rosenbad',
  sabbatsberg_hospital: 'sabbatsberg',
  stay_behind_thulehuset: 'stay_behind',
  sydafrikanska_sparet: 'sydafrika',
};

export function resolveTrack(view, locationId) {
  if (view === 'intro') return 'intro';
  if (view === 'board') return 'board';
  if (view === 'chat' || view === 'location' || view === 'map') {
    if (locationId && LOCATION_TRACKS[locationId]) {
      return LOCATION_TRACKS[locationId];
    }
    return view === 'chat' ? 'chat' : 'map';
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
