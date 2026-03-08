import { useEffect, useRef, useState, useCallback } from 'react';

const B = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

const TRACKS = {
  // Global tracks (views)
  intro: B + '/music/DEALEY PLAZA — Main Theme (1).mp3',
  map: B + '/music/NIGHT MAP — Exploration Theme (1).mp3',
  chat: B + '/music/WITNESS TESTIMONY — Conversation Theme.mp3',
  board: B + '/music/INVESTIGATION BOARD — Detective at 3 AM.mp3',
  epilog: B + '/music/EPILOGUE — Unresolved.mp3',
  // Per-location tracks
  loc_dealey_plaza: B + '/music/DEALEY PLAZA — The Motorcade.mp3',
  loc_tsbd: B + '/music/THE SIXTH FLOOR — Sniper\'s Nest.mp3',
  loc_grassy_knoll: B + '/music/THE GRASSY KNOLL — Behind the Fence.mp3',
  loc_triple_underpass: B + '/music/TRIPLE UNDERPASS — What the Workers Saw.mp3',
  loc_railroad_tower: B + "/music/THE TOWER — Bowers' Watch.mp3",
  loc_parkland_hospital: B + '/music/PARKLAND — Trauma Room One.mp3',
  loc_rooming_house: B + '/music/1026 NORTH BECKLEY — The Rooming House.mp3',
  loc_tippit_scene: B + '/music/TENTH AND PATTON — The Second Killing.mp3',
  loc_texas_theatre: B + '/music/TEXAS THEATRE — The Arrest.mp3',
  loc_dallas_police_hq: B + '/music/DALLAS POLICE HQ — The Interrogation.mp3',
  loc_carousel_club: B + "/music/THE CAROUSEL CLUB — Ruby's Joint.mp3",
  loc_western_union: B + '/music/WESTERN UNION — Four Minutes.mp3',
  loc_camp_street_544: B + '/music/544 CAMP STREET — The Nexus.mp3',
  loc_mexico_city_embassies: B + '/music/MEXICO CITY — The Imposter.mp3',
  loc_bethesda_naval: B + '/music/BETHESDA — The Autopsy.mp3',
  loc_love_field: B + '/music/LOVE FIELD — The Oath.mp3',
  loc_hotel_texas: B + '/music/HOTEL TEXAS — Last Morning.mp3',
  loc_trade_mart: B + '/music/TRADE MART — The Empty Podium.mp3',
  loc_irving_paine_house: B + '/music/IRVING — The Paine House.mp3',
  loc_ruby_apartment: B + "/music/RUBY'S APARTMENT — The Dog Man.mp3",
  loc_oak_cliff_tenth_patton: B + '/music/WITNESS ROW — The Neighbors Saw.mp3',
  loc_dal_tex_building: B + '/music/DAL-TEX — The Other Building.mp3',
  loc_garrison_office: B + "/music/GARRISON'S OFFICE — The Only Trial.mp3",
  loc_camp_street_office: B + "/music/BANISTER'S OFFICE — The Spider's Web.mp3",
  loc_marcello_estate: B + "/music/CHURCHILL FARMS — The Godfather's Swamp.mp3",
  loc_odio_apartment: B + "/music/ODIO'S APARTMENT — Strangers at the Door.mp3",
  loc_dealey_plaza_periphery: B + '/music/ELM STREET — The Suppressed Witnesses.mp3',
  loc_secret_service_detail: B + '/music/SS-100-X — The Death Car.mp3',
  loc_midnight_press_conf: B + '/music/MIDNIGHT PRESS — The Narrative Forms.mp3',
};

const STINGER = B + '/music/CLUE DISCOVERED — Stinger.mp3';
const FADE_MS = 1500;
const FADE_STEP = 50;

const LOCATION_TRACKS = {
  dealey_plaza: 'loc_dealey_plaza',
  tsbd: 'loc_tsbd',
  grassy_knoll: 'loc_grassy_knoll',
  triple_underpass: 'loc_triple_underpass',
  railroad_tower: 'loc_railroad_tower',
  parkland_hospital: 'loc_parkland_hospital',
  rooming_house: 'loc_rooming_house',
  tippit_scene: 'loc_tippit_scene',
  texas_theatre: 'loc_texas_theatre',
  dallas_police_hq: 'loc_dallas_police_hq',
  carousel_club: 'loc_carousel_club',
  western_union: 'loc_western_union',
  camp_street_544: 'loc_camp_street_544',
  mexico_city_embassies: 'loc_mexico_city_embassies',
  bethesda_naval: 'loc_bethesda_naval',
  love_field: 'loc_love_field',
  hotel_texas: 'loc_hotel_texas',
  trade_mart: 'loc_trade_mart',
  irving_paine_house: 'loc_irving_paine_house',
  ruby_apartment: 'loc_ruby_apartment',
  oak_cliff_tenth_patton: 'loc_oak_cliff_tenth_patton',
  dal_tex_building: 'loc_dal_tex_building',
  garrison_office: 'loc_garrison_office',
  camp_street_office: 'loc_camp_street_office',
  marcello_estate: 'loc_marcello_estate',
  odio_apartment: 'loc_odio_apartment',
  dealey_plaza_periphery: 'loc_dealey_plaza_periphery',
  secret_service_detail: 'loc_secret_service_detail',
  midnight_press_conf: 'loc_midnight_press_conf',
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
