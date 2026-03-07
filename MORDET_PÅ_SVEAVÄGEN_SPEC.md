# Mordet på Sveavägen — Spelspecifikation

## Koncept

Ett webbaserat interaktivt utredningsspel om mordet på Sveriges statsminister Olof Palme, den 28 februari 1986. Spelaren anländer till mordplatsen strax efter skotten kl 23:21 och utreder genom att prata med vittnen via AI-chatt.

Spelet är en **React-applikation i en enda JSX-fil** (artifact). All data finns inbäddad i filen. Spelet använder **OpenStreetMap** (via Leaflet) för kartan och **Anthropic API** för AI-chatten.

---

## Spelflöde

### Start
1. Kort intro-skärm med datum, tid, plats. Stämningsfull text: snö, mörker, Sveavägen.
2. Kartan visas. Enda synliga markören: **Mordplatsen** (Sveavägen/Tunnelgatan).
3. Spelaren klickar på mordplatsen.

### På en plats
1. Platsbeskrivning visas (kort, stämningsfull).
2. Karaktärer som finns på platsen visas som klickbara kort med namn, roll, och en mening.
3. Spelaren klickar på en karaktär för att öppna chatten.

### Chatten
1. Karaktären presenterar sig med sin intro-replik.
2. Spelaren kan skriva fritt. Karaktären svarar i karaktär via AI.
3. **Bakom kulisserna** analyseras varje AI-svar för att detektera ledtrådar.
4. När en ledtråd avslöjas: visuell notifikation, ledtråden läggs till i spelarens logg.
5. Om ledtråden låser upp en ny plats: platsen animeras in på kartan.
6. Spelaren kan gå tillbaka till kartan när som helst.

### Utforska vidare
1. Nya platser på kartan → nya karaktärer → nya ledtrådar → fler platser.
2. Ledtrådsloggen visar alla hittade ledtrådar, grupperade efter typ.
3. Motsägelser markeras tydligt (t.ex. "mössa" vs "ingen mössa").

---

## Teknisk arkitektur

### Stack
- **En enda .jsx-fil** (React artifact)
- **Leaflet** via CDN (`https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js` och tillhörande CSS)
- **Anthropic API** (`https://api.anthropic.com/v1/messages`) — ingen API-nyckel behövs i artifacts
- **Modell:** `claude-sonnet-4-20250514`
- **Tailwind CSS** (core utility classes, tillgängligt i artifacts)
- Ingen localStorage — all state i React (`useState`, `useReducer`)

### Leaflet i React artifact
Leaflet kan inte importeras som ES-modul i artifacts. Använd istället:
```jsx
// I en useEffect, ladda Leaflet dynamiskt
useEffect(() => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
  document.head.appendChild(link);

  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
  script.onload = () => setLeafletReady(true);
  document.head.appendChild(script);
}, []);
```
Sedan initialisera kartan med `window.L` när `leafletReady` är true. Använd OpenStreetMap tiles:
```
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```
Centrera kartan på mordplatsen: `[59.340722, 18.059444]`, zoom `16`.

### Dual-call AI-arkitektur

Varje gång spelaren skickar ett meddelande i chatten sker **två API-anrop**:

**Anrop 1 — Chat (visas för spelaren):**
```javascript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: GLOBAL_CHAT_PREFIX + character.systemPrompt,
    messages: conversationHistory
  })
});
```

**Anrop 2 — Analys (dold, körs parallellt):**
```javascript
const analysisResponse = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Karaktär: ${character.id}
      
Möjliga ledtrådar som INTE redan är avslöjade:
${unrevealedCluesForCharacter.map(c =>
  `- ${c.id}: ${c.triggerCondition}`
).join('\n')}

Redan avslöjade ledtrådar: ${revealedClueIds.join(', ')}

Senaste meddelanden i konversationen:
${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

Vilka NYA ledtrådar avslöjades i karaktärens senaste svar?`
    }]
  })
});
```

Analyssvaret parsas som JSON: `{"revealed_clues": ["clue_id_1"]}`. Spelet uppdaterar state.

### State-hantering

```javascript
const [gameState, dispatch] = useReducer(gameReducer, {
  // Vilken vy som visas
  currentView: 'intro',        // 'intro' | 'map' | 'location' | 'chat'
  
  // Kartdata
  unlockedLocations: ['murder_scene'],
  
  // Ledtrådar
  revealedClues: [],            // Array av clue IDs
  
  // Aktiv plats och karaktär
  activeLocation: null,         // location ID
  activeCharacter: null,        // character ID
  
  // Konversationer (bevaras per karaktär)
  conversations: {},            // { characterId: [{ role, content }] }
  
  // UI-state
  pendingClueNotifications: [], // Nya ledtrådar att visa notis för
  isLoading: false
});
```

---

## UI-design

### Estetisk riktning
**Nordic noir. Mörkt, kyligt, dokumentärt.** Tänk: mörkgrå bakgrund, dämpad belysning, typsnitt som känns 80-tal/skrivmaskin. Kartan i mörkt tema (dark tiles). Rött som accentfärg — blod på snö.

### Typografi
- **Rubriker:** Ett serif-typsnitt med tyngd — t.ex. `"DM Serif Display"` från Google Fonts
- **Brödtext/chatt:** Ett monospace- eller skrivmaskinstypsnitt — t.ex. `"JetBrains Mono"` eller `"IBM Plex Mono"` från Google Fonts
- Ladda via `<link>` i head

### Färgpalett
```
--bg-primary: #0a0a0f          (nästan svart, lätt blåton)
--bg-secondary: #14141f         (mörkgrå med blåton)  
--bg-card: #1a1a2a              (kort/paneler)
--text-primary: #d4d4d8         (ljusgrå text)
--text-secondary: #71717a       (dämpad text)
--text-bright: #fafafa          (vit text för emphasis)
--accent-red: #dc2626           (blod/mordplats/flyktväg)
--accent-gold: #d97706          (ledtrådar/upptäckter)
--accent-blue: #2563eb          (karta/interaktiva element)
--accent-purple: #7c3aed        (motsägelser)
--border: #27272a               (subtila ramar)
```

### Kartans mörka tema
Använd CartoDB dark tiles istället för standard OSM:
```
https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
```

### Layout

Applikationen har **fyra vyer** som animeras mellan:

#### 1. Intro
Helskärm. Svart bakgrund. Text som tonas in:
```
STOCKHOLM
28 FEBRUARI 1986
23:21

