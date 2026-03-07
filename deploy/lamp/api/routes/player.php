<?php
require_once __DIR__ . '/../config.php';

function createPlayer(): void {
    $input = jsonInput();
    $name = trim($input['name'] ?? '');
    if (!$name) jsonResponse(['error' => 'name required'], 400);

    $pdo = getDb();
    $id = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));

    $pdo->prepare("INSERT INTO players (id, name) VALUES (?, ?)")->execute([$id, $name]);

    $defaultUnlocked = $pdo->query("SELECT id FROM locations WHERE unlocked_by_default = 1")->fetchAll(PDO::FETCH_COLUMN);

    $pdo->prepare("INSERT INTO player_state (player_id, unlocked_locations, revealed_clues, revealed_names, character_summaries) VALUES (?, ?, '[]', '[]', '{}')")
        ->execute([$id, json_encode($defaultUnlocked)]);

    jsonResponse([
        'id' => $id,
        'name' => $name,
        'unlockedLocations' => $defaultUnlocked,
        'revealedClues' => [],
        'revealedNames' => [],
        'characterSummaries' => new \stdClass(),
    ]);
}

function loadPlayer(string $id): void {
    $pdo = getDb();

    $stmt = $pdo->prepare("SELECT * FROM players WHERE id = ?");
    $stmt->execute([$id]);
    $player = $stmt->fetch();
    if (!$player) jsonResponse(['error' => 'Player not found'], 404);

    $stmt = $pdo->prepare("SELECT * FROM player_state WHERE player_id = ?");
    $stmt->execute([$id]);
    $state = $stmt->fetch();

    $stmt = $pdo->prepare("SELECT character_id, messages FROM player_conversations WHERE player_id = ?");
    $stmt->execute([$id]);
    $convMap = [];
    foreach ($stmt->fetchAll() as $c) {
        $convMap[$c['character_id']] = json_decode($c['messages'], true);
    }

    jsonResponse([
        'id' => $player['id'],
        'name' => $player['name'],
        'unlockedLocations' => json_decode($state['unlocked_locations'] ?? '[]', true),
        'revealedClues' => json_decode($state['revealed_clues'] ?? '[]', true),
        'revealedNames' => json_decode($state['revealed_names'] ?? '[]', true),
        'characterSummaries' => json_decode($state['character_summaries'] ?? '{}', true),
        'conversations' => $convMap,
    ]);
}

function savePlayerState(string $id): void {
    $input = jsonInput();
    $pdo = getDb();

    $pdo->prepare("UPDATE player_state SET unlocked_locations = ?, revealed_clues = ?, revealed_names = ?, character_summaries = ? WHERE player_id = ?")
        ->execute([
            json_encode($input['unlockedLocations'] ?? []),
            json_encode($input['revealedClues'] ?? []),
            json_encode($input['revealedNames'] ?? []),
            json_encode($input['characterSummaries'] ?? new \stdClass()),
            $id,
        ]);

    jsonResponse(['ok' => true]);
}

function saveConversation(string $playerId, string $characterId): void {
    $input = jsonInput();
    $pdo = getDb();

    $pdo->prepare("INSERT INTO player_conversations (player_id, character_id, messages) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE messages = VALUES(messages)")
        ->execute([$playerId, $characterId, json_encode($input['messages'] ?? [])]);

    jsonResponse(['ok' => true]);
}

function loadBoard(string $id): void {
    $pdo = getDb();
    $stmt = $pdo->prepare("SELECT data FROM player_board WHERE player_id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    jsonResponse($row ? json_decode($row['data'], true) : null);
}

function saveBoard(string $id): void {
    $input = jsonInput();
    $data = json_encode($input);
    $pdo = getDb();

    $pdo->prepare("INSERT INTO player_board (player_id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)")
        ->execute([$id, $data]);

    jsonResponse(['ok' => true]);
}

function loadNotebook(string $id): void {
    $pdo = getDb();
    $stmt = $pdo->prepare("SELECT content FROM player_notebook WHERE player_id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    jsonResponse(['content' => $row['content'] ?? '']);
}

function saveNotebook(string $id): void {
    $input = jsonInput();
    $pdo = getDb();

    $pdo->prepare("INSERT INTO player_notebook (player_id, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content)")
        ->execute([$id, $input['content'] ?? '']);

    jsonResponse(['ok' => true]);
}
