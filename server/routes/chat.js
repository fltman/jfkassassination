const express = require('express');
const { getDb } = require('../db/connection');

const router = express.Router();

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-haiku-4.5';

// POST /api/chat/message — proxies to OpenRouter
router.post('/message', async (req, res) => {
  const { characterId, messages, revealedClueIds = [] } = req.body;

  if (!characterId || !messages) {
    return res.status(400).json({ error: 'characterId and messages required' });
  }

  const apiKey = req.headers['x-openrouter-key'] || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });
  }

  const db = getDb();
  const config = {};
  for (const row of db.prepare('SELECT key, value FROM ai_config').all()) {
    config[row.key] = row.value;
  }

  const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
  if (!char) return res.status(404).json({ error: 'Character not found' });

  const charClues = db.prepare(
    'SELECT clue_id, trigger_condition FROM character_clues WHERE character_id = ?'
  ).all(characterId);

  const unrevealedClues = charClues.filter(c => !revealedClueIds.includes(c.clue_id));

  try {
    const [chatResult, analysisResult] = await Promise.all([
      // Chat call
      callOpenRouter(apiKey, {
        model: MODEL,
        max_tokens: parseInt(config.chatMaxTokens) || 400,
        messages: [
          { role: 'system', content: config.globalChatSystemPrefix + '\n\n' + char.system_prompt },
          ...messages,
        ],
      }),
      // Analysis call (only if unrevealed clues exist)
      unrevealedClues.length > 0
        ? callOpenRouter(apiKey, {
            model: MODEL,
            max_tokens: parseInt(config.analysisMaxTokens) || 300,
            messages: [
              { role: 'system', content: config.analysisSystemPrompt },
              {
                role: 'user',
                content: `Character: ${characterId}

Possible clues NOT yet revealed:
${unrevealedClues.map(c => `- ${c.clue_id}: ${c.trigger_condition}`).join('\n')}

Already revealed clues: ${revealedClueIds.join(', ') || 'none'}

Recent messages in the conversation:
${messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}

Which NEW clues were revealed in the character's latest response?`,
              },
            ],
          })
        : Promise.resolve(null),
    ]);

    // Parse analysis result
    let revealedClues = [];
    if (analysisResult) {
      try {
        const text = analysisResult.choices[0].message.content;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          revealedClues = parsed.revealed_clues || [];
        }
      } catch {
        // Analysis parsing failed — no clues revealed
      }
    }

    res.json({
      message: chatResult.choices[0].message.content,
      revealedClues,
    });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(502).json({ error: 'AI service unavailable' });
  }
});

// POST /api/chat/summarize — summarize a conversation for character description
router.post('/summarize', async (req, res) => {
  const { characterId, messages } = req.body;
  if (!characterId || !messages?.length) return res.status(400).json({ error: 'characterId and messages required' });

  const apiKey = req.headers['x-openrouter-key'] || process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const db = getDb();
  const char = db.prepare('SELECT name, anonymous_name, role FROM characters WHERE id = ?').get(characterId);
  if (!char) return res.status(404).json({ error: 'Character not found' });

  try {
    const result = await callOpenRouter(apiKey, {
      model: MODEL,
      max_tokens: 250,
      messages: [
        {
          role: 'system',
          content: `You summarize witness interviews in a murder investigation. Write a summary (3-5 sentences) of what this witness has told. Focus on who the witness is, what they saw and what they know. Write in third person. Respond ONLY with the summary, nothing else.`,
        },
        {
          role: 'user',
          content: `Character: ${char.name} (${char.role})\n\nConversation:\n${messages.slice(-10).map(m => `${m.role === 'user' ? 'Investigator' : char.name}: ${m.content}`).join('\n')}`,
        },
      ],
    });
    const summary = result.choices[0].message.content.trim();
    res.json({ summary });
  } catch (err) {
    console.error('Summarize error:', err.message);
    res.status(502).json({ error: 'AI service unavailable' });
  }
});

// POST /api/chat/note — summarize a single witness message as a notebook entry
router.post('/note', async (req, res) => {
  const { characterName, message } = req.body;
  if (!characterName || !message) return res.status(400).json({ error: 'characterName and message required' });

  const apiKey = req.headers['x-openrouter-key'] || process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const result = await callOpenRouter(apiKey, {
      model: MODEL,
      max_tokens: 120,
      messages: [
        {
          role: 'system',
          content: `You are an investigator's notebook. Summarize the witness statement in ONE short sentence as a police note. Write in the style of "Witness [name] states that...". Be concrete and factual. Respond ONLY with the note.`,
        },
        {
          role: 'user',
          content: `Witness: ${characterName}\nStatement: ${message}`,
        },
      ],
    });
    const note = result.choices[0].message.content.trim();
    res.json({ note });
  } catch (err) {
    console.error('Note error:', err.message);
    res.status(502).json({ error: 'AI service unavailable' });
  }
});

async function callOpenRouter(apiKey, body) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://dealey-plaza.local',
      'X-Title': 'Dealey Plaza: Minutes After',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${text}`);
  }

  return response.json();
}

module.exports = router;