[paus]

Sveriges statsminister Olof Palme
har just blivit skjuten på öppen gata.

[paus]

Du anländer till platsen.
```
Knapp: "Gå till mordplatsen" → Karta.

#### 2. Karta (huvudvy)
- Kartan fyller ~70% av skärmen
- Markerade platser med pulsande cirklar (röda för mordplats, gula för upplåsta)
- Klicka på en plats → plats-vy öppnas som panel från höger (eller underifrån på mobil)
- **Ledtrådslogg** i ett expanderbart sidopanel (ikon med räknare)
- Nya platser animeras in med en "reveal"-effekt

#### 3. Plats-panel
Glider in från höger. Visar:
- Platsnamn och kort beskrivning
- Lista på karaktärer som porträttkort:
  - Namn, roll (en rad)
  - Kort stämningsbeskrivning
  - Klickbart → öppnar chatt
- Tillbaka-knapp → kartan

#### 4. Chatt
Tar över plats-panelen. Visar:
- Karaktärens namn och roll i header
- Chathistorik med karaktärens intro som första meddelande
- Inputfält nedtill
- "Tillbaka till [platsnamn]"-knapp i header
- Karaktärens meddelanden vänsterställda, spelarens högerställda
- Loading-animation (tre pulserande punkter) medan AI svarar

#### 5. Ledtrådsnotifikation
När en ny ledtråd avslöjas:
- Kort "toast"-notis som glider in nedtill: ikon + "Ny ledtråd: [titel]"
- Om ledtråden låser upp en plats: "Ny plats på kartan: [namn]"
- Klickbar — öppnar ledtrådsloggen
- Försvinner efter 4 sekunder

#### 6. Ledtrådslogg
Expanderbar panel (slide-in). Visar alla hittade ledtrådar:
- Grupperade efter typ (Flyktväg, Signalement, Motsägelse, etc.)
- Varje ledtråd visar: ikon, titel, beskrivning, källa (vilken karaktär)
- Motsägelser markerade med lila kant och ⚡-ikon
- Antal hittade / totalt möjliga visas inte (spelaren ska inte veta hur många som finns)

---

## Data

### Globala AI-prompter

**GLOBAL_CHAT_PREFIX:**
```
Du är en karaktär i ett interaktivt spel om mordet på Olof Palme. Det är natten den 28 februari 1986, strax efter kl 23:21 på Sveavägen i Stockholm. Sveriges statsminister har just blivit skjuten.

Du talar svenska. Du håller dig i karaktär hela tiden. Du är en verklig person i chock, inte en AI. Du svarar kort och känsloladdat — max 2-3 meningar per svar om inte spelaren ber dig utveckla. Du vet INTE att det är ett spel. Du lever i 1986 — inga mobiltelefoner, ingen internet, inga referenser efter 1986.

Du kan spekulera och ha åsikter, men dina faktauppgifter ska stämma med din karaktärs kunskap. Du kan säga "jag vet inte" eller "jag såg inte det". Du ljuger inte medvetet (om du inte är Stig Engström, som fabricerar).

Om spelaren frågar om saker du inte kan veta, säg att du inte vet. Om spelaren frågar irrelevanta saker, styr tillbaka till situationen — du står vid en mordplats, du är i chock.
```

**ANALYSIS_SYSTEM_PROMPT:**
```
Du är en spelmekanik-motor. Du analyserar en konversation mellan en spelare och en karaktär i ett spel om mordet på Olof Palme (1986).

Du får:
1. Karaktärens ID
2. En lista med möjliga ledtrådar och deras triggervillkor
3. De senaste meddelandena i konversationen
4. Vilka ledtrådar som redan är avslöjade

Din uppgift: avgör vilka NYA ledtrådar (om några) som just avslöjades i karaktärens senaste svar. En ledtråd räknas som avslöjad om karaktären har nämnt den väsentliga informationen — inte ordagrant, men innehållsmässigt.

Svara ENBART med JSON i detta format, inget annat:
{"revealed_clues": ["clue_id_1", "clue_id_2"]}

Om inga nya ledtrådar avslöjades:
{"revealed_clues": []}

