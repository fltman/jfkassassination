#!/usr/bin/env node
/**
 * Generates image prompts for all game content (JFK assassination).
 * Usage: node scripts/generate_images.js [locations|characters|clues]
 *
 * Style: GTA V loading screen art — bold cel-shaded illustration,
 * high contrast, saturated colors, stylized realism.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const data = require('../data/jfk_game_data.json');
const SCRIPT = path.join(__dirname, '..', '.claude', 'skills', 'gemini-imagegen', 'scripts', 'generate_image.py');
const IMG_DIR = path.join(__dirname, '..', 'client', 'public', 'images');

const BASE_STYLE = 'GTA V loading screen art style, bold cel-shaded illustration, high contrast saturated colors, stylized realism with graphic novel outlines, dramatic lighting, 1963 Dallas Texas, warm Southern sun tones mixed with noir shadows, no logos, no watermarks, no text overlays, no brand names, no words';

// ── LOCATION PROMPTS ────────────────────────────────────────────

const locationPrompts = {
  dealey_plaza: 'Dealey Plaza in Dallas Texas 1963, wide view of Elm Street with the triple underpass ahead, grassy knoll to the right, Texas School Book Depository behind, people running in panic, a black Lincoln Continental limousine speeding away, dramatic noon sunlight casting harsh shadows',
  tsbd: 'A seven-story red brick warehouse building in 1960s Dallas, Texas School Book Depository, police cars surrounding the entrance, officers rushing in, an ominous sixth-floor corner window with boxes visible, harsh midday Texas sun',
  grassy_knoll: 'A grassy hillside with a wooden stockade fence at the top, parking lot behind, trees providing cover, witnesses pointing and running toward the fence, smoke wisps, Dallas 1963 autumn, dramatic perspective looking up the slope',
  triple_underpass: 'A concrete railroad overpass bridge spanning a wide Dallas street, railroad workers looking down from the bridge in shock, 1960s cars below, harsh shadows under the bridge contrasting with bright Texas sunlight',
  railroad_tower: 'A small elevated railroad switching tower, industrial structure with large windows on all sides, a man inside looking out at a parking lot and wooden fence below, railroad tracks, telegraph poles, 1960s industrial Dallas',
  parkland_hospital: 'A 1960s hospital emergency entrance with a black presidential limousine parked at the door, Secret Service agents and nurses rushing, blood on the back seat, red emergency lights, harsh fluorescent hospital glow mixing with Texas daylight',
  rooming_house: 'A modest 1960s boarding house in a working-class Dallas neighborhood, Oak Cliff area, clapboard siding, a small porch, a lone figure walking quickly away carrying something under a jacket, a police car slowly passing, suburban tension',
  tippit_scene: 'A quiet 1960s Dallas residential street intersection, a police patrol car stopped with the driver door open, an officer lying on the pavement, shell casings scattered, a figure walking away reloading a revolver, suburban horror',
  texas_theatre: 'A classic 1960s movie theater facade with marquee and ticket booth, vintage neon signage, police cars screeching to a halt outside, officers rushing to the entrance, a man being dragged out in handcuffs fighting back, dramatic afternoon light',
  dallas_police_hq: 'A 1960s municipal building exterior, Dallas Police headquarters, chaotic scene with press photographers, reporters with bulky cameras, police officers, bright flashbulbs, a suspect being led through a crowd, institutional brutalism',
  carousel_club: 'A seedy 1960s nightclub exterior on a Dallas street, neon strip club sign, a stocky man in a fedora standing in the doorway, vintage cars parked outside, dark atmosphere despite daytime, underworld sleaze mixed with power',
  western_union: 'A 1960s Western Union telegraph office interior, a man at the counter filling out a money transfer form, a clock on the wall showing 11:17, the counter clerk processing the transaction, mundane routine before murder',
  camp_street_544: 'A nondescript office building in 1960s New Orleans, peeling paint, multiple business signs, a man handing out leaflets on the sidewalk, intelligence operatives watching from across the street, humid Southern Gothic atmosphere',
  mexico_city_embassies: 'A Soviet embassy building in 1960s Mexico City, imposing concrete architecture, a lone American man approaching the entrance, surveillance cameras, a mysterious figure photographed from across the street who looks different than expected',
  bethesda_naval: 'A sterile military hospital autopsy room at night, harsh overhead surgical lights, uniformed military officers standing around a table giving orders to confused doctors, an atmosphere of cover-up and control, 1960s military institution',
  love_field: 'Air Force One on a tarmac at a 1960s airport, Dallas Love Field, a man taking an oath of office in the crowded cabin, a woman in a blood-stained pink suit standing beside him, grief and power transfer, harsh afternoon light through airplane windows',
  // Expansion locations
  hotel_texas: 'A grand 1960s Texas hotel exterior, Hotel Texas in Fort Worth, morning sunlight, a presidential podium set up outside, crowds gathering, a man looking out an upper window, American flags, the last morning',
  trade_mart: 'A large 1960s convention center interior, Dallas Trade Mart, tables set for a luncheon that will never happen, waiters frozen listening to transistor radios, empty podium with presidential seal, food going cold',
  irving_paine_house: 'A modest 1960s ranch-style suburban house in Irving Texas, a detached garage with the door ajar, a woman with two small children in the yard, autumn afternoon, an empty blanket on the garage floor, suburban unease',
  ruby_apartment: 'A small messy 1960s apartment interior, newspaper clippings about the assassination scattered everywhere, an empty revolver box on the table, a phone with a coiled cord, a dachshund waiting by the door, seedy bachelor pad',
  oak_cliff_tenth_patton: 'A quiet 1960s Dallas residential intersection, 10th and Patton, Oak Cliff neighborhood, multiple witnesses on porches pointing in different directions, shell casings on the sidewalk, conflicting stories',
  dal_tex_building: 'A multi-story 1960s office building across from Dealey Plaza, the Dal-Tex Building, upper floor windows with clear sightline to Elm Street, a man in horn-rimmed glasses visible in an upper window, alternative sniper position',
  garrison_office: 'A cluttered 1960s district attorneys office in New Orleans, a man in shirtsleeves surrounded by case files, photos pinned to a wall with red string connections, conspiracy board, fighting the establishment alone',
  camp_street_office: 'A cramped 1960s office with anti-Castro propaganda on the walls, CIA maps of Cuba, a filing cabinet with intelligence files, a man in a white shirt with a shoulder holster, New Orleans heat, Southern Gothic spy den',
  marcello_estate: 'A sprawling Louisiana estate at dusk, Churchill Farms, Spanish moss hanging from oaks, a heavyset man in an expensive suit on the porch, bodyguards in the shadows, Southern mob kingpin territory, wealth and menace',
  odio_apartment: 'A 1960s apartment doorway at night, three men standing at the door — two Cuban men flanking a thin American, a young Cuban woman looking frightened through the chain lock, sinister late-night visit',
  dealey_plaza_periphery: 'The edges of Dealey Plaza from unusual angles — a deaf man on an overpass watching in horror, a woman pointing at a truck on the grassy knoll, an umbrella being pumped, suppressed witnesses on the margins',
  secret_service_detail: 'Interior of a 1960s presidential limousine, blood on the back seat, a driver turning to look back instead of accelerating, a windshield with a suspicious crack, the crime scene that was cleaned too fast',
  midnight_press_conf: 'A chaotic 1960s police station press room at midnight, dozens of reporters with bulky cameras, flashbulbs firing, a handcuffed suspect being paraded, a nightclub owner in the crowd who shouldnt be there',
};

// ── CHARACTER PORTRAIT PROMPTS ──────────────────────────────────

const characterPrompts = {
  zapruder: 'Portrait of a middle-aged Jewish-American man in 1960s business attire, holding an 8mm home movie camera to his eye, standing on a concrete pedestal, expression of frozen horror as he films, Dallas businessman, tears streaming',
  brennan: 'Portrait of a weathered construction worker in a hard hat sitting on a low wall, looking upward at a building, hand shielding his eyes from the sun, tough working-class face with fear in his eyes, 1960s work clothes',
  jean_hill: 'Portrait of a 1960s Southern schoolteacher in a red raincoat, standing close to a street, pointing urgently toward a wooden fence on a grassy hill, determined expression, brunette hair, refusing to be silenced',
  holland: 'Portrait of a middle-aged railroad supervisor in work clothes and railroad cap, standing on a concrete overpass bridge, pointing toward a stockade fence, authoritative expression, reliable witness, 1960s working man',
  tague: 'Portrait of a young 1960s American man in a casual suit, slight cut on his cheek from a bullet fragment, confused and scared expression, standing near a concrete curb, car salesman type, accidental witness',
  moorman: 'Portrait of a 1960s American woman holding a Polaroid camera at hip level, just taken a photo, expression of shock, casual autumn clothing, standing at the edge of a road, historic moment captured',
  newman: 'Portrait of a young father throwing himself over his wife and children on the ground, protective posture, terror on his face, 1960s casual clothing, lying flat on grass, the closest civilian witness',
  baker: 'Portrait of a Dallas motorcycle police officer in 1960s uniform, revolver drawn, running into a building, determined and urgent expression, leather jacket, motorcycle helmet pushed back, action hero energy',
  truly: 'Portrait of a middle-aged Southern businessman in a 1960s suit, building superintendent type, running alongside a police officer, concerned and cooperative expression, keys in hand, leading the way upstairs',
  frazier: 'Portrait of a young man in his late teens in 1960s work clothes, standing next to a 1950s car, looking nervous and uncertain, holding onto a paper bag, working-class kid caught up in history, early morning light',
  bowers: 'Portrait of a railroad worker in an elevated tower cabin, looking through large windows with a shocked expression, radio equipment around him, seeing something that will haunt him, isolated witness, 1960s work uniform',
  perry: 'Portrait of a young surgeon in 1960s hospital scrubs and white coat, blood on his hands and surgical gown, exhausted and devastated expression, just performed emergency surgery, stethoscope around neck, pressed to change his story',
  mcclelland: 'Portrait of a surgeon in 1960s hospital attire, standing in an operating room, holding his hands up demonstrating the size of a wound on the back of a head, grave expression, telling the truth others want buried',
  tomlinson: 'Portrait of a hospital maintenance worker in a 1960s uniform, pushing a stretcher in a hospital corridor, bending down to pick up something small and metallic from under the stretcher pad, confused expression',
  landis: 'Portrait of a young Secret Service agent in a 1960s dark suit and sunglasses, standing on the rear of a moving car, anguished expression, blood on his suit, finding a bullet on a car seat, traumatized protector who failed',
  roberts: 'Portrait of an elderly Southern housekeeper woman in a housedress and apron, standing at the window of a boarding house, peering through curtains at a police car outside, suspicious and observant, 1960s domestic interior',
  markham: 'Portrait of a middle-aged waitress in a 1960s uniform, standing at a street corner screaming, pointing at a man walking away, absolute terror on her face, clutching her purse, working-class witness to murder',
  brewer: 'Portrait of a young man in 1960s retail clothing standing in the doorway of a shoe store, watching a suspicious man duck into a movie theater, alert expression, pointing for police, brave civilian, afternoon sun',
  oswald: 'Portrait of a thin young man with a bruised face being led through a hallway by police officers, handcuffed, defiant expression claiming innocence, surrounded by camera flashbulbs, 1960s Dallas police station chaos',
  fritz: 'Portrait of a weathered Texas lawman in a cowboy hat and 1960s suit, sitting behind a desk in a cramped office, interrogating someone, no tape recorder visible, tough but procedurally careless, old-school detective',
  ruby: 'Portrait of a stocky man in a 1960s fedora and dark suit, pushing through a crowd of reporters, one hand reaching into his jacket for a concealed revolver, determined and manic expression, nightclub owner turned assassin',
  carlin: 'Portrait of a young woman in 1960s cocktail waitress/dancer attire, on a pay phone looking scared, smeared mascara from crying, a seedy nightclub in the background, pawn in a larger game, vulnerability mixed with street smarts',
  // Expansion characters
  jackie_kennedy: 'Portrait of an elegant woman in a blood-stained pink Chanel suit and pillbox hat, dignified despite horror, crawling on the trunk of a limousine reaching for something, the most famous widow in history, grief and grace',
  nellie_connally: 'Portrait of a well-dressed 1960s Southern woman in the back of a convertible, turning to speak to someone behind her, warmth in her smile turning to terror, pulling her wounded husband into her lap',
  jesse_curry: 'Portrait of a stern Dallas police chief in 1960s uniform and hat, standing by police cars, barking orders into a radio, the weight of an impossible situation, institutional authority failing in real time',
  marina_oswald: 'Portrait of a young Russian woman with dark hair and worried eyes, holding a baby, standing in a modest suburban kitchen, frightened and confused, immigrant caught in a nightmare, 1960s housewife clothes',
  ruth_paine: 'Portrait of a Quaker schoolteacher in modest 1960s clothing, standing in a garage doorway looking at an empty blanket on the floor, helpful neighbor whose kindness may have enabled tragedy, moral complexity',
  acquilla_clemmons: 'Portrait of an African-American woman in 1960s domestic workers clothing, standing on a porch looking frightened, a man with a gun warned her to stay silent, truth suppressed by intimidation',
  roger_craig: 'Portrait of a young 1960s deputy sheriff in uniform, pointing urgently at a station wagon driving away, honest face marked by what his testimony will cost him, doomed whistleblower',
  ed_hoffman: 'Portrait of a deaf man on a highway overpass, gesturing frantically but unable to speak, pointing at a fence where he saw a gunman, frustration and helplessness, the witness who could not be heard',
  julia_ann_mercer: 'Portrait of a young woman in a 1960s car, stuck in traffic, staring at a man pulling a rifle case from a pickup truck, recognition dawning, the witness whose FBI statement was altered',
  umbrella_man: 'Portrait of a man in a suit holding an open black umbrella on a sunny day, pumping it up and down, bizarre and sinister, standing at the exact spot where bullets hit, was it a signal',
  roy_kellerman: 'Portrait of a Secret Service agent in the front passenger seat of a limousine, turning to look back in horror, suit and tie, earpiece, failing to protect, the longest car ride in American history',
  william_greer: 'Portrait of a Secret Service driver turning to look over his right shoulder instead of driving, hands partially off the wheel, the fatal hesitation, uniform and cap, guilt frozen in time',
  henry_wade: 'Portrait of a heavy-set 1960s Texas district attorney at a press podium with microphones, sweating under lights, being corrected by someone in the crowd, good-old-boy law enforcement, midnight chaos',
  sylvia_odio: 'Portrait of a young Cuban-American woman looking through a door chain at three men standing outside her apartment at night, two Cubans and a thin American, fear and recognition, Dallas 1963',
  david_ferrie: 'Portrait of a bizarre-looking man with painted-on eyebrows and a cheap red wig, 1960s clothing, feverish eyes, CIA pilot and mob associate, driving through a thunderstorm at night, grotesque and tragic',
  guy_banister: 'Portrait of a former FBI agent turned private detective in a 1960s New Orleans office, shoulder holster visible, anti-Castro posters on the wall, tough Southern lawman running covert ops, sweating in the heat',
  carlos_marcello: 'Portrait of a heavyset Sicilian-American mob boss in an expensive 1960s suit, sitting in a ornate Louisiana dining room, cold calculating eyes, the most powerful don nobody knew, quiet menace',
  jim_garrison: 'Portrait of a tall imposing 1960s district attorney in New Orleans, standing before a conspiracy board with photos and red string, determined expression, fighting alone against the establishment, crusading prosecutor',
  richard_carr: 'Portrait of a steelworker in hard hat and work clothes, looking up at a building window where he sees a man who shouldnt be there, pointing, the witness the FBI didnt want to hear from',
  marguerite_oswald: 'Portrait of an older Southern woman in 1960s clothing, clutching family photos and documents, insisting her son was a government agent, maternal grief mixed with conspiracy certainty, tireless advocate',
  abraham_bolden: 'Portrait of an African-American Secret Service agent in a 1960s suit, the first Black agent on the presidential detail, holding classified documents about a Chicago assassination plot, silenced for knowing too much',
};

// ── CLUE VISUAL PROMPTS ─────────────────────────────────────────

const cluePrompts = {
  clue_motorcade_parkland: 'A black 1961 Lincoln Continental racing at high speed through Dallas streets, Secret Service agent climbing onto the trunk, blood visible in the back seat, motorcycle escort, urgent motion blur, noon sun',
  clue_headsnap: 'A dramatic slow-motion composition showing two opposing directional arrows on a head silhouette — one forward, one violently back and to the left — physics of impact, forensic diagram meets art',
  clue_three_shots: 'Three rifle shell casings arranged on a cardboard box near a window, with sound wave graphics showing echoes bouncing between buildings in Dealey Plaza, acoustic mystery',
  clue_brennan_window: 'View looking up at the sixth-floor corner window of a red brick building, a rifle barrel barely visible, boxes stacked as a barricade, stark contrast between bright Texas sky and dark window interior',
  clue_brennan_fear: 'A man sitting in a police lineup viewing room, refusing to point at anyone, fear in his eyes, hand trembling, this is bigger than one man expression, institutional intimidation',
  clue_hill_smoke: 'A puff of white smoke rising from behind a wooden stockade fence on a grassy hill, sunlight catching the smoke, witnesses pointing, dramatic moment of conspiracy evidence',
  clue_hill_multiple_shots: 'Split-panel composition showing sound waves coming from two different directions — a building and a grassy knoll — converging on a street, crossfire concept, more than three shots',
  clue_hill_running_man: 'A man in a suit running away from behind a wooden fence, badge flash suggesting Secret Service, but no agents were there, impostor fleeing the scene, suspicious urgency',
  clue_holland_smoke: 'White gunsmoke floating 6-8 feet above the ground behind a wooden fence, precisely measured height markers, a railroad workers view from above on an overpass, forensic precision',
  clue_holland_fence: 'Fresh footprints in mud behind a stockade fence, cigarette butts ground into the dirt, someone was standing here waiting, evidence of a hidden position, crime scene detail',
  clue_holland_fake_ss: 'A man behind a fence flashing a badge, but the badge looks wrong — fake Secret Service credentials, no real agents were posted there, impostor exposed, deception caught in the act',
  clue_tague_curb: 'A concrete curb with a fresh bullet impact gouge, a chip of concrete missing, small blood drops from a wound, physical proof of a missed shot, forensic close-up, evidence marker',
  clue_tague_math: 'An evidence board with shell casings numbered 1-2-3 but bullet impacts numbered 1-2-3-4, the arithmetic doesnt add up, one too many impacts for three shots, mathematical impossibility',
  clue_moorman_photo: 'A vintage Polaroid photograph showing a black limousine with a grassy knoll and stockade fence in the background, shadowy figures behind the fence, the most important photo in history',
  clue_newman_direction: 'A family lying flat on grass, the father pointing behind him toward a grassy knoll, directional arrows showing where the shots came from his perspective, closest civilian witness',
  clue_newman_police_reaction: 'Motorcycle police officers abandoning their bikes and running UP a grassy hill toward a fence, not toward a tall building, initial instinct pointing to the knoll, chaos',
  clue_baker_lunchroom: 'A calm man holding a Coca-Cola bottle in a second-floor break room, a police officer pointing a gun at him, only 90 seconds after shots fired four floors above, impossibly cool',
  clue_baker_evidence: 'A sixth-floor room with cardboard boxes arranged as a snipers nest near a window, three brass shell casings on the floor, a rifle partially hidden between boxes, crime scene evidence',
  clue_baker_timing: 'A stopwatch showing 90 seconds with a cross-section diagram of a building — showing the path from sixth floor window down four flights of stairs to a second floor lunchroom, impossible sprint',
  clue_truly_missing: 'A clipboard with employee names being checked off, one name circled in red with a question mark — the only worker unaccounted for, roll call revealing the suspect, simple but damning',
  clue_truly_curtain_rods: 'A long paper bag on a car back seat next to a rifle-shaped silhouette outline, the lie about curtain rods that were never found, deception in packaging, morning light',
  clue_frazier_bag: 'A paper bag with measurement markings — 27 inches vs 35 inches — too short to hold a rifle, or was it? A disassembled rifle next to the bag for comparison, disputed evidence',
  clue_frazier_irving: 'A 1960s calendar with Thursday November 21 circled in red, breaking the usual weekend pattern, an unusual trip that now looks like preparation, ominous scheduling',
  clue_bowers_two_men: 'Two unidentified men standing near a wooden fence behind the grassy knoll, seen from above through a tower window, they dont belong there, strangers in position before the shooting',
  clue_bowers_flash: 'A flash of light or muzzle blast at a wooden fence, seen from an elevated tower perspective, the instant of the shooting, critical moment captured by one witness from above',
  clue_bowers_ignored: 'Evidence photos and witness statements being placed in a filing cabinet drawer marked IGNORE, investigative negligence, grassy knoll evidence being deliberately suppressed',
  clue_perry_entrance: 'A medical diagram of a throat with a small round wound marked ENTRANCE, clean edges, a doctors hand pointing at it, the original medical opinion before pressure was applied',
  clue_perry_pressured: 'A doctor being confronted by men in suits in a hospital hallway, authority figures pressuring him to change his medical opinion, institutional intimidation, the truth being suppressed',
  clue_perry_death_time: 'A hospital clock showing 1:00 PM, a priest administering last rites, a womans hand placing a wedding ring, the official moment of death, solemn finality',
  clue_mcclelland_rear_wound: 'A medical illustration showing the back of a skull with a large exit wound, 20 doctors names listed around it, overwhelming consensus on wound location, rear exit wound',
  clue_mcclelland_direction: 'Ballistic trajectory arrows showing: a bullet entering from the FRONT and exiting through the REAR of a skull, basic physics of exit wounds, direction of fire proven by wound',
  clue_mcclelland_autopsy_conflict: 'Two medical diagrams side by side — Parkland doctors showing rear wound vs Bethesda autopsy showing side/front wound — contradicting official records, institutional vs eyewitness',
  clue_tomlinson_stretcher: 'A nearly pristine bullet sitting on a hospital stretcher mattress pad, impossibly clean for what it allegedly did, the magic bullet in its resting place, suspicious evidence',
  clue_tomlinson_pristine: 'A pristine rifle bullet next to severely deformed test bullets that went through only one body — the magic bullet defies physics, comparison of damage, impossible preservation',
  clue_wright_pointed_nose: 'Two bullets side by side — one pointed-nose, one round-nose — the bullet the witness handled vs the bullet in evidence, they dont match, evidence substitution',
  clue_landis_bullet: 'A Secret Service agent finding a bullet on a car seat and placing it on a hospital stretcher, chain of evidence broken, well-intentioned tampering that destroyed the investigation',
  clue_lbj_sworn: 'A cramped airplane cabin, a man taking an oath with his hand raised, a judge holding a Bible, a woman in a blood-stained pink suit standing numbly beside, transfer of power at 30000 feet',
  clue_roberts_revolver: 'A .38 revolver being tucked into a waistband, a jacket being pulled on quickly, 3-4 minutes in a boarding house before heading back out, arming up for something, urgency',
  clue_roberts_police_car: 'A Dallas police car slowly passing a boarding house and honking twice, mysterious and unexplained, no officer claimed this stop, was it a signal, suburban paranoia',
  clue_markham_fled: 'A man fleeing down a residential street, reloading a revolver while walking, empty shell casings falling from his hands, calm methodical escape from a murder, cold-blooded departure',
  clue_markham_tippit_details: 'A police car window with a man leaning in talking to the officer inside, a moment of conversation before sudden violence, the calm before four gunshots',
  clue_brewer_arrest: 'A man being tackled by police officers inside a dark movie theater, punching an officer, a revolver that misfired, theater seats overturned, violent arrest scene, dramatic action',
  clue_brewer_hiding: 'A man ducking into alcoves and doorways as police sirens pass, sneaking into a movie theater without paying, hiding in the dark, a fugitive trying to disappear into Oak Cliff',
  clue_oswald_denial: 'A man in handcuffs at a press conference, microphones thrust in his face, shouting I am just a patsy, flashbulbs exploding, defiant denial, media circus',
  clue_oswald_fpcc: 'A leaflet with communist slogans and the address 544 Camp Street overlaid with anti-Castro CIA operative logos at the same address — the impossible contradiction, double agent territory',
  clue_oswald_russia: 'A split composition: one side showing a US Marine at a military base with U-2 spy planes, other side showing the same man in a Soviet apartment in Minsk — defector or asset, dual life',
  clue_fritz_no_recording: 'An empty interrogation room with a bare desk, no tape recorder, no stenographer, just handwritten notes — 12 hours of questioning the century\'s most important suspect with no record, incompetence or design',
  clue_mexico_city: 'Surveillance photos pinned to a board — one showing a heavyset man who is clearly NOT the suspect, labeled as the suspect — CIA surveillance failure or deliberate deception, mistaken identity',
  clue_fritz_transfer: 'A basement hallway packed with reporters and civilians, a handcuffed man being led through, minimal security, the setup for murder in plain sight, tragedy about to unfold',
  clue_ruby_knowledge: 'A nightclub owner at a midnight press conference correcting the district attorney about the suspects Cuba connections — knowledge no civilian should have, insider information',
  clue_ruby_parkland: 'A stocky man in a fedora at a hospital emergency room entrance, denied being there but a journalist saw him — at the hospital within an hour of the shooting, suspicious presence',
  clue_ruby_police_access: 'A man walking freely through a police station hallway past officers who wave him through, carrying sandwiches, a civilian with extraordinary police access, cultivated relationships',
  clue_carlin_wire: 'A Western Union receipt timestamped 11:17 AM next to a police basement clock showing 11:21 AM — four minutes between a mundane errand and assassination, too perfect timing',
  clue_carlin_mob_calls: 'A telephone with a coiled cord, phone records showing calls to organized crime figures in Chicago, New Orleans, and Dallas — mob connections in the weeks before the assassination, conspiracy web',
  // Expansion clues
  clue_back_brace: 'A rigid surgical corset/back brace on a hotel dresser, medical device that held a man upright as a target, elastic bandages, the tragic detail that prevented escape from a bullet',
  clue_jfk_premonition: 'A man at a hotel window looking down at a crowd below, with a crosshair scope overlay on the view, high-powered rifle comment becoming prophecy, Fort Worth morning light',
  clue_last_words: 'A woman turning in the back seat of a convertible to speak to passengers behind her, warm smile, Dallas crowds waving, the last happy moment before everything changed',
  clue_separate_bullets: 'Two bullet trajectory lines hitting two different men in a convertible at different moments, the single-bullet theory challenged, separate impacts proven by eyewitness',
  clue_connally_wounds: 'A man in a suit with medical diagrams overlaid showing bullet path through chest, wrist, and thigh, devastating wounds from a single bullet, medical evidence illustration',
  clue_jackie_trunk: 'A woman in a pink suit climbing onto the trunk of a moving limousine, reaching for something on the rear deck, Secret Service agent running to push her back, most iconic moment of horror',
  clue_route_change: 'A 1960s newspaper with a motorcade route map, a sharp turn circled in red where the car had to slow to 11 mph, the fatal route choice, published in advance for anyone to see',
  clue_ss_drinking: 'Secret Service agents at a 1960s nightclub bar at 3 AM, drinking heavily, badges on the table, the men responsible for protecting the President in just hours, dereliction of duty',
  clue_curry_no_proof: 'A police chiefs desk with a case file open, bold text reading NO PROOF HE FIRED, the uncomfortable admission that the evidence is circumstantial, institutional doubt',
  clue_greer_slowdown: 'A drivers view through a car windshield, turning to look back instead of forward, hands turning the wheel wrong, the fatal hesitation captured in film, dereliction or design',
  clue_kellerman_flurry: 'Sound wave graphics showing a rapid burst of gunfire — a flurry of shots — more than three, from multiple directions, acoustic evidence of crossfire',
  clue_limo_evidence_destroyed: 'A presidential limousine being washed and cleaned in a garage, evidence being destroyed, a cracked windshield being replaced, the primary crime scene contaminated, institutional cover-up',
  clue_umbrella_signal: 'A black umbrella being pumped up and down on a sunny Dallas day, a man with raised fist beside him, the exact kill zone marked, was this a signal to shooters, bizarre and sinister',
  clue_umbrella_explanation: 'A man in a hearing room holding an umbrella, claiming it was about Neville Chamberlain, absurd explanation that no bystander would understand, waited 15 years to come forward',
  clue_mercer_rifle_case: 'A man pulling a long gun case from the back of a pickup truck near a grassy hill, 90 minutes before the shooting, a woman in a car watching, positioning weapons in advance',
  clue_mercer_ruby_driver: 'A woman pointing at a TV screen showing a mans face, recognizing the truck driver as the nightclub owner, identification suppressed by FBI, altered statement',
  clue_hoffman_gunman: 'A deaf man on an overpass watching a gunman behind a fence fire a rifle, then hand the weapon to a second man dressed as a railroad worker, the witness who could not call out',
  clue_hoffman_silenced: 'A man making sign language gestures at police officers who wave him away, 14 years of trying to tell his story, the barrier of deafness used to suppress truth',
  clue_clemmons_two_men: 'Two men at a street corner after a shooting, one chunky and short — not matching the suspect description, the other waving, fleeing in different directions, conflicting witness accounts',
  clue_clemmons_threatened: 'A man with a gun standing in a doorway pointing at a frightened woman, threatening silence, witness intimidation, the cost of seeing too much in Dallas 1963',
  clue_craig_rambler: 'A man running down a grassy slope and jumping into a Nash Rambler station wagon, a deputy pointing and shouting, the getaway car that the official story says didnt exist',
  clue_craig_persecution: 'A young deputy being fired, his car bombed, shot at, a spiral of destruction for telling the truth, the pattern of whistleblower elimination, newspaper headlines of his death',
  clue_witness_deaths: 'A wall of photographs with red X marks through faces, 78 witnesses who died unnaturally, statistical impossibility, the deadliest investigation in American history',
  clue_carr_daltex_man: 'A heavyset man in horn-rimmed glasses and a tan sport coat visible in an upper window of a building across from Dealey Plaza, an alternative sniper position, the second gunman',
  clue_carr_fbi_silenced: 'An FBI agent putting his hand up to stop a witness from talking, if you didnt see Oswald we dont want to hear it, systematic evidence suppression, institutional corruption',
  clue_marina_rifle: 'An empty green blanket lying limp in a suburban garage, the rifle that was stored here is gone, taken the night before, physical proof of premeditation',
  clue_marina_walker: 'A bullet hole through a window frame of a house, the April 1963 Walker shooting, the same rifle used months before Dallas, establishing the pattern of assassination',
  clue_marina_ring: 'A wedding ring and cash left on a bedroom dresser, never done before, the morning of November 22, a man who knew he wasnt coming back, goodbye without words',
  clue_paine_job: 'A help wanted sign at a warehouse building overlooking a motorcade route, a woman recommending her houseguests husband for the job, innocent kindness that placed a man at the window',
  clue_odio_visit: 'Three men at an apartment door at night — two Cuban men introducing a thin American as Leon Oswald, linking the suspect to anti-Castro militants weeks before Dallas, manufactured trail',
  clue_odio_framing: 'A telephone with someone calling back to make sure you remember the American and his violent words, intelligence tradecraft, building a cover story for an operation, manipulation',
  clue_ferrie_oswald_cap: 'A photograph showing a bizarre-looking man with fake eyebrows next to a teenage boy in Civil Air Patrol uniforms, connection proven despite denials, the handler and the asset',
  clue_ferrie_houston_trip: 'A car driving 350 miles through a thunderstorm at night from New Orleans to Houston, a man at an ice skating rink making no phone calls, the worst alibi in criminal history',
  clue_ferrie_death: 'Two death scenes side by side — a man dead in his apartment with suicide notes, and another man murdered by axe and gunshot on the same day, coincidence defying all probability',
  clue_banister_544: 'A secretary at a desk recognizing a man she saw in her bosss office — the communist agitator was working from the anti-communist headquarters, the impossible address that proves the operation',
  clue_banister_cia_ops: 'A triangle diagram connecting CIA, Mafia, and Cuban exile symbols, all meeting at one New Orleans office, the conspiracy nexus, three forces with one shared enemy',
  clue_marcello_motive: 'A mob boss doing the cut off the head gesture at a dinner table, kill the president to remove the attorney general brother, the elegant logic of mafia strategy, power calculation',
  clue_ruby_mob_network: 'Phone records with lines connecting names — Pecora, Baker, Weiner — mob figures in Chicago, New Orleans, and Dallas, the web that connects the nightclub owner to organized crime, conspiracy proof',
  clue_marcello_confession: 'An elderly man in a prison yard whispering to an FBI informant, admitting he set up the patsy and arranged the silencer, decades-late confession from the most powerful don',
  clue_garrison_shaw_cia: 'A CIA document stamp CONFIRMED on a file about a New Orleans businessman, decades later proving the prosecutor was right all along, vindication that came too late',
  clue_garrison_544_nexus: 'A conspiracy board with 544 Camp Street at the center, lines radiating to Oswald, Banister, Ferrie, the CIA, and the Mafia, the address where all threads converge',
  clue_garrison_zapruder: 'A courtroom projector showing grainy 8mm film footage on a screen, jurors gasping, the first time the public saw what happened in Dealey Plaza, back and to the left',
  clue_bolden_chicago_plot: 'A split composition: Chicago skyline with a sniper in a building mirroring Dallas, two nearly identical assassination plots, the dress rehearsal that was covered up',
  clue_bolden_silenced: 'A Secret Service agent in handcuffs being led from a courthouse, imprisoned for trying to testify, the first Black agent on the presidential detail destroyed for knowing the truth',
  clue_wade_corrected: 'A nightclub owner in a crowd shouting a correction at a district attorney at a podium — Fair Play for Cuba Committee — knowledge no civilian should have, insider information exposed',
  clue_wade_chaos: 'A third-floor police hallway packed wall to wall with reporters, cameras, civilians, no security, anyone could walk in, the building where a president will be murdered, institutional failure',
  clue_hosty_surveillance: 'An FBI agent flushing a handwritten note down a toilet, destroying evidence on orders from his superior, the note Oswald delivered to the FBI days before Dallas, what did it say',
  clue_marguerite_intelligence: 'A mothers scrapbook with military photos, Russian language textbooks, State Department letters, and CIA base assignments — the evidence that her son was an intelligence asset, not a lone nut',
  clue_paine_blanket: 'A limp empty blanket on a garage floor, police lifting it expecting to find a rifle, the physical proof that connects the suburban garage to the sixth-floor window, the missing weapon',
  clue_greer_delay: 'Frame-by-frame images from 8mm film showing a driver turning twice to look back while the car nearly stops, the fatal 5-6 second delay, protocol violation or something worse',
};

// ── MAIN ────────────────────────────────────────────────────────

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
    prompt: locationPrompts[id] || `A ${data.locations[id].name} scene in 1963 Dallas, ${data.locations[id].description.substring(0, 150)}`,
    output: path.join(dir, `${id}.jpg`)
  }));
} else if (category === 'characters') {
  dir = path.join(IMG_DIR, 'characters');
  fs.mkdirSync(dir, { recursive: true });
  items = Object.keys(data.characters).map(id => ({
    id,
    prompt: characterPrompts[id] || `Portrait of ${data.characters[id].name}, ${data.characters[id].role}, 1963 Dallas, dramatic lighting`,
    output: path.join(dir, `${id}.jpg`)
  }));
} else {
  dir = path.join(IMG_DIR, 'clues');
  fs.mkdirSync(dir, { recursive: true });
  items = Object.keys(data.clues).map(id => ({
    id,
    prompt: cluePrompts[id] || `Visual representation of: ${data.clues[id].title} — ${data.clues[id].description.substring(0, 150)}`,
    output: path.join(dir, `${id}.jpg`)
  }));
}

console.log(`\nGenerating ${items.length} ${category} images...\n`);

let ok = 0, fail = 0;
for (const item of items) {
  const result = generateImage(item.prompt, item.output);
  if (result) ok++; else fail++;
}

console.log(`\nDone: ${ok} ok, ${fail} failed out of ${items.length}`);
