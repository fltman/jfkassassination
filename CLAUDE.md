# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Dealey Plaza: Minutes After" — an interactive web-based investigation game about the assassination of President John F. Kennedy on November 22, 1963. The player arrives at the crime scene moments after the shots and investigates by talking to AI-powered witnesses via chat.

## Architecture

Full-stack app: Express backend + React frontend + SQLite database.

### Tech Stack
- **Backend:** Node.js + Express + better-sqlite3
- **Frontend:** React 18 + Vite + Tailwind CSS + Leaflet
- **Database:** SQLite (game data: locations, characters, clues)
- **AI:** OpenRouter API (`anthropic/claude-haiku-4.5`) proxied through backend
- **Map tiles:** CartoDB dark (noir aesthetic)
- **Fonts:** DM Serif Display (headings), JetBrains Mono (body/chat)

### Commands
```bash
npm install && cd client && npm install   # Install all dependencies
npm run db:seed                            # Seed database from JSON
npm run db:reset                           # Drop and re-seed database
npm run dev                                # Start both server (3001) and client (5173)
npm run dev:server                         # Server only
npm run dev:client                         # Client only (Vite)
npm run build                              # Production build (client)
npm start                                  # Production server (serves built client)
```

### Dual-Call AI Architecture
Every player message triggers **two parallel API calls** via `POST /api/chat/message`:
1. **Chat call** — character responds in-character (shown to player)
2. **Analysis call** — hidden engine determines which clues were revealed, returns `{"revealed_clues": ["clue_id"]}`

Both calls happen server-side; the frontend only sees the combined result.

### State Management
Client uses `useReducer` (see `client/src/hooks/useGameState.js`). Views: `intro | map | location | chat | board`. Key state: `unlockedLocationIds`, `revealedClueIds`, `conversations` (per character), `pendingNotifications`.

### Game Progression
Clues unlock new map locations. Locations contain characters. Characters reveal clues through conversation. The clue graph is stored in the database (tables: `clues`, `clue_links`, `location_unlock_clues`, `character_clues`).

Starting location: Dealey Plaza (7 characters). Full chain reaches all 16 locations, 22 characters, and 54 clues.

## Project Structure
```
server/
  index.js              — Express entry point
  routes/api.js         — REST endpoints for locations, characters, clues
  routes/chat.js        — AI chat proxy (dual-call architecture)
  routes/player.js      — Player state management
  db/connection.js      — SQLite connection singleton (jfk.db)
  db/schema.js          — Table definitions
  db/seed.js            — Seeds DB from data/jfk_game_data.json
client/
  src/App.jsx           — Main app, view routing, toolbar
  src/hooks/useGameState.js — Game state reducer
  src/hooks/useMusic.js — Soundtrack handler
  src/lib/api.js        — API client functions
  src/components/
    IntroScreen.jsx     — Title screen + player management
    GameMap.jsx         — Leaflet map centered on Dallas [32.78, -96.81]
    LocationPanel.jsx   — Location detail + character list
    ChatPanel.jsx       — AI chat with character
    ClueLog.jsx         — Revealed clues panel
    InvestigationBoard.jsx — Corkboard with pins/strings/drawing
    Notebook.jsx        — Searchable text notes
    Notifications.jsx   — Toast notifications for new clues
    MusicPlayer.jsx     — Volume control
data/
  jfk_game_data.json    — Source game data (used by seed script)
fakta/
  compass_artifact_*.md — Factual research dossier about the JFK assassination
```

## API Endpoints
- `GET /api/locations` — All locations with unlock requirements
- `GET /api/locations/:id/characters` — Characters at a location
- `GET /api/characters/:id` — Full character data with clue triggers
- `GET /api/clues` — All clues with links
- `GET /api/clue-types` — Clue type definitions
- `GET /api/config` — AI config (model, prompts)
- `POST /api/chat/message` — Send message, get response + revealed clues
- `POST /api/chat/summarize` — AI summary of character conversation
- `POST /api/chat/note` — Convert witness message to police-style note
- `POST /api/player` — Create new player
- `GET /api/player/:id` — Load player state
- `POST /api/player/:id/state` — Save progress
- `GET/POST /api/player/:id/board` — Investigation board state
- `GET/POST /api/player/:id/notebook` — Notes content

## Database Schema
Tables: `locations`, `characters`, `clues`, `clue_links`, `location_unlock_clues`, `character_clues`, `clue_types`, `ai_config`, `players`, `player_state`, `player_conversations`, `player_board`, `player_notebook`. See `server/db/schema.js`.

To add new content: update `data/jfk_game_data.json` and run `npm run db:reset`, or insert directly into SQLite.

## Key Files
- `data/jfk_game_data.json` — Source game data (16 locations, 22 characters, 54 clues)
- `fakta/compass_artifact_*.md` — Factual research dossier about the JFK assassination

## Design
Noir aesthetic: dark backgrounds (#0a0a0f), red (#dc2626) for blood/crime, gold (#d97706) for clues, purple (#7c3aed) for contradictions. Colors defined in `client/tailwind.config.js`.

## Language
All game content and UI text is in **English**. Code and variable names in English.

## Environment
Requires `OPENROUTER_API_KEY` in `.env` (see `.env.example`). Model: `anthropic/claude-haiku-4.5` via OpenRouter.

## Game Data Statistics
| Category | Count |
|----------|-------|
| Locations | 16 |
| Characters | 22 |
| Clues | 54 |
| Clue Types | 13 |
| Starting location | Dealey Plaza (7 witnesses) |

## Key Locations Chain
Dealey Plaza → TSBD, Grassy Knoll, Triple Underpass, Railroad Tower, Parkland Hospital → Rooming House, Bethesda Naval, Love Field → Tippit Scene → Texas Theatre → Dallas Police HQ → Carousel Club, Camp Street 544, Mexico City → Western Union