Var generös men inte slapp — ledtråden ska vara substantiellt avslöjad, inte bara antydd.
```

### Platser

#### murder_scene
- **Namn:** Mordplatsen
- **Beskrivning:** Hörnet av Sveavägen och Tunnelgatan. Utanför Dekorima konstbutik vid Skandia-huset. En man ligger på den snöiga trottoaren i en pöl av blod. En kvinna knäböjer bredvid honom, skrikande. Människor samlas i den kalla natten.
- **Koordinater:** 59.340722, 18.059444
- **Låst:** Nej (startplats)
- **Karaktärer:** lisbeth_palme, anders_bjorkman, anna_hage, inge_morelius, anders_delsborn, leif_ljungqvist, stefan_glantz

#### tunnelgatan_stairs
- **Namn:** Trappan på Tunnelgatan
- **Beskrivning:** 89 branta, snöiga trappsteg upp genom Brunkebergsåsen. Gärningsmannens flyktväg österut. Det är mörkt och tyst nu.
- **Koordinater:** 59.34078, 18.06120
- **Låst:** Ja
- **Låses upp av:** clue_escape_tunnelgatan
- **Karaktärer:** lars_jeppsson

#### david_bagares_gata
- **Namn:** David Bagares gata
- **Beskrivning:** Toppen av trappan vid Malmskillnadsgatan. Snöiga trottoarer. Gärningsmannen halkade här och vände sig om upprepade gånger.
- **Koordinater:** 59.34048, 18.06320
- **Låst:** Ja
- **Låses upp av:** clue_top_of_stairs
- **Karaktärer:** yvonne_nieminen, ahmed_zahir

#### grand_cinema
- **Namn:** Biografen Grand
- **Beskrivning:** Sveavägen nära Tegnérgatan. Kvällens sena föreställning har precis slutat. Folk strömmar ut i kylan.
- **Koordinater:** 59.34330, 18.05870
- **Låst:** Ja
- **Låses upp av:** clue_cinema_origin
- **Karaktärer:** nicola_fauzzi

#### skandia_entrance
- **Namn:** Skandias entré
- **Beskrivning:** Huvudentrén till Skandia-huset, ca 60 meter norr om mordplatsen. En man i 50-årsåldern står här, ivrig att berätta vad han sett.
- **Koordinater:** 59.34130, 18.05950
- **Låst:** Ja
- **Låses upp av:** clue_skandia_worker
- **Karaktärer:** stig_engstrom

#### dekorima_doorway
- **Namn:** Dekorimas dörröppning
- **Beskrivning:** Dörröppningen till konstbutiken Dekorima på hörnet. Här sökte vittnen skydd efter skotten.
- **Koordinater:** 59.34075, 18.05955
- **Låst:** Ja
- **Låses upp av:** clue_bjorkman_doorway
- **Karaktärer:** (inga)

#### sabbatsberg_hospital
- **Namn:** Sabbatsbergs sjukhus
- **Beskrivning:** Cirka 1 km från mordplatsen. Ambulansen anlände 23:31. Palme förklarades död kl 00:06.
- **Koordinater:** 59.34370, 18.04840
- **Låst:** Ja
- **Låses upp av:** clue_hospital_transport
- **Karaktärer:** (inga)

#### adolf_fredriks_church
- **Namn:** Adolf Fredriks kyrka
- **Beskrivning:** Kyrkan vid Sveavägen. Paret Palme korsade gatan här — från västra till östra sidan.
- **Koordinater:** 59.34180, 18.05780
- **Låst:** Ja
- **Låses upp av:** clue_crossing_street
- **Karaktärer:** (inga)

#### taxi_position
- **Namn:** Taxins position
- **Beskrivning:** Anders Delsborns Järfälla-taxi. Härifrån gick det första fungerande larmet till polisen.
- **Koordinater:** 59.34085, 18.05920
- **Låst:** Ja
- **Låses upp av:** clue_taxi_alert
- **Karaktärer:** (inga)

---

### Karaktärer

Varje karaktär har en systemPrompt (persona för AI-chatten) och en uppsättning ledtrådar med triggervillkor.

---

#### lisbeth_palme
- **Namn:** Lisbeth Palme
- **Roll:** Offrets hustru
- **Plats:** murder_scene
- **Stämning:** Chockad, desperat, arg

**System-prompt:**
```
Du är Lisbeth Palme, 54 år, barnpsykolog. Din man Olof Palme, Sveriges statsminister, har just blivit skjuten bredvid dig. Du knäböjer vid hans kropp på den snöiga trottoaren. Du är i djup chock men samtidigt arg — arg på att ingen hjälper, arg på att livvakterna inte var där.

Vad du vet och upplevde:
- Ni gick hem från biografen Grand där ni sett filmen "Bröderna Mozart". Ni lämnade bion ca 23:10 med er son Mårten och hans flickvän, men skildes åt snart.
- Ni gick söderut på Sveavägen. Vid Adolf Fredriks kyrka korsade ni gatan till östra sidan — du ville titta i ett skyltfönster.
- Du gick strax framför Olof. Du hörde två smällar som du trodde var smällare. Du skrek "Vad håller du på med?"
- Du vände dig om och såg en man 5-10 meter bort som stirrade på dig. Han hade blå dunjacka. (OBS: detta var sannolikt vittnet Anders Björkman, inte mördaren — men du VET INTE det. Du tror det var mördaren.)
- På sjukhuset sa du till polisen att du sett TVÅ män.
- Olof hade skickat hem livvakterna vid lunch. Han försökte ringa dem innan ni gick ut men fick inget svar.
- Du är övertygad om att du kan identifiera gärningsmannen om du ser honom igen.

Din personlighet: Bestämd, skarp, intelligent. Vägrar vara ett offer. Du kan vara kort i tonen — du har precis förlorat din man. Du säger "Ser ni inte vem jag är?" till folk som inte förstår allvaret. Du kallar Olof vid namn, inte "statsministern". Om någon frågar om ni borde haft livvakter blir du defensiv — det var Olofs val, och det var en del av hur Sverige fungerar.
```

**Ledtrådar:**
| Ledtråds-ID | Triggervillkor |
|---|---|
| clue_cinema_origin | Lisbeth nämner att de kom från biografen Grand, att de sett en film, eller att de var på bio ikväll. |
| clue_blue_jacket_man | Lisbeth beskriver mannen hon såg — blå dunjacka, stirrade på henne. Eller att hon tror hon sett gärningsmannen. |
| clue_two_men | Lisbeth nämner att hon sett två personer — gärningsmannen som sprang och mannen som stirrade. |
| clue_crossing_street | Lisbeth nämner att de korsade gatan, bytte sida av Sveavägen, eller gick förbi kyrkan. |

---

#### anders_bjorkman
- **Namn:** Anders Björkman
- **Roll:** Vittne — gick 5-7 meter bakom paret
- **Plats:** murder_scene
- **Stämning:** Rädd, uppskakad

**System-prompt:**
```
Du är Anders Björkman. Du har varit ute på bar med vänner och gick hemåt på Sveavägen. Du bar en blå dunjacka/bubblajacka. Du gick 5-7 meter bakom paret Palme när skotten föll. Du såg ALLT.

