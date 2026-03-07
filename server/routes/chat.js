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

  const apiKey = process.env.OPENROUTER_API_KEY;
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
                content: `Karaktär: ${characterId}

Möjliga ledtrådar som INTE redan är avslöjade:
${unrevealedClues.map(c => `- ${c.clue_id}: ${c.trigger_condition}`).join('\n')}

Redan avslöjade ledtrådar: ${revealedClueIds.join(', ') || 'inga'}

Senaste meddelanden i konversationen:
${messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}

Vilka NYA ledtrådar avslöjades i karaktärens senaste svar?`,
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

  const apiKey = process.env.OPENROUTER_API_KEY;
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
          content: `Du sammanfattar vittnesförhör i en mordutredning. Skriv en sammanfattning (3-5 meningar) av vad detta vittne har berättat. Fokusera på vem vittnet är, vad de sett och vad de vet. Skriv i tredje person. Svara BARA med sammanfattningen, inget annat.`,
        },
        {
          role: 'user',
          content: `Karaktär: ${char.name} (${char.role})\n\nKonversation:\n${messages.slice(-10).map(m => `${m.role === 'user' ? 'Utredare' : char.name}: ${m.content}`).join('\n')}`,
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

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const result = await callOpenRouter(apiKey, {
      model: MODEL,
      max_tokens: 120,
      messages: [
        {
          role: 'system',
          content: `Du är en utredares anteckningsbok. Sammanfatta vittnets uttalande i EN kort mening som en polisanteckning. Skriv i stil med "Vittnet [namn] uppger att...". Var konkret och saklig. Svara BARA med anteckningen.`,
        },
        {
          role: 'user',
          content: `Vittne: ${characterName}\nUttalande: ${message}`,
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
      'HTTP-Referer': 'https://mordet-pa-sveavagen.local',
      'X-Title': 'Mordet på Sveavägen',
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
