const express = require('express');
const { getDb } = require('../db/connection');

const router = express.Router();

// GET /api/config — AI config (without API key)
router.get('/config', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM ai_config').all();
  const config = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }
  config.hasServerKey = !!process.env.OPENROUTER_API_KEY;
  res.json(config);
});

// GET /api/clue-types
router.get('/clue-types', (req, res) => {
  const db = getDb();
  const types = db.prepare('SELECT * FROM clue_types').all();
  res.json(types);
});

// GET /api/locations
router.get('/locations', (req, res) => {
  const db = getDb();
  const locations = db.prepare('SELECT * FROM locations').all();
  const unlockClues = db.prepare('SELECT * FROM location_unlock_clues').all();

  const unlockMap = {};
  for (const uc of unlockClues) {
    if (!unlockMap[uc.location_id]) unlockMap[uc.location_id] = [];
    unlockMap[uc.location_id].push(uc.clue_id);
  }

  res.json(locations.map(loc => ({
    ...loc,
    coords: [loc.lat, loc.lng],
    unlockedByDefault: !!loc.unlocked_by_default,
    unlockedBy: unlockMap[loc.id] || [],
  })));
});

// GET /api/locations/:id/characters
router.get('/locations/:id/characters', (req, res) => {
  const db = getDb();
  const characters = db.prepare(
    'SELECT id, name, anonymous_name, role, location_id, portrait_mood FROM characters WHERE location_id = ?'
  ).all(req.params.id);
  res.json(characters);
});

// GET /api/characters/:id — full character data for chat
router.get('/characters/:id', (req, res) => {
  const db = getDb();
  const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);
  if (!char) return res.status(404).json({ error: 'Character not found' });

  const clues = db.prepare(
    'SELECT clue_id, trigger_condition, knowledge FROM character_clues WHERE character_id = ?'
  ).all(req.params.id);

  res.json({
    ...char,
    clues: clues.map(c => ({
      clueId: c.clue_id,
      triggerCondition: c.trigger_condition,
      knowledge: c.knowledge,
    })),
  });
});

// GET /api/clues
router.get('/clues', (req, res) => {
  const db = getDb();
  const clues = db.prepare('SELECT * FROM clues').all();
  const links = db.prepare('SELECT * FROM clue_links').all();

  const linkMap = {};
  for (const link of links) {
    if (!linkMap[link.clue_id]) linkMap[link.clue_id] = [];
    linkMap[link.clue_id].push(link.linked_clue_id);
  }

  res.json(clues.map(clue => ({
    ...clue,
    unlocksLocation: clue.unlocks_location_id,
    linkedClues: linkMap[clue.id] || [],
  })));
});

// GET /api/clues/:id
router.get('/clues/:id', (req, res) => {
  const db = getDb();
  const clue = db.prepare('SELECT * FROM clues WHERE id = ?').get(req.params.id);
  if (!clue) return res.status(404).json({ error: 'Clue not found' });

  const links = db.prepare('SELECT linked_clue_id FROM clue_links WHERE clue_id = ?').all(req.params.id);

  res.json({
    ...clue,
    unlocksLocation: clue.unlocks_location_id,
    linkedClues: links.map(l => l.linked_clue_id),
  });
});

module.exports = router;
