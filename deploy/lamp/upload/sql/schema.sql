
CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  lat DOUBLE NOT NULL,
  lng DOUBLE NOT NULL,
  type VARCHAR(50) NOT NULL,
  unlocked_by_default TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS characters (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  anonymous_name VARCHAR(255) NOT NULL DEFAULT 'Okänd',
  role VARCHAR(255) NOT NULL,
  location_id VARCHAR(100) NOT NULL,
  portrait_mood TEXT,
  system_prompt TEXT NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clues (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  unlocks_location_id VARCHAR(100),
  FOREIGN KEY (unlocks_location_id) REFERENCES locations(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clue_links (
  clue_id VARCHAR(100) NOT NULL,
  linked_clue_id VARCHAR(100) NOT NULL,
  PRIMARY KEY (clue_id, linked_clue_id),
  FOREIGN KEY (clue_id) REFERENCES clues(id),
  FOREIGN KEY (linked_clue_id) REFERENCES clues(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS location_unlock_clues (
  location_id VARCHAR(100) NOT NULL,
  clue_id VARCHAR(100) NOT NULL,
  PRIMARY KEY (location_id, clue_id),
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (clue_id) REFERENCES clues(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS character_clues (
  character_id VARCHAR(100) NOT NULL,
  clue_id VARCHAR(100) NOT NULL,
  trigger_condition TEXT NOT NULL,
  knowledge TEXT,
  PRIMARY KEY (character_id, clue_id),
  FOREIGN KEY (character_id) REFERENCES characters(id),
  FOREIGN KEY (clue_id) REFERENCES clues(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clue_types (
  id VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL,
  icon VARCHAR(20) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ai_config (
  `key` VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS players (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS player_state (
  player_id VARCHAR(36) PRIMARY KEY,
  unlocked_locations JSON NOT NULL,
  revealed_clues JSON NOT NULL,
  revealed_names JSON NOT NULL,
  character_summaries JSON NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS player_board (
  player_id VARCHAR(36) PRIMARY KEY,
  data JSON NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS player_notebook (
  player_id VARCHAR(36) PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (player_id) REFERENCES players(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS player_conversations (
  player_id VARCHAR(36) NOT NULL,
  character_id VARCHAR(100) NOT NULL,
  messages JSON NOT NULL,
  PRIMARY KEY (player_id, character_id),
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (character_id) REFERENCES characters(id)
) ENGINE=InnoDB;

-- Indexes for performance
CREATE INDEX idx_characters_location ON characters(location_id);
CREATE INDEX idx_clues_type ON clues(type);
CREATE INDEX idx_clues_unlocks ON clues(unlocks_location_id);
CREATE INDEX idx_character_clues_clue ON character_clues(clue_id);
CREATE INDEX idx_clue_links_linked ON clue_links(linked_clue_id);
CREATE INDEX idx_location_unlock_clue ON location_unlock_clues(clue_id);
CREATE INDEX idx_player_conversations_char ON player_conversations(character_id);
