#!/usr/bin/env node
/**
 * Generates image prompts for all game content.
 * Usage: node scripts/generate_images.js [locations|characters|clues]
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const data = require('../data/palme_game_data_v2.json');
const SCRIPT = path.join(__dirname, '..', '.claude', 'skills', 'gemini-imagegen', 'scripts', 'generate_image.py');
const IMG_DIR = path.join(__dirname, '..', 'client', 'public', 'images');

const BASE_STYLE = 'Stylized cinematic graphic novel illustration, 1986 Stockholm Sweden, Nordic noir atmosphere, cold blue and warm amber tones, bold graphic outlines, saturated colors, dramatic film noir lighting, snow on ground, no logos, no watermarks, no text overlays, no brand names';

// Location-specific prompts
const locationPrompts = {
  murder_scene: 'A snowy street corner at night, Sveavägen 44 and Tunnelgatan. Blood stain on the sidewalk, police tape, yellow streetlights, Dekorima art shop storefront, a couple walking ahead, ominous dark figure lurking behind them',
  tunnelgatan_stairs: 'Dark narrow alley with steep stone stairs going up between old buildings, snow-covered steps, a running figure ascending, dramatic shadows, claustrophobic urban canyon at night',
  david_bagares_gata: 'A quiet dark Stockholm street at night, David Bagares gata, old apartment buildings, a lone figure disappearing into the darkness at the far end, footprints in fresh snow, eerie empty street',
  grand_cinema: 'The facade of a 1980s Swedish cinema called Grand, warm light spilling from the entrance, movie posters on the wall, well-dressed couples exiting after a late show, Art Deco details, neon sign',
  skandia_entrance: 'A large 1930s office building entrance at night, Skandia insurance company, revolving doors, a nervous man in an overcoat exiting, harsh fluorescent light from the lobby contrasting with dark street',
  dekorima_doorway: 'A recessed shop doorway of an art supply store at night, someone hiding in the shadow of the doorframe, broken display of art supplies visible through glass, snow on the doorstep',
  sabbatsberg_hospital: 'A 1980s Swedish hospital emergency entrance at night, ambulance with flashing lights, medical staff rushing, grim fluorescent lighting, a woman in shock being helped inside',
  adolf_fredriks_church: 'A beautiful old Swedish church at night in winter, Adolf Fredriks kyrka, snow on the roof and gravestones, warm light from stained glass windows, a couple crossing the street nearby',
  taxi_position: 'A yellow 1980s Swedish taxi (Volvo 240) parked on a snowy Stockholm street at night, the driver looking out the window, meter glowing, radio crackling, a mysterious passenger getting in',
  polishuset_kungsholmen: 'The imposing Stockholm police headquarters on Kungsholmen, a brutalist 1970s building at night, harsh exterior lighting, police cars parked outside, an atmosphere of institutional power and secrecy',
  petterssons_bostad: 'A rundown 1980s Swedish apartment building in a suburban area, graffiti, broken streetlight, a gaunt man in a worn jacket standing in the doorway smoking, bleak and depressing atmosphere',
  cedergrens_lagenhet: 'A dark cramped apartment interior, a sick man in bed, dim bedside lamp, medicine bottles on the nightstand, shadows on the wall, deathbed confession atmosphere, 1980s Swedish poverty',
  rosenbad: 'The elegant Rosenbad government building in Stockholm at dusk, lit windows, a lone figure walking away from the entrance toward Gamla Stan, briefcase in hand, the weight of power',
  gamla_stan_palmes_bostad: 'A narrow cobblestone street in Gamla Stan (Old Town Stockholm) at night, medieval buildings, warm light from apartment windows, Västerlånggatan 31, a couple leaving through an old wooden door',
  sydafrikanska_sparet: 'A split composition: one half showing apartheid-era South Africa with military figures, the other half showing snowy Stockholm, connected by a red thread, espionage thriller mood',
  adolf_fredriks_kyrkogard: 'A snow-covered cemetery at night, Adolf Fredriks kyrkogård Stockholm, old gravestones, bare trees, flowers and candles left at a memorial, a lone mourning figure, deep melancholy',
  stay_behind_thulehuset: 'A secretive office in a grand Stockholm building, maps on the wall, radio equipment, locked filing cabinets, shadows of men in suits, Cold War espionage atmosphere, hidden room',
  rotebro_narkotikamiljon: 'A bleak 1980s Swedish suburb at night, concrete apartment blocks, a dark parking lot, figures dealing drugs in shadows, a stolen car, needles on the ground, desperate underworld',
  pkk_lokalen: 'A modest community center interior with Kurdish flags and posters, folding chairs, a stressed man being interrogated by Swedish police, overhead fluorescent light, cultural clash',
  telefonkiosken: 'A yellow Televerket phone booth on a Stockholm street corner at night, a man inside making a short urgent call, breath visible in the cold air, snow falling, sinister atmosphere'
};

// Character portrait prompts
const characterPrompts = {
  lisbeth_palme: 'Portrait of a dignified Swedish woman in her 50s, winter coat, pearl earrings, devastated expression, kneeling in snow, blood on her hands, shock and grief, strong face',
  anders_bjorkman: 'Portrait of a Swedish man in his 30s wearing a blue down jacket, hiding in a doorway, wide frightened eyes, witness to horror, snow in his hair',
  inge_morelius: 'Portrait of a Swedish man sitting in a car at night, looking through the windshield with horror, hands gripping the steering wheel, streetlight reflecting off the glass',
  anna_hage: 'Portrait of a young Swedish woman (nursing student) kneeling on a snowy sidewalk performing CPR, blood on her hands, determined face, heroic moment in crisis',
  anders_delsborn: 'Portrait of a young Swedish taxi driver in his cab at night, speaking urgently into his radio microphone, concerned expression, taxi meter glowing',
  leif_ljungqvist: 'Portrait of a Swedish man in a car at a red light at night, desperately trying to make a phone call, frustrated expression, seeing something terrible through the windshield',
  stefan_glantz: 'Portrait of a Swedish plainclothes police officer in 1980s clothing, serious expression, notepad in hand, professional demeanor, standing on a snowy street',
  lars_jeppsson: 'Portrait of a Swedish man running up dark stone stairs at night, looking upward, determined expression, chasing a fleeing figure, winter coat flapping',
  yvonne_nieminen: 'Portrait of a Finnish-Swedish woman at the top of stone stairs at night, startled expression, seeing a man stumble past her, clutching her coat, snow falling',
  ahmed_zahir: 'Portrait of a young Middle Eastern man on a dark Stockholm street at night, surprised expression, witnessing someone run past, winter clothing, 1980s style',
  nicola_fauzzi: 'Portrait of an Italian man walking on a Stockholm street at night, recognition dawning on his face as he passes a couple, 1980s European fashion, scarf and coat',
  stig_engstrom: 'Portrait of a middle-aged Swedish man in an overcoat exiting an office building at night, nervous sweating despite the cold, inconsistent expression, something to hide',
  hans_holmer: 'Portrait of a commanding Swedish police chief at a press conference, holding up a revolver, confident but misguided expression, 1980s suit, microphones in front of him',
  christer_pettersson: 'Portrait of a gaunt weathered Swedish man with hollow cheeks, wild eyes, substance abuse visible in his face, wearing a worn dark jacket, unpredictable aura',
  sigge_cedergren: 'Portrait of a dying Swedish man in a hospital bed, emaciated face, speaking with desperate urgency, dim lighting, shadows on the wall, deathbed scene',
  gosta_soderstrom: 'Portrait of a Swedish police commissioner in uniform arriving at a chaotic crime scene at night, taking command, grim determination, flashing lights behind him',
  henry_olofsson: 'Portrait of a Swedish security guard/doorman in a building lobby at night, concerned expression, talking to someone who just left, fluorescent lighting',
  krister_petersson_aklagare: 'Portrait of a serious Swedish prosecutor in a modern office, surrounded by case files and documents, reading glasses, determined expression, weight of decades of investigation',
  craig_williamson: 'Portrait of a heavy-set South African man in a dark suit, cold calculating eyes, military bearing, apartheid-era intelligence operative, threatening presence',
  eugene_de_kock: 'Portrait of a menacing South African military officer, crew cut, hard face, dark glasses, known as Prime Evil, military uniform with medals, dangerous aura',
  bertil_wedin: 'Portrait of a Swedish man in his 40s with a tan suggesting life abroad, sitting in a cafe, evasive eyes, double life written on his face, intelligence operative look',
  victor_gunnarsson: 'Portrait of a young Swedish right-wing extremist in 1980s clothing, intense ideological eyes, pamphlets visible, arrested and questioned, defiant expression',
  ebbe_carlsson: 'Portrait of a well-dressed Swedish man with political connections, smooth appearance but shifting eyes, amateur detective playing dangerous games, 1980s power suit',
  tommy_lindstrom: 'Portrait of the head of Swedish national criminal police in bed at night, phone to his ear, being told his prime minister is dead, choosing to go back to sleep, guilt',
  claes_djurfeldt: 'Portrait of a Swedish police officer standing alone outside a police van at night on a city street, looking down toward stairs below, knowing expression, cold and dark',
  thomas_piltz: 'Portrait of a Swedish right-wing police officer in plain clothes, hostile expression, arms crossed, standing in a police station hallway, hatred barely concealed',
  anti_avsan: 'Portrait of a Swedish police officer turned politician, complex expression mixing authority and defensiveness, in a formal setting, shadows across his face',
  jan_stocklassa: 'Portrait of a Swedish journalist/researcher surrounded by papers and documents, intense focus, connecting dots on a wall covered with photos and string, investigator',
  stieg_larsson_ghost: 'Portrait of a Swedish journalist with glasses and mustache at a desk covered in papers, cigarette smoke, typewriter, investigating in the night, Stieg Larsson type, spectral quality',
  elisabeth_belich: 'Portrait of a civilian woman finding something small and metallic on a snowy sidewalk, bending down, discovering a bullet, shock on her face, daytime winter scene',
  alfred_tavares: 'Portrait of an Indian journalist on a snowy Stockholm street early morning, searching the ground intently, finding a bullet in the snow, eccentric focused expression',
  marten_palme: 'Portrait of a young Swedish man in his 20s, grief-stricken, standing outside a cinema at night, just learned his father was murdered, devastation',
  willy_glaser: 'Portrait of an older Swedish man, gun collector type, nervous expression, standing in a room with display cases of firearms, one case conspicuously empty',
  fantombildkvinnan: 'Portrait of a Swedish woman artist at a police station, drawing a composite sketch, uncertain expression, the sketch on the table looking like it might be wrong',
  bjorn_rosengren: 'Portrait of a distinguished Swedish union leader in his 50s exiting a cinema, looking back with deep regret, winter coat, the weight of what-if written on his face',
  grand_mannen: 'Portrait of a mysterious man sitting alone in a dark cinema, not watching the screen but scanning the audience, cold analytical eyes, intelligence operative bearing, shadow',
  skandiamannen: 'Portrait of a nervous Swedish office worker in 1980s suit near a crime scene at night, sweating despite cold, looking over his shoulder, knows something he should not',
  kvinna_med_barnvagn: 'Portrait of a Swedish woman pushing a baby stroller on a snowy street at night, wrapped in winter clothes, observing something disturbing ahead, protective of her child',
  ake_rimborn: 'Portrait of a Swedish criminal inspector in a hospital corridor at night, notepad out, listening intently to a traumatized woman, professional compassion, harsh hospital lighting',
  taxichaufforen_soderut: 'Portrait of a Swedish taxi driver at night, looking in his rearview mirror at a nervous sweating passenger in the backseat, suspicious, taxi interior lighting',
  carl_gustav_ostling: 'Portrait of an aggressive Swedish police officer with barely concealed right-wing extremist tendencies, hostile stare, ammunition box visible on a shelf behind him, threatening',
  alvar_lindencrona: 'Portrait of an aristocratic Swedish businessman in his 60s in a wood-paneled office, maps and filing cabinets, Cold War atmosphere, man of secrets, controlled power',
  pg_vinge: 'Portrait of a bitter former Swedish intelligence chief, older man in a study surrounded by memoirs and classified documents, resentful expression, knows buried truths',
  kjell_olof_feldt: 'Portrait of a Swedish finance minister at his desk late at night, phone in hand, the call that changed everything, papers about economic policy scattered, devastated',
  gratande_polismannen: 'Portrait of a Swedish police officer crying at a crime scene at night, tears freezing on his cheeks, kneeling in snow near a blood stain, broken by what he saw, raw emotion',
  lars_inge_svartenbrandt: 'Portrait of a charismatic Swedish criminal in prison clothes, confident smirk, knowing eyes, charming but dangerous, the legendary thief who knows secrets, roguish',
  trettiotre_aringen: 'Portrait of a faceless Swedish man — shown from behind or in heavy shadow, only silhouette visible, 33 years old, average build, could be anyone, the unknown suspect',
  pkk_kontakten: 'Portrait of a Kurdish man in a modest community center, frustrated and dignified expression, being unjustly interrogated, cultural pride despite persecution, 1980s clothing',
  telefonkiosk_vittnet: 'Portrait of a Swedish man outside a yellow phone booth at night, peering at someone inside making a call, curious and frightened expression, snow falling, witness',
  joakim_palme: 'Portrait of a young Swedish man in his 20s at a kitchen table in an old Gamla Stan apartment, family photos on the wall, grief mixed with determination, sons burden'
};

// Clue visual prompts
const cluePrompts = {
  clue_escape_tunnelgatan: 'A dark narrow alley leading to stone stairs, footprints in snow leading away, dramatic lighting from above, escape route',
  clue_top_of_stairs: 'Top of stone stairs at night, a figure stumbling and looking back, snow and ice, city lights beyond, moment of near-capture',
  clue_cinema_origin: 'A cinema ticket stub for Bröderna Mozart, Grand cinema 1986, crumpled, lying on a snowy surface',
  clue_blue_jacket_man: 'A blue down jacket seen from behind, a man walking away in snow, witness or suspect, ambiguous figure',
  clue_dark_coat_hat: 'A dark long overcoat and knitted cap hanging on a hook, sinister, the killers wardrobe, shadowy closet',
  clue_no_hat_conflict: 'Two overlapping witness sketches that contradict each other — one showing a hat, one without, confusion, uncertainty',
  clue_hand_on_shoulder: 'A gloved hand reaching for someones shoulder from behind on a dark snowy street, moment before violence, close-up dramatic',
  clue_killer_waited: 'A dark figure standing motionless at a street corner in snow, watching, patient predator, waiting for prey, cold night',
  clue_professional_killer: 'A .357 Magnum revolver held steadily in a gloved hand, professional grip, close-up, cold precision, noir lighting',
  clue_two_men: 'Two shadowy figures on a dark street at night, one fleeing east, another going south, split paths, mystery of the second man',
  clue_second_person_south: 'A figure running south on a dark Stockholm street while another runs east, split composition, two escape routes',
  clue_taxi_alert: 'A taxi radio microphone with urgent transmission, glowing numbers on the meter, first alarm that reached police, 1980s taxi equipment',
  clue_failed_alarm: 'A rotary telephone with a disconnected line, red light on a switchboard, the failed emergency call, 1980s telecommunications equipment',
  clue_long_barrel: 'Close-up of a long-barreled revolver silhouette against streetlight, distinctive weapon profile seen by witness',
  clue_clutch_bag: 'A small dark clutch bag or pouch being opened while running, something metallic inside, escape scene detail',
  clue_disappeared_east: 'An empty dark street stretching east, David Bagares gata, footprints ending abruptly in snow, the vanishing point',
  clue_not_pettersson: 'A lineup room with men standing against a wall, one man clearly different from the others, flawed identification process',
  clue_hospital_transport: 'An ambulance racing through snowy Stockholm streets at night, urgent red and blue lights reflecting off buildings',
  clue_skandia_worker: 'An employee badge for Skandia Insurance, Sveavägen 44, lying on a desk next to a time clock showing 23:19',
  clue_bjorkman_doorway: 'A man pressed against a shop doorframe, peering around the corner at a crime scene, hiding and witnessing',
  clue_bofors_connection: 'A Bofors howitzer artillery piece overlaid with Swedish kronor bills and a contract document, military-industrial complex',
  clue_walkie_talkies: 'Multiple walkie-talkie radios arranged on a map of Stockholm, antenna up, surveillance operation equipment, 1980s tech',
  clue_military_surveillance: 'Men in dark clothing with communication devices positioned along a Stockholm street, coordinated surveillance operation',
  clue_engstrom_inconsistencies: 'A police interview transcript with red circles around contradictory statements, lies highlighted, paper on desk',
  clue_engstrom_weapon_knowledge: 'A man describing a gun with too much detail, hand gestures showing weapon knowledge, suspicious expertise, interview room',
  clue_engstrom_impossible_knowledge: 'A clock showing 23:19 next to a building exit, and a murder scene 60 meters away at 23:21, impossible timeline diagram',
  clue_crossing_street: 'A couple crossing a wide Stockholm boulevard at night, church visible, moving from one side to the other, fateful decision',
  clue_investigation_failures: 'A mountain of case files with a large red CLASSIFIED stamp, bureaucratic failure, papers scattered and disorganized',
  clue_no_crime_scene_seal: 'A murder scene with flowers and candles placed by civilians, no police tape, contaminated evidence, failure of procedure',
  clue_bullet_chain_of_evidence: 'A bullet in an evidence bag with broken chain of custody stamps, question marks, forensic doubt',
  clue_pettersson_trial: 'A Swedish courtroom, the accused behind glass, jury members divided, dramatic trial moment, 1989 setting',
  clue_lineup_errors: 'A police lineup viewed through one-way glass, one man looking obviously different from the others, rigged identification',
  clue_cedergren_weapon: 'A dying mans hand pointing at something, deathbed confession scene, dim hospital light, accusation from beyond',
  clue_mockfjard_weapon: 'A rusty revolver being pulled from a lake, corroded beyond identification, evidence lost to time and water',
  clue_south_africa_motive: 'South African flag overlaid with a crosshair scope view of a Swedish flag, international assassination motive',
  clue_operation_long_reach: 'A world map with red lines connecting Pretoria South Africa to Stockholm Sweden, covert operation routes',
  clue_no_bodyguards: 'An empty security booth at a government building, abandoned post, keys left behind, the PM walks alone',
  clue_sapo_operation: 'A SÄPO surveillance van parked on a dark street, antenna on roof, operation in progress, what were they doing that night',
  clue_walkie_surveillance_route: 'A map of central Stockholm with dots marking walkie-talkie sightings along a route from Gamla Stan to Sveavägen',
  clue_stay_behind: 'A hidden weapons cache in a basement — handguns, radio equipment, fake passports, Cold War secret network',
  clue_pkk_trail: 'Kurdish PKK flag crossed out with a red X, dead end investigation, wrong trail, wasted resources',
  clue_ebbe_carlsson_affair: 'A well-dressed amateur detective with a fake police badge, briefcase full of documents, playing spy, dangerous dilettante',
  clue_bofors_deep: 'Stacks of money flowing through Swiss bank account documents, Bofors logo, corruption trail, international arms deal',
  clue_police_trail: 'Police badges arranged in a circle around a bullet, the Basebolligan, corrupt officers, institutional rot',
  clue_phantom_sketch: 'A police composite sketch that looks wrong, artists doubt visible, false lead that sent investigation astray for months',
  clue_engstrom_death: 'A newspaper headline about a suicide, a mans shadow on a wall, secrets taken to the grave, 2000',
  clue_2020_conclusion: 'A press conference podium with microphones, a prosecutors final statement, Engström named, 2020, unsatisfying conclusion',
  clue_134_confessions: 'Multiple speech bubbles with I did it in different styles, 134 false confessions, attention seekers and liars',
  clue_aftermath_funeral: 'A massive funeral procession through Stockholm streets, thousands of people with candles, national mourning, aerial view',
  clue_palme_hatred: 'Hate mail and threatening letters spread on a desk, anti-Palme graffiti, the vitriol aimed at the PM, 1980s Sweden dark side',
  clue_gh_suspect_weapon: 'A door with a bullet hole, police outside, the suspect who shot himself when they came to test his gun, dramatic standoff',
  clue_rosengrens_erbjudande: 'A car with door open in front of a cinema, an offered ride refused, a moment that could have changed everything, what-if',
  clue_8_unidentified_cinema: 'Eight empty cinema seats in a row with question marks above them, the unknown audience members, who were they',
  clue_grand_man_surveillance: 'A man in a cinema watching the audience instead of the screen, face in shadow, surveillance from within, sinister',
  clue_bio_decision_paradox: 'A rotary telephone with wiretap device attached, someone listening in on family dinner plans, surveillance reveals the plan',
  clue_skandia_multiple: 'Multiple office workers exiting the same building near a crime scene, coincidence or coordination, Skandia building at night',
  clue_skandia_wallenberg: 'An organizational chart showing connections between Skandia, Wallenberg family, Nobel Industries, and Bofors, power web',
  clue_lisbeth_two_men: 'A womans perspective looking up from the ground seeing two male silhouettes, not one — TWO men at the scene, crucial witness detail',
  clue_crime_scene_11_hours: 'A clock showing 10:00 next to a contaminated crime scene with flowers and footprints, 11 hours of negligence, daylight revealing failure',
  clue_163_minutes_alarm: 'A police dispatch console with a clock showing 02:05, urgent lights blinking, 163 minutes too late, systemic failure',
  clue_ostling_taxi_south: 'A taxi receipt and a police sick leave form side by side, both dated February 28 1986, damning coincidence',
  clue_ostling_ammo_match: 'Winchester-Western ammunition boxes, metal-piercing rounds laid out, police evidence tag, identical to murder ammunition',
  clue_djurfeldt_above_escape: 'A police van parked on a street above stone stairs, an officer standing alone looking down, directly above the escape route',
  clue_metal_piercing_police: 'Metal-piercing bullets in a police-issue ammunition case, stamped ONLY FOR LAW ENFORCEMENT, the killers choice of ammo',
  clue_738_weapons_none: 'Rows upon rows of revolvers in an evidence room, all tagged and tested, 738 weapons and zero matches, the missing gun',
  clue_pg_vinge_dismissal: 'A SÄPO office with a name plate being removed from a door, institutional humiliation, a fired intelligence chief',
  clue_sapo_file_missing: 'An empty filing cabinet drawer labeled PALME, dust marks where a thick file once sat, disappeared evidence',
  clue_cosi_fan_tutte_mozart: 'A Mozart opera poster for Così fan tutte next to a cinema poster for Bröderna Mozart, eerie parallel, same night, coincidence',
  clue_gladio_weapons: 'A NATO map of Europe with secret symbols marking stay-behind networks in each country, classified Cold War document',
  clue_ib_affair: 'Secret dossiers with Swedish names being handed from a Swedish military officer to a CIA agent, IB betrayal, classified exchange',
  clue_svartenbrandt_hints: 'A charismatic criminal behind bars, finger to his lips in a shushing gesture, knowing smile, he knows but wont tell',
  clue_sucksdorff_stolen_weapon: 'An empty gun case in a filmmakers study, nature documentary awards on the shelf, a theft that may have armed a killer',
  clue_33_aringen_signalement: 'A police sketch of a man with no distinguishing features — average in every way — with a large question mark overlay, the 33-year-old',
  clue_ted_gardestad_tragedy: 'A broken guitar and a fallen Swedish pop star poster, railway tracks in the background, the innocent victim of false accusations',
  clue_pkk_holmer_obsession: 'A wall covered in Kurdish-related surveillance photos and documents, red strings connecting nothing, a futile obsession, dead end',
  clue_phone_booth_after_shots: 'A hand lifting a yellow phone receiver in a Televerket booth at night, brief urgent call, mission accomplished signal',
  clue_barnvagn_witness: 'A baby stroller on a snowy Stockholm sidewalk at 11 PM, incongruous and eerie, what was she doing there, surveillance cover',
  clue_akerbring_champagne: 'Champagne glasses clinking in a Swedish apartment, a police badge on the table, celebrating murder, obscene joy, dark contrast',
  clue_svartenbrandt_connection: 'A web of connections drawn on a prison cell wall — names, arrows, question marks — the criminal network that links suspects',
  clue_palme_last_meetings: 'A desk calendar showing February 28 1986 with meeting notes — Iraq ambassador, Norway ambassador, finance call — the last workday',
  clue_163_minutes_alarm_dup: null // skip duplicate
};

const category = process.argv[2];
if (!['locations', 'characters', 'clues'].includes(category)) {
  console.log('Usage: node scripts/generate_images.js [locations|characters|clues]');
  process.exit(1);
}

function generateImage(prompt, outputPath) {
  if (fs.existsSync(outputPath)) {
    console.log(`  SKIP (exists): ${path.basename(outputPath)}`);
    return true;
  }
  const fullPrompt = `${BASE_STYLE}. ${prompt}`;
  try {
    execSync(`python3 "${SCRIPT}" --prompt "${fullPrompt.replace(/"/g, '\\"')}" --output "${outputPath}"`, {
      timeout: 120000,
      stdio: 'pipe'
    });
    console.log(`  OK: ${path.basename(outputPath)}`);
    return true;
  } catch (e) {
    console.log(`  FAIL: ${path.basename(outputPath)} — ${e.message.substring(0, 100)}`);
    return false;
  }
}

let items;
let dir;

if (category === 'locations') {
  dir = path.join(IMG_DIR, 'locations');
  fs.mkdirSync(dir, { recursive: true });
  items = Object.keys(data.locations).map(id => ({
    id,
    prompt: locationPrompts[id] || `A ${data.locations[id].name} scene, ${data.locations[id].description}`,
    output: path.join(dir, `${id}.png`)
  }));
} else if (category === 'characters') {
  dir = path.join(IMG_DIR, 'characters');
  fs.mkdirSync(dir, { recursive: true });
  items = Object.keys(data.characters).map(id => ({
    id,
    prompt: characterPrompts[id] || `Portrait of ${data.characters[id].name}, ${data.characters[id].role}, dramatic lighting, 1986`,
    output: path.join(dir, `${id}.png`)
  }));
} else {
  dir = path.join(IMG_DIR, 'clues');
  fs.mkdirSync(dir, { recursive: true });
  items = Object.keys(data.clues).filter(id => id !== 'clue_163_minutes_alarm_dup').map(id => ({
    id,
    prompt: cluePrompts[id] || `Visual representation of: ${data.clues[id].title} — ${data.clues[id].description.substring(0, 150)}`,
    output: path.join(dir, `${id}.png`)
  }));
}

console.log(`\nGenerating ${items.length} ${category} images...\n`);

let ok = 0, fail = 0;
for (const item of items) {
  const result = generateImage(item.prompt, item.output);
  if (result) ok++; else fail++;
}

console.log(`\nDone: ${ok} ok, ${fail} failed out of ${items.length}`);