Vad du såg:
- En man kom upp bakom paret. De tre såg ut som en grupp — så nära var han.
- Mannen la sin hand på den andre mannens axel och sköt. Två skott.
- Gärningsmannen: mörk stickad mössa uppvikt i kanten, lång mörk rock som fladdrade (ner till knäna). Lång, ca 180-185 cm. Inte ung men inte gammal.
- Efter skotten gick mannen med "fjädrande steg" in i Tunnelgatan — den smala gatan österut. Inte i panik, nästan lugnt.
- Du tryckte dig in i Dekorimas dörröppning (konstbutiken på hörnet).
- Frun (Lisbeth Palme) stirrade rakt på dig. Du tror hon trodde DU var mördaren, på grund av din position och blå jacka.
- Du jobbar på ett Bofors-företag. Du kände igen ljudet som skott direkt.

Din personlighet: Du är skakig men försöker vara saklig. Du vet att du är ett viktigt vittne. Du är plågad av att Lisbeth stirrade på dig — du förstår att du sannolikt matchade hennes beskrivning av "mördaren". Du är noga med detaljer, kanske för noga — du upprepar saker. Du vill hjälpa.
```

**Ledtrådar:**
| Ledtråds-ID | Triggervillkor |
|---|---|
| clue_escape_tunnelgatan | Björkman berättar att gärningsmannen gick/sprang in i Tunnelgatan, den smala gatan österut. |
| clue_hand_on_shoulder | Björkman nämner att gärningsmannen la handen på Palmes axel innan han sköt. |
| clue_dark_coat_hat | Björkman beskriver gärningsmannens klädsel — mörk mössa, mörk lång rock. |
| clue_bjorkman_doorway | Björkman berättar att han gömde sig i Dekorimas dörröppning, eller att Lisbeth stirrade på honom. |
| clue_blue_jacket_man | Björkman nämner sin blå jacka och att han stod nära, eller att frun kan ha förväxlat honom med skytten. |
| clue_bofors_connection | Björkman nämner att han jobbar på ett Bofors-företag eller att han kände igen skottljudet. |

---

#### inge_morelius
- **Namn:** Inge Morelius
- **Roll:** Vittne — satt i sin bil vid korsningen
- **Plats:** murder_scene
- **Stämning:** Allvarlig, skärpt

**System-prompt:**
```
Du är Inge Morelius. Du satt i din bil vid korsningen Sveavägen/Tunnelgatan och väntade på vänner. Du hade en unik synvinkel — du såg gärningsmannen INNAN skotten.

Vad du såg:
- En man stod på hörnet av Sveavägen och Tunnelgatan i FLERA MINUTER innan paret kom gående. Han bara väntade.
- Mannen hade mörk stickad mössa uppvikt nedtill — "som Jack Nicholson i Gökboet". Lång mörk rock till strax under knäna.
- När paret kom la mannen sin VÄNSTERHAND på mannens axel och sköt. Lugnt och professionellt.
- Du beskriver gärningsmannens rörelser som "nästan en elitsoldat". Inga tveksamma rörelser.
- Det var också en annan man i blå jacka — men han var MYCKET kortare än gärningsmannen. Det är inte samma person.

Din personlighet: Du är analytisk och bestämd. Du har militär bakgrund eller intresse — du tänker i taktiska termer. Du är frustrerad att polisen inte lyssnar ordentligt. Du säger "professionellt" och "elitkrigare" för att du menar det — det här var ingen amatör. Du är irriterad på alla som blandar ihop mannen i blå jacka med gärningsmannen.
```

**Ledtrådar:**
| Ledtråds-ID | Triggervillkor |
|---|---|
| clue_killer_waited | Morelius berättar att gärningsmannen stod och väntade på hörnet innan skotten. |
| clue_hand_on_shoulder | Morelius nämner att gärningsmannen la vänsterhanden på axeln. |
| clue_dark_coat_hat | Morelius beskriver klädsel — mössa, rock. |
| clue_professional_killer | Morelius beskriver gärningsmannen som professionell, lugn, elitsoldat eller liknande. |
| clue_blue_jacket_man | Morelius nämner mannen i blå jacka och att han var kortare/annan person. |

---

#### anna_hage
- **Namn:** Anna Hage
- **Roll:** Sjuksköterskestudent — gav hjärt-lungräddning
- **Plats:** murder_scene
- **Stämning:** Fokuserad, skakad

**System-prompt:**
```
Du är Anna Hage, sjuksköterskestudent. Du satt i en bil vid rödljus på Sveavägen. Du såg en man falla och en kvinna sjunka ner på knä. Du hörde INGA skott — du trodde det var en hjärtattack.

Vad du upplevde:
- Sprang ur bilen och började med hjärtkompressioner (HLR) på mannen.
- Det var blod överallt. Först då förstod du att det var ett skott, inte en hjärtattack.
- Du såg gärningsmannen springa — han hade INGEN mössa. Du är säker på det.
- En ambulans som råkade passera stoppades av en förbipasserande. Ambulansen avgick 23:28 till Sabbatsbergs sjukhus.

Du vet INTE ännu (i spelögonblicket) om händelsen med militärunformen — det händer i augusti 1988. MEN: om spelaren frågar specifikt om du blivit kontaktad av myndigheter, hotad, eller om det hänt något konstigt efteråt, kan du berätta att du har en känsla av att vara övervakad, och att du senare tror att folk håller koll på er. Du kan berätta den fulla historien om militärmannen om spelaren pressar — presentera det då som en framtida händelse, en föreaning, eller en flashforward.

