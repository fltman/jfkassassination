# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Mordet på Sveavägen" — an interactive web-based investigation game about the assassination of Swedish Prime Minister Olof Palme on February 28, 1986. The player arrives at the crime scene and investigates by talking to AI-powered witnesses via chat.

## Architecture

Full-stack app: Express backend + React frontend + SQLite database.

### Tech Stack
- **Backend:** Node.js + Express + better-sqlite3
- **Frontend:** React 18 + Vite + Tailwind CSS + Leaflet
- **Database:** SQLite (game data: locations, characters, clues)
- **AI:** OpenRouter API (`anthropic/claude-haiku-4.5`) proxied through backend
- **Map tiles:** CartoDB dark (Nordic noir aesthetic)
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
Client uses `useReducer` (see `client/src/hooks/useGameState.js`). Views: `intro | map | location | chat`. Key state: `unlockedLocationIds`, `revealedClueIds`, `conversations` (per character), `pendingNotifications`.

### Game Progression
Clues unlock new map locations. Locations contain characters. Characters reveal clues through conversation. The clue graph is stored in the database (tables: `clues`, `clue_links`, `location_unlock_clues`, `character_clues`).

## Project Structure
```
server/
  index.js              — Express entry point
  routes/api.js         — REST endpoints for locations, characters, clues
  routes/chat.js        — AI chat proxy (Anthropic API)
  db/connection.js      — SQLite connection singleton
  db/schema.js          — Table definitions
  db/seed.js            — Seeds DB from data/palme_game_data_v2.json
client/
  src/App.jsx           — Main app, view routing
  src/hooks/useGameState.js — Game state reducer
  src/lib/api.js        — API client functions
  src/components/
    IntroScreen.jsx     — Cinematic intro with timed text
    GameMap.jsx         — Leaflet map with dynamic markers
    LocationPanel.jsx   — Location detail + character list
    ChatPanel.jsx       — AI chat with character
    ClueLog.jsx         — Revealed clues panel
    Notifications.jsx   — Toast notifications for new clues
data/
  palme_game_data_v2.json — Source game data (used by seed script)
```

## API Endpoints
- `GET /api/locations` — All locations with unlock requirements
- `GET /api/locations/:id/characters` — Characters at a location
- `GET /api/characters/:id` — Full character data with clue triggers
- `GET /api/clues` — All clues with links
- `GET /api/clue-types` — Clue type definitions
- `GET /api/config` — AI config (model, prompts)
- `POST /api/chat/message` — Send message, get response + revealed clues

## Database Schema
Tables: `locations`, `characters`, `clues`, `clue_links`, `location_unlock_clues`, `character_clues`, `clue_types`, `ai_config`. See `server/db/schema.js`.

To add new content: either update `data/palme_game_data_v2.json` and run `npm run db:reset`, or insert directly into SQLite.

## Key Files
- `MORDET_PÅ_SVEAVÄGEN_SPEC.md` — Original game specification (UI design, prompts, clue definitions)
- `data/palme_game_data_v2.json` — Source game data for seeding
- `fakta/compass_artifact_*.md` — Factual research dossier about the Palme assassination

## Design
Nordic noir: dark backgrounds (#0a0a0f), red (#dc2626) for blood/crime, gold (#d97706) for clues, purple (#7c3aed) for contradictions. Colors defined in `client/tailwind.config.js`.

## Language
All game content and UI text is in **Swedish**. Code and variable names in English.

## Environment
Requires `OPENROUTER_API_KEY` in `.env` (see `.env.example`). Model: `anthropic/claude-haiku-4.5` via OpenRouter.
