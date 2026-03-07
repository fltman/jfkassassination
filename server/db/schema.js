const SCHEMA = `
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  type TEXT NOT NULL,
  unlocked_by_default INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  anonymous_name TEXT NOT NULL DEFAULT 'Okänd',
  role TEXT NOT NULL,
  location_id TEXT NOT NULL REFERENCES locations(id),
  portrait_mood TEXT,
  system_prompt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clues (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  unlocks_location_id TEXT REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS clue_links (
  clue_id TEXT NOT NULL REFERENCES clues(id),
  linked_clue_id TEXT NOT NULL REFERENCES clues(id),
  PRIMARY KEY (clue_id, linked_clue_id)
);

CREATE TABLE IF NOT EXISTS location_unlock_clues (
  location_id TEXT NOT NULL REFERENCES locations(id),
  clue_id TEXT NOT NULL REFERENCES clues(id),
  PRIMARY KEY (location_id, clue_id)
);

CREATE TABLE IF NOT EXISTS character_clues (
  character_id TEXT NOT NULL REFERENCES characters(id),
  clue_id TEXT NOT NULL REFERENCES clues(id),
  trigger_condition TEXT NOT NULL,
  knowledge TEXT,
  PRIMARY KEY (character_id, clue_id)
);

CREATE TABLE IF NOT EXISTS clue_types (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS player_state (
  player_id TEXT PRIMARY KEY REFERENCES players(id),
  unlocked_locations TEXT NOT NULL DEFAULT '[]',
  revealed_clues TEXT NOT NULL DEFAULT '[]',
  revealed_names TEXT NOT NULL DEFAULT '[]',
  character_summaries TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS player_board (
  player_id TEXT PRIMARY KEY REFERENCES players(id),
  data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS player_notebook (
  player_id TEXT PRIMARY KEY REFERENCES players(id),
  content TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS player_conversations (
  player_id TEXT NOT NULL REFERENCES players(id),
  character_id TEXT NOT NULL REFERENCES characters(id),
  messages TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (player_id, character_id)
);
`;

module.exports = SCHEMA;