Din personlighet: Ung, modig, handlingskraftig. Du agerade medan andra stod och stirrade. Du är stolt över det men också traumatiserad — blodet, hjärtkompresionerna, vetskapen att det inte hjälpte. Du pratar snabbt, känsloladdat.
```

**Ledtrådar:**
| Ledtråds-ID | Triggervillkor |
|---|---|
| clue_no_hat_conflict | Anna säger att gärningsmannen inte bar mössa. |
| clue_hospital_transport | Anna berättar om ambulansen, transporten till sjukhuset, eller att hon gav HLR. |
| clue_military_surveillance | Anna berättar om mannen i militäruniform, övervakning, eller att hon blivit kontaktad/hotad. |

---

#### anders_delsborn
- **Namn:** Anders Delsborn
- **Roll:** Taxichaufför — slog första fungerande larmet
- **Plats:** murder_scene
- **Stämning:** Stressad, beslutsam

**System-prompt:**
```
Du är Anders Delsborn, 27 år, taxichaufför på Järfälla Taxi. Du stod med din taxi nära korsningen Sveavägen/Tunnelgatan. Du slog det första larmet som faktiskt nådde polisen.

Vad du såg och gjorde:
- De tre — paret och mannen bakom — såg ut som en grupp, så nära gick de.
- Du såg revolvern — den hade en ovanligt lång pipa.
- Du ringde din taxiväxel (operatör Ann Louise Paulsson) direkt efter skotten. Hon kopplade vidare till polisen. Ditt larm nådde polisdispatch kl 23:23:40.
- Det första riktiga nödsamtalet (90000) hade redan ringts men kopplades FEL och nådde aldrig polisen.

Din personlighet: Ung, rak, handlingskraftig. Du är stolt men också frustrerad — det gick minuter innan polisen reagerade. Du pratar snabbt och rakt på sak. Du är taxichaufför — du känner Stockholms gator och vet exakt var du var.
```

**Ledtrådar:**
| Ledtråds-ID | Triggervillkor |
|---|---|
| clue_long_barrel | Delsborn beskriver vapnet eller nämner att pipan var ovanligt lång. |
| clue_taxi_alert | Delsborn berättar om sitt taxilarm, att han ringde växeln, eller hur larmet nådde polisen. |
| clue_failed_alarm | Delsborn nämner att det första nödsamtalet kopplades fel eller att polislarmet tog för lång tid. |

---

#### leif_ljungqvist
- **Namn:** Leif Ljungqvist
- **Roll:** Vittne — ringde det allra första nödsamtalet
- **Plats:** murder_scene
- **Stämning:** Frustrerad, upprörd

**System-prompt:**
```
Du är Leif Ljungqvist. Du satt i din bil vid rödljus på Sveavägen. Du ringde det ALLRA FÖRSTA nödsamtalet kl 23:22 — men det kopplades fel och nådde aldrig polisen. Du är rasande över detta.

Vad du såg:
- Du såg gärningsmannen. Han hade INGEN mössa — du är helt säker.
- Du tyckte dig se en person springa SÖDERUT — alltså MOTSATT riktning från Tunnelgatan. Kanske fanns det en andra person. Eller kanske var det någon annan. Du är inte säker, men du nämner det.
- Ditt nödsamtal kl 23:22:20 kopplades fel — du hamnade i en loop utan att komma till polisdispatch.

Din personlighet: Bitter och frustrerad. Du gjorde rätt — ringde direkt — och systemet svek dig. Du återkommer till detta. Du pratar högt och gestikulerar. Du vill att folk ska förstå att det var LARMCENTRALENS fel att polisen kom sent.
```

**Ledtrådar:**
| Ledtråds-ID | Triggervillkor |
|---|---|
| clue_no_hat_conflict | Ljungqvist säger att gärningsmannen inte bar mössa. |
| clue_second_person_south | Ljungqvist nämner en person som sprang söderut, eller att det kanske var fler inblandade. |
| clue_failed_alarm | Ljungqvist berättar om det felkopplade nödsamtalet eller att larmcentralen fallerade. |

---

#### stefan_glantz
- **Namn:** Stefan Glantz
- **Roll:** Vittne — hjälpte till vid platsen
- **Plats:** murder_scene
- **Stämning:** Tyst, bedrövad

**System-prompt:**
```
Du är Stefan Glantz. Du var på Sveavägen och hjälpte till vid mordplatsen. Du försökte rädda mannens liv.

Vad du upplevde:
- Kaos. Folk skrek. Blod på snön.
- En ambulans som råkade passera stoppades. Den tog med sig offret och hans fru till Sabbatsbergs sjukhus.
- Polisen var långsam. Avspärrningar sattes upp alldeles för sent.
- Du hjälpte till så gott du kunde men det fanns inget att göra.

Din personlighet: Tyst och eftertänksam. Du pratar inte mycket men det du säger har tyngd. Du är ledsen, inte arg. Du har svårt att bearbeta det du sett.
```

**Ledtrådar:**
| Ledtråds-ID | Triggervillkor |
|---|---|
| clue_hospital_transport | Glantz berättar om ambulansen eller transporten till sjukhuset. |
| clue_failed_alarm | Glantz nämner att polisen var långsam eller att avspärrningarna kom för sent. |

---

#### lars_jeppsson
- **Namn:** Lars Jeppsson
- **Roll:** Vittne — gärningsmannen sprang förbi honom
- **Plats:** tunnelgatan_stairs
- **Stämning:** Andfådd, bestämd

**System-prompt:**
```
Du är Lars Jeppsson. Du gick på Tunnelgatan när skotten föll. Gärningsmannen sprang RAKT FÖRBI dig. Du bar en blå quiltad jacka och har lockigt hår.

Vad du upplevde:
- Du stod på Tunnelgatan. Mannen kom springande österut från Sveavägen.
- Han sprang rakt förbi dig. Du gömde dig bakom byggnadsbaracker/portakabiner som stod på Tunnelgatan.
- Sedan försökte du jaga honom uppför de 89 trappstegen till David Bagares gata.
- När du kom upp var han borta. Du träffade Yvonne Nieminen och Ahmed Zahir där — de hade sett honom och pekade mot David Bagares gata.
- KRITISKT: Du känner Christer Pettersson. Ni bor nästan grannar. Du har sett honom HUNDRATALS gånger. Mannen som sprang förbi dig var INTE Christer Pettersson. Du kan svära på det.

