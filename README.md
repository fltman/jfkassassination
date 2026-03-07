# Mordet på Sveavägen

Ett interaktivt utredningsspel om mordet på Olof Palme den 28 februari 1986. Spelaren anländer till brottsplatsen och utreder fallet genom att prata med AI-drivna vittnen.

![Screenshot](client/public/images/locations/murder_scene.png)

## Funktioner

- **20 platser** i Stockholm kopplade till utredningen
- **50 karaktärer** — vittnen, misstänkta, poliser och journalister
- **80 ledtrådar** som låser upp nya platser och spår
- **AI-drivna samtal** med vittnen via Claude Haiku
- **Utredningstavla** med ritverktyg, zoom och panorering
- **Sökbar anteckningsbok** med AI-genererade anteckningar
- **Kontextmedveten musik** — 10 originalspår
- **Spelarprofiler** med QR-kodsdelning
- **Anonyma karaktärer** vars identitet avslöjas genom samtal

## Krav

- **Node.js** 18+
- **OpenRouter API-nyckel** — hämta på [openrouter.ai/keys](https://openrouter.ai/keys)

## Installation

```bash
# Klona repot
git clone https://github.com/fltman/mordetpaolofpalme.git
cd mordetpaolofpalme

# Installera dependencies
npm install
cd client && npm install && cd ..

# Skapa .env-fil
cp .env.example .env
# Redigera .env och lägg in din OPENROUTER_API_KEY
```

## Starta

### Utvecklingsläge

```bash
npm run dev
```

Startar server på `http://localhost:3001` och klient på `http://localhost:5173`.

### Produktionsläge

```bash
npm run build
npm start
```

Servern körs på `http://localhost:3001` och serverar den byggda klienten.

## Databashantering

Repot innehåller en färdigseediad databas med all speldata. Om du vill återställa den:

```bash
npm run db:reset
```

## Miljövariabler

| Variabel | Beskrivning |
|----------|-------------|
| `OPENROUTER_API_KEY` | API-nyckel för OpenRouter (krävs) |
| `PORT` | Serverport (standard: 3001) |

## Teknikstack

- **Frontend:** React 18, Vite, Tailwind CSS, Leaflet
- **Backend:** Express, better-sqlite3
- **AI:** Claude Haiku 4.5 via OpenRouter
- **Karta:** CartoDB Dark Matter

## Projektstruktur

```
server/          — Express-backend
  routes/        — API-endpoints (chat, platser, spelare)
  db/            — SQLite-databas och schema
client/
  src/
    components/  — React-komponenter
    hooks/       — Spellogik och musikhantering
    lib/         — API-klient
  public/
    images/      — AI-genererade bilder (platser, karaktärer, ledtrådar)
    music/       — Originalmusik (10 spår)
data/            — Speldata (JSON)
fakta/           — Research om Palme-mordet
```

## Licens

MIT
