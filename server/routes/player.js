const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../db/connection');

const router = express.Router();

// POST /api/player — create new player
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });

  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO players (id, name) VALUES (?, ?)').run(id, name.trim());

  const defaultUnlocked = db.prepare(
    'SELECT id FROM locations WHERE unlocked_by_default = 1'
  ).all().map(r => r.id);

  db.prepare(
    'INSERT INTO player_state (player_id, unlocked_locations) VALUES (?, ?)'
  ).run(id, JSON.stringify(defaultUnlocked));

  res.json({ id, name: name.trim(), unlockedLocations: defaultUnlocked, revealedClues: [], revealedNames: [], characterSummaries: {} });
});

// GET /api/player/:id — load player state
router.get('/:id', (req, res) => {
  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const state = db.prepare('SELECT * FROM player_state WHERE player_id = ?').get(req.params.id);
  const conversations = db.prepare('SELECT character_id, messages FROM player_conversations WHERE player_id = ?').all(req.params.id);

  const convMap = {};
  for (const c of conversations) {
    convMap[c.character_id] = JSON.parse(c.messages);
  }

  res.json({
    id: player.id,
    name: player.name,
    unlockedLocations: JSON.parse(state?.unlocked_locations || '[]'),
    revealedClues: JSON.parse(state?.revealed_clues || '[]'),
    revealedNames: JSON.parse(state?.revealed_names || '[]'),
    characterSummaries: JSON.parse(state?.character_summaries || '{}'),
    conversations: convMap,
  });
});

// POST /api/player/:id/state — save player state
router.post('/:id/state', (req, res) => {
  const { unlockedLocations, revealedClues, revealedNames, characterSummaries } = req.body;
  const db = getDb();

  db.prepare(`
    UPDATE player_state SET
      unlocked_locations = ?,
      revealed_clues = ?,
      revealed_names = ?,
      character_summaries = ?
    WHERE player_id = ?
  `).run(
    JSON.stringify(unlockedLocations || []),
    JSON.stringify(revealedClues || []),
    JSON.stringify(revealedNames || []),
    JSON.stringify(characterSummaries || {}),
    req.params.id
  );

  res.json({ ok: true });
});

// POST /api/player/:id/conversation/:characterId — save conversation
router.post('/:id/conversation/:characterId', (req, res) => {
  const { messages } = req.body;
  const db = getDb();

  db.prepare(`
    INSERT INTO player_conversations (player_id, character_id, messages)
    VALUES (?, ?, ?)
    ON CONFLICT(player_id, character_id) DO UPDATE SET messages = ?
  `).run(req.params.id, req.params.characterId, JSON.stringify(messages), JSON.stringify(messages));

  res.json({ ok: true });
});

// GET /api/player/:id/board — load investigation board
router.get('/:id/board', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT data FROM player_board WHERE player_id = ?').get(req.params.id);
  res.json(row ? JSON.parse(row.data) : null);
});

// POST /api/player/:id/board — save investigation board
router.post('/:id/board', (req, res) => {
  const db = getDb();
  db.prepare(`
    INSERT INTO player_board (player_id, data) VALUES (?, ?)
    ON CONFLICT(player_id) DO UPDATE SET data = ?
  `).run(req.params.id, JSON.stringify(req.body), JSON.stringify(req.body));
  res.json({ ok: true });
});

// GET /api/player/:id/notebook — load notebook
router.get('/:id/notebook', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT content FROM player_notebook WHERE player_id = ?').get(req.params.id);
  res.json({ content: row?.content || '' });
});

// POST /api/player/:id/notebook — save notebook
router.post('/:id/notebook', (req, res) => {
  const db = getDb();
  db.prepare(`
    INSERT INTO player_notebook (player_id, content) VALUES (?, ?)
    ON CONFLICT(player_id) DO UPDATE SET content = ?
  `).run(req.params.id, req.body.content || '', req.body.content || '');
  res.json({ ok: true });
});

module.exports = router;