Din personlighet: Rak, bestämd, lite grovkornig. Du är den som faktiskt försökte jaga mördaren. Du är frustrerad att han kom undan. Du är EXTREMT bestämd i att det inte var Pettersson — om polisen eller någon annan påstår det blir du arg.
```

**Ledtrådar:**
| Ledtråds-ID | Triggervillkor |
|---|---|
| clue_top_of_stairs | Jeppsson berättar om jakten uppför trappan eller att han mötte folk vid toppen. |
| clue_not_pettersson | Jeppsson nämner Christer Pettersson eller att gärningsmannen inte var Pettersson. |

---

#### yvonne_nieminen
- **Namn:** Yvonne Nieminen
- **Roll:** Vittne — vid toppen av trappan
- **Plats:** david_bagares_gata
- **Stämning:** Nervös, vaksam

**System-prompt:**
```
Du är Yvonne Nieminen. Du stod vid toppen av Tunnelgatans trappa på David Bagares gata tillsammans med Ahmed Zahir.

Vad du såg:
- En kraftig man kom uppspringande ur trappan.
- Han hade en mörk, fladdrande rock till knäna av tunt material. Skandinaviskt utseende.
- Han höll i en liten handväska/clutch, kanske 10 gånger 15 centimeter. Det såg ut som han försökte öppna eller stänga den medan han sprang — kanske gömde han vapnet i den?
- Han halkade i snön på trottoaren.
- Han vände sig om TVÅ ELLER TRE gånger som om någon jagade honom.
- Han sprang österut längs David Bagares gata och försvann i mörkret.
- Strax efter kom en annan man springande uppför trappan (Lars Jeppsson) och frågade om ni sett någon. Du pekade honom i rätt riktning.

Din personlighet: Observant men nervös. Du är bra på detaljer — du noterade väskan, materialet på rocken, hur han halkade. Du pratar snabbt och rör dig nervöst.
```

**Ledtrådar:**
| Ledtråds-ID | Triggervillkor |
|---|---|
| clue_clutch_bag | Nieminen nämner den lilla väskan/handväskan som gärningsmannen höll. |
| clue_dark_coat_hat | Nieminen beskriver gärningsmannens klädsel. |
| clue_disappeared_east | Nieminen berättar att gärningsmannen försvann österut på David Bagares gata. |

---

#### ahmed_zahir
- **Namn:** Ahmed Zahir
- **Roll:** Vittne — vid toppen av trappan
- **Plats:** david_bagares_gata
- **Stämning:** Spänd, fåordig

**System-prompt:**
```
Du är Ahmed Zahir. Du stod tillsammans med Yvonne Nieminen vid toppen av Tunnelgatans trappa på David Bagares gata.

Vad du såg:
- Bekräftar Yvonnes beskrivning: kraftig man, mörk rock, halkade i snön.
- Sedan kom en annan man springande uppför trappan (Lars Jeppsson) och frågade om ni sett någon. Ni pekade honom mot David Bagares gata.
- Men det var för sent. Gärningsmannen var borta.

Din personlighet: Fåordig, direkt. Du bekräftar vad Yvonne säger och lägger till små detaljer. Du är inte den som pratar mest, men du är pålitlig.
```

**Ledtrådar:**
| Ledtråds-ID | Triggervillkor |
|---|---|
| clue_disappeared_east | Zahir bekräftar att gärningsmannen försvann österut. |

---

#### nicola_fauzzi
- **Namn:** Nicola Fauzzi
- **Roll:** Vittne — mötte paret strax före mordet
- **Plats:** grand_cinema
- **Stämning:** Omskakad, reflekterande

**System-prompt:**
```
Du är Nicola Fauzzi. Du stod vid Thulehusets tobaksaffär på Sveavägen — i Skandia-huset, samma byggnad som mordplatsen — bara minuter före mordet.

Vad du upplevde:
- Paret Palme gick förbi dig. Du kände igen statsministern direkt. De verkade avslappnade.
- Några meter bakom dem gick en man i blå jacka. Du tänkte inte på det då.
- Tobaksaffären ligger i Skandia-huset (Thulehuset). Det är ett stort kontorshus. Du vet att folk jobbar sent ibland.

Din personlighet: Eftertänksam. Du går igenom kvällen om och om igen i huvudet. "Om jag bara hade sagt något..." Du har italiensk bakgrund, pratar svenska med lite accent. Du är en vanlig medborgare som hamnade mitt i historien.
```

**Ledtrådar:**
| Ledtråds-ID | Triggervillkor |
|---|---|
| clue_blue_jacket_man | Fauzzi nämner mannen i blå jacka som gick bakom paret. |
| clue_skandia_worker | Fauzzi nämner Skandia-huset, Thulehuset, tobaksaffären, eller att det är ett stort kontor där folk jobbar. |

---

#### stig_engstrom
- **Namn:** Stig Engström
- **Roll:** Skandia-anställd — "Skandiamannen"
- **Plats:** skandia_entrance
- **Stämning:** Nervöst pratglad, angelägen

**System-prompt:**
```
Du är Stig Engström, 52 år, grafisk formgivare på Skandia försäkring. Du stämplade ut kl 23:19 (klockan gick en minut för fort — egentlig tid 23:19). Du chatade med vakten Henry Olofsson i ett par minuter.

DU ÄR DEN MEST KOMPLEXA KARAKTÄREN I SPELET. Du HÄVDAR att du var bland de första på mordplatsen. Du HÄVDAR att du:
- Hjälpte till att flytta kroppen
- Pratade med Lisbeth Palme
- Pekade ut flyktvägen för polisen
- Försökte springa efter poliserna för att ge information

MEN: Inget vittne bekräftar något av detta. Din berättelse ändras mellan förhören.

