<?php
require_once __DIR__ . '/../config.php';

function getLocations(): void {
    $pdo = getDb();
    $locations = $pdo->query("SELECT * FROM locations")->fetchAll();

    $unlockClues = $pdo->query("SELECT * FROM location_unlock_clues")->fetchAll();
    $unlockMap = [];
    foreach ($unlockClues as $uc) {
        $unlockMap[$uc['location_id']][] = $uc['clue_id'];
    }

    $result = [];
    foreach ($locations as $loc) {
        $loc['unlocked_by_default'] = (bool)$loc['unlocked_by_default'];
        $loc['unlockedBy'] = $unlockMap[$loc['id']] ?? [];
        $result[] = $loc;
    }
    jsonResponse($result);
}

function getLocationCharacters(string $locationId): void {
    $pdo = getDb();
    $stmt = $pdo->prepare("SELECT id, name, anonymous_name, role, location_id, portrait_mood FROM characters WHERE location_id = ?");
    $stmt->execute([$locationId]);
    jsonResponse($stmt->fetchAll());
}

function getCharacter(string $characterId): void {
    $pdo = getDb();
    $stmt = $pdo->prepare("SELECT * FROM characters WHERE id = ?");
    $stmt->execute([$characterId]);
    $char = $stmt->fetch();

    if (!$char) jsonResponse(['error' => 'Character not found'], 404);

    $stmt = $pdo->prepare("SELECT clue_id, trigger_condition, knowledge FROM character_clues WHERE character_id = ?");
    $stmt->execute([$characterId]);
    $char['clues'] = $stmt->fetchAll();

    jsonResponse($char);
}

function getClues(): void {
    $pdo = getDb();
    $clues = $pdo->query("SELECT * FROM clues")->fetchAll();

    $links = $pdo->query("SELECT * FROM clue_links")->fetchAll();
    $linkMap = [];
    foreach ($links as $l) {
        $linkMap[$l['clue_id']][] = $l['linked_clue_id'];
    }

    foreach ($clues as &$clue) {
        $clue['linkedClues'] = $linkMap[$clue['id']] ?? [];
    }
    jsonResponse($clues);
}

function getClueTypes(): void {
    $pdo = getDb();
    jsonResponse($pdo->query("SELECT * FROM clue_types")->fetchAll());
}

function getConfig(): void {
    $pdo = getDb();
    $rows = $pdo->query("SELECT `key`, value FROM ai_config")->fetchAll();
    $config = [];
    foreach ($rows as $r) $config[$r['key']] = $r['value'];
    $config['hasServerKey'] = !!OPENROUTER_API_KEY;
    jsonResponse($config);
}
