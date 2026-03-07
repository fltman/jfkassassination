<?php
require_once __DIR__ . '/../config.php';

function chatMessage(): void {
    $input = jsonInput();
    $characterId = $input['characterId'] ?? null;
    $messages = $input['messages'] ?? null;
    $revealedClueIds = $input['revealedClueIds'] ?? [];

    if (!$characterId || !$messages) jsonResponse(['error' => 'characterId and messages required'], 400);
    if (!OPENROUTER_API_KEY) jsonResponse(['error' => 'API key not configured'], 500);

    $pdo = getDb();

    // Load config
    $config = [];
    foreach ($pdo->query("SELECT `key`, value FROM ai_config")->fetchAll() as $r) {
        $config[$r['key']] = $r['value'];
    }

    // Load character
    $stmt = $pdo->prepare("SELECT * FROM characters WHERE id = ?");
    $stmt->execute([$characterId]);
    $char = $stmt->fetch();
    if (!$char) jsonResponse(['error' => 'Character not found'], 404);

    // Load character clues
    $stmt = $pdo->prepare("SELECT clue_id, trigger_condition FROM character_clues WHERE character_id = ?");
    $stmt->execute([$characterId]);
    $charClues = $stmt->fetchAll();

    $unrevealedClues = array_filter($charClues, fn($c) => !in_array($c['clue_id'], $revealedClueIds));

    // Chat call
    $chatPromise = callOpenRouter([
        'model' => AI_MODEL,
        'max_tokens' => (int)($config['chatMaxTokens'] ?? 400),
        'messages' => array_merge(
            [['role' => 'system', 'content' => $config['globalChatSystemPrefix'] . "\n\n" . $char['system_prompt']]],
            $messages
        ),
    ]);

    $revealedClues = [];

    // Analysis call (only if unrevealed clues exist)
    if (!empty($unrevealedClues)) {
        $clueList = implode("\n", array_map(fn($c) => "- {$c['clue_id']}: {$c['trigger_condition']}", $unrevealedClues));
        $revealedList = implode(', ', $revealedClueIds) ?: 'inga';
        $recentMsgs = implode("\n", array_map(fn($m) => "{$m['role']}: {$m['content']}", array_slice($messages, -6)));

        try {
            $analysisResult = callOpenRouter([
                'model' => AI_MODEL,
                'max_tokens' => (int)($config['analysisMaxTokens'] ?? 300),
                'messages' => [
                    ['role' => 'system', 'content' => $config['analysisSystemPrompt']],
                    ['role' => 'user', 'content' => "Karaktär: $characterId\n\nMöjliga ledtrådar som INTE redan är avslöjade:\n$clueList\n\nRedan avslöjade ledtrådar: $revealedList\n\nSenaste meddelanden i konversationen:\n$recentMsgs\n\nVilka NYA ledtrådar avslöjades i karaktärens senaste svar?"],
                ],
            ]);

            $text = $analysisResult['choices'][0]['message']['content'] ?? '';
            if (preg_match('/\{[\s\S]*\}/', $text, $jsonMatch)) {
                $parsed = json_decode($jsonMatch[0], true);
                $revealedClues = $parsed['revealed_clues'] ?? [];
            }
        } catch (Exception $e) {
            // Analysis failed — no clues revealed
        }
    }

    jsonResponse([
        'message' => $chatPromise['choices'][0]['message']['content'],
        'revealedClues' => $revealedClues,
    ]);
}

function chatSummarize(): void {
    $input = jsonInput();
    $characterId = $input['characterId'] ?? null;
    $messages = $input['messages'] ?? null;

    if (!$characterId || empty($messages)) jsonResponse(['error' => 'characterId and messages required'], 400);
    if (!OPENROUTER_API_KEY) jsonResponse(['error' => 'API key not configured'], 500);

    $pdo = getDb();
    $stmt = $pdo->prepare("SELECT name, anonymous_name, role FROM characters WHERE id = ?");
    $stmt->execute([$characterId]);
    $char = $stmt->fetch();
    if (!$char) jsonResponse(['error' => 'Character not found'], 404);

    $recentMsgs = implode("\n", array_map(
        fn($m) => ($m['role'] === 'user' ? 'Utredare' : $char['name']) . ": {$m['content']}",
        array_slice($messages, -10)
    ));

    $result = callOpenRouter([
        'model' => AI_MODEL,
        'max_tokens' => 250,
        'messages' => [
            ['role' => 'system', 'content' => 'Du sammanfattar vittnesförhör i en mordutredning. Skriv en sammanfattning (3-5 meningar) av vad detta vittne har berättat. Fokusera på vem vittnet är, vad de sett och vad de vet. Skriv i tredje person. Svara BARA med sammanfattningen, inget annat.'],
            ['role' => 'user', 'content' => "Karaktär: {$char['name']} ({$char['role']})\n\nKonversation:\n$recentMsgs"],
        ],
    ]);

    jsonResponse(['summary' => trim($result['choices'][0]['message']['content'])]);
}

function chatNote(): void {
    $input = jsonInput();
    $characterName = $input['characterName'] ?? null;
    $message = $input['message'] ?? null;

    if (!$characterName || !$message) jsonResponse(['error' => 'characterName and message required'], 400);
    if (!OPENROUTER_API_KEY) jsonResponse(['error' => 'API key not configured'], 500);

    $result = callOpenRouter([
        'model' => AI_MODEL,
        'max_tokens' => 120,
        'messages' => [
            ['role' => 'system', 'content' => 'Du är en utredares anteckningsbok. Sammanfatta vittnets uttalande i EN kort mening som en polisanteckning. Skriv i stil med "Vittnet [namn] uppger att...". Var konkret och saklig. Svara BARA med anteckningen.'],
            ['role' => 'user', 'content' => "Vittne: $characterName\nUttalande: $message"],
        ],
    ]);

    jsonResponse(['note' => trim($result['choices'][0]['message']['content'])]);
}