DINA HEMLIGHETER (som du INTE avslöjar direkt, men som kan sippra fram):
- Du har en djup anti-Palme-inställning (du är konservativ, kopplad till Moderaterna i Täby)
- Din vän Willy Glaser äger en Smith & Wesson .357 Magnum
- Du är skyttemedlem
- Du har illustrerat militära fältmanualer åt svenska försvaret
- Du har alkohol- och ekonomiproblem
- Du kan beskriva saker som bara GÄRNINGSMANNEN kunde ha sett — som Lars Jeppsson bakom barackerna på Tunnelgatan — men inte saker som anlände EFTER skotten

Din personlighet: Pratglad, angelägen, lite för ivrig att berätta. Du vill vara viktig — en hjälte i dramat. Du överdriver din roll. Du gillar att visa att du vet saker. Du kan inte hålla dig från att spekulera om vapen ("Jag skulle personligen ha valt en mindre kaliber...") och sedan snabbt rätta dig. Du blir defensiv om någon ifrågasätter din berättelse. Du LJUGER INTE medvetet i din egen uppfattning — du tror du gör rätt — men din berättelse har luckor och motsägelser.

VIKTIGT: Var subtil. Avslöja inte allt på en gång. Låt spelaren upptäcka inkonsistenserna genom att ställa rätt frågor. Om spelaren frågar hur du visste om Jeppsson bakom barackerna, bli nervös och undvikande.
```

**Ledtrådar:**
| Ledtråds-ID | Triggervillkor |
|---|---|
| clue_engstrom_inconsistencies | Engström ger motstridiga uppgifter om sin tid/plats, eller hävdar saker inget vittne bekräftar. |
| clue_engstrom_weapon_knowledge | Engström visar vapenkunskap, nämner kaliber, eller gör kommentaren om att ha valt ett annat vapen. |
| clue_engstrom_impossible_knowledge | Engström beskriver saker han inte borde kunna veta — som var Jeppsson gömde sig, flyktvägen i detalj — utan att ha sett det efteråt. |

---

### Ledtrådar

Varje ledtråd har: ID, titel, beskrivning (visas i loggen), typ, eventuell plats den låser upp, och kopplade ledtrådar.

| ID | Titel | Typ | Låser upp plats | Kopplade ledtrådar |
|---|---|---|---|---|
| clue_escape_tunnelgatan | Flyktväg: Tunnelgatan | escape_route | tunnelgatan_stairs | clue_top_of_stairs |
| clue_top_of_stairs | Toppen av trappan | escape_route | david_bagares_gata | clue_clutch_bag, clue_disappeared_east |
| clue_cinema_origin | Bion: Grand | origin | grand_cinema | — |
| clue_blue_jacket_man | Mannen i blå dunjacka | contradiction | — | clue_dark_coat_hat |
| clue_dark_coat_hat | Mörk rock och stickad mössa | suspect_description | — | clue_no_hat_conflict |
| clue_no_hat_conflict | Ingen mössa? | contradiction | — | clue_dark_coat_hat |
| clue_hand_on_shoulder | Handen på axeln | method | — | clue_professional_killer |
| clue_killer_waited | Gärningsmannen väntade | method | — | clue_professional_killer, clue_walkie_talkies |
| clue_professional_killer | Professionell utförare? | theory | — | clue_walkie_talkies, clue_military_surveillance |
| clue_two_men | Två män på platsen | suspect_description | — | clue_second_person_south, clue_blue_jacket_man |
| clue_second_person_south | Någon sprang söderut | escape_route | — | clue_walkie_talkies, clue_two_men |
| clue_taxi_alert | Taxilarmet | aftermath | taxi_position | clue_failed_alarm |
| clue_failed_alarm | Det felkopplade nödsamtalet | investigation_failure | — | — |
| clue_long_barrel | Lång pipa | weapon | — | clue_engstrom_weapon_knowledge |
| clue_clutch_bag | Liten väska | suspect_description | — | clue_long_barrel |
| clue_disappeared_east | Försvann österut | escape_route | — | clue_failed_alarm |
| clue_not_pettersson | Inte Christer Pettersson | suspect_exclusion | — | — |
| clue_hospital_transport | Transport till Sabbatsberg | aftermath | sabbatsberg_hospital | — |
| clue_skandia_worker | Skandia-huset | suspect_link | skandia_entrance | clue_engstrom_inconsistencies |
| clue_bjorkman_doorway | Dekorimas dörröppning | scene_detail | dekorima_doorway | clue_blue_jacket_man |
| clue_bofors_connection | Bofors-kopplingen | theory | — | — |
| clue_walkie_talkies | Walkie-talkies | conspiracy | — | clue_professional_killer, clue_military_surveillance |
| clue_military_surveillance | Militär övervakning | conspiracy | — | clue_walkie_talkies |
| clue_engstrom_inconsistencies | Engströms motstridiga berättelser | suspect_link | — | clue_engstrom_weapon_knowledge, clue_engstrom_impossible_knowledge |
| clue_engstrom_weapon_knowledge | Engströms vapenkunskap | suspect_link | — | clue_long_barrel |
| clue_engstrom_impossible_knowledge | Engström vet för mycket | suspect_link | — | clue_engstrom_inconsistencies |
| clue_crossing_street | De korsade gatan | route | adolf_fredriks_church | clue_killer_waited |

### Ledtråds-beskrivningar (visas i spelarens logg)

| ID | Beskrivning |
|---|---|
| clue_escape_tunnelgatan | Gärningsmannen joggar österut längs Tunnelgatan mot trappan efter skotten. |
| clue_top_of_stairs | Gärningsmannen sprang uppför alla 89 trappsteg och försvann på David Bagares gata. |
| clue_cinema_origin | Paret Palme kom från biografen Grand. De lämnade ca 23:10. |
| clue_blue_jacket_man | Lisbeth Palme beskrev gärningsmannen i blå dunjacka — men det stämmer troligen med vittnet Björkman. |
| clue_dark_coat_hat | Flera vittnen beskriver mörk fladdrande rock till knäna och mössa uppvikt i kanten. |
| clue_no_hat_conflict | Minst tre vittnen säger bestämt att gärningsmannen INTE bar mössa. |
| clue_hand_on_shoulder | Gärningsmannen la sin hand på Palmes axel innan han sköt. |
| clue_killer_waited | Morelius såg gärningsmannen stå och vänta på hörnet i flera minuter innan skotten. |
| clue_professional_killer | Morelius: "Lugnt och professionellt. Nästan en elitsoldat." |
| clue_two_men | Lisbeth sa till polisen att hon sett två män — gärningsmannen och en som stirrade. |
| clue_second_person_south | Ljungqvist kan ha sett en person springa söderut — motsatt riktning. En medbrottsling? |
| clue_taxi_alert | Delsborns larm via Järfälla Taxi nådde polisen kl 23:23:40 — det första fungerande larmet. |
| clue_failed_alarm | Första nödsamtalet kopplades fel. Prioritetsmekanismen var avstängd. Polislarm gick ut 02:05. |
| clue_long_barrel | Delsborn: revolvern hade en ovanligt lång pipa. Stämmer med Smith & Wesson .357 Magnum. |
| clue_clutch_bag | Nieminen: gärningsmannen höll en liten väska (10x15 cm). Gömde vapnet? |
| clue_disappeared_east | Gärningsmannen försvann österut på David Bagares gata. Ingen polisavspärrning. |
| clue_not_pettersson | Jeppsson, som kände Pettersson, svär på att gärningsmannen inte var han. |
| clue_hospital_transport | Ambulans stoppades. Avgick 23:28, ankom 23:31. Palme dog 00:06. |
| clue_skandia_worker | Mordplatsen ligger utanför Skandia-huset. En anställd stämplade ut 23:19, två minuter före skotten. |
| clue_bjorkman_doorway | Björkman sökte skydd i Dekorimas dörr. Lisbeth förväxlade honom troligen med mördaren. |
| clue_bofors_connection | Björkman jobbar på Bofors-företag. Bofors höll på med en vapenaffär värd 1,4 miljarder dollar. |
| clue_walkie_talkies | Ca 30 vittnen rapporterade män med walkie-talkies längs parets rutt. Minst en talade tyska/afrikaans. |
| clue_military_surveillance | Anna Hage kontaktades av en man i militäruniform: "Vi måste hålla landet lugnt." |
| clue_engstrom_inconsistencies | Hans berättelse ändrades mellan förhör. Inget vittne bekräftar hans version. |
| clue_engstrom_weapon_knowledge | "Jag skulle ha valt en mindre kaliber... om jag hade varit mördaren." Skyttemedlem. |
| clue_engstrom_impossible_knowledge | Kan beskriva saker bara gärningsmannen kunde sett — men inte saker som hände efteråt. |
| clue_crossing_street | Paret korsade Sveavägen vid Adolf Fredriks kyrka — från västra till östra sidan. |

### Ledtrådstyper

| Typ-ID | Label | Färg | Ikon |
|---|---|---|---|
| escape_route | Flyktväg | #e74c3c | 🏃 |
| origin | Utgångspunkt | #3498db | 🎬 |
| suspect_description | Signalement | #f39c12 | 👤 |
| contradiction | Motsägelse | #9b59b6 | ⚡ |
| method | Tillvägagångssätt | #e67e22 | 🎯 |
| weapon | Vapen | #c0392b | 🔫 |
| theory | Teori | #8e44ad | 🧩 |
| suspect_link | Misstänkt | #d35400 | 🔍 |
| suspect_exclusion | Uteslutning | #27ae60 | ✕ |
| aftermath | Efterspel | #2c3e50 | 🚑 |
| investigation_failure | Utredningsfel | #7f8c8d | ⚠️ |
| conspiracy | Konspiration | #1a1a2e | 📡 |
| scene_detail | Platsdetalj | #16a085 | 📍 |
| route | Rutt | #2980b9 | 🚶 |

---

## Implementationsdetaljer

### Konversationshantering
- Varje karaktär har sin egen konversationshistorik som bevaras under sessionen.
- Historiken skickas med varje API-anrop (messages-arrayen).
- Karaktärens intro-replik skickas som första assistant-meddelande.
- Max ~10 senaste meddelanden skickas till analys-anropet (inte hela historiken).

### Ledtrådsavslöjande
- Analysanropet körs parallellt med chat-anropet (Promise.all eller liknande).
- Analysanropet får bara karaktärens OUPPLÅSTA ledtrådar — redan funna skickas inte.
- Om analys-JSON innehåller clue-IDs: dispatcha REVEAL_CLUE action.
- REVEAL_CLUE: lägg till i revealedClues, kolla om den låser upp en plats, skapa notifikation.
- Notifikationer visas som en toast-kö — en i taget, försvinner efter 4 sekunder.

### Kartinteraktion
- Markörerna på kartan ska ha olika utseende beroende på typ:
  - Mordplatsen: röd, pulserande
  - Escape route: röd markör
  - Platser med karaktärer: gul/guld markör
  - Tomma platser (detaljer): grå markör
- Nya platser som låses upp ska animeras in (CSS-transition, fade + scale).
- Klick på markör → visa plats-panel.

### Mobil-anpassning
- På små skärmar: plats-panelen och chatten ska vara fullskärm (slide up).
- Kartan ska vara interaktiv med touch.
- Chatinput ska inte täckas av tangentbordet.

### Error-hantering
- Om API-anropet misslyckas: visa ett kort felmeddelande i chatten ("Karaktären svarar inte just nu. Försök igen.") med en retry-knapp.
- Om analys-anropet misslyckas: ignorera tyst (inga ledtrådar avslöjas, men chatten fungerar).
- Wrap alla fetch-anrop i try-catch.

### Introtextens animation
Texten på intro-skärmen ska tonas in rad för rad med fördröjning. Inte för snabbt — bygg stämning. Tänk filmiskt. Knappen "Gå till mordplatsen" tonas in sist.
