#!/usr/bin/env php
<?php
/**
 * Seeds the MySQL database from palme_game_data_v2.json
 * Usage: php seed.php
 */

require_once __DIR__ . '/../api/config.php';

$dataFile = __DIR__ . '/../../../data/palme_game_data_v2.json';
if (!file_exists($dataFile)) {
    // Try relative to deploy dir
    $dataFile = __DIR__ . '/../../data/palme_game_data_v2.json';
}
if (!file_exists($dataFile)) {
    die("Error: palme_game_data_v2.json not found\n");
}

$data = json_decode(file_get_contents($dataFile), true);
if (!$data) die("Error: Could not parse JSON\n");

$pdo = getDb();

// Truncate in reverse dependency order
$pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
$tables = ['character_clues', 'clue_links', 'location_unlock_clues', 'characters', 'clues', 'locations', 'clue_types', 'ai_config'];
foreach ($tables as $t) {
    $pdo->exec("TRUNCATE TABLE $t");
}
$pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

// Seed ai_config
$stmt = $pdo->prepare("INSERT INTO ai_config (`key`, value) VALUES (?, ?)");
$stmt->execute(['chatModel', $data['aiConfig']['chatModel']]);
$stmt->execute(['analysisModel', $data['aiConfig']['analysisModel']]);
$stmt->execute(['chatMaxTokens', (string)$data['aiConfig']['chatMaxTokens']]);
$stmt->execute(['analysisMaxTokens', (string)$data['aiConfig']['analysisMaxTokens']]);
$stmt->execute(['globalChatSystemPrefix', $data['aiConfig']['globalChatSystemPrefix']]);
$stmt->execute(['analysisSystemPrompt', $data['aiConfig']['analysisSystemPrompt']]);

// Seed clue_types
$stmt = $pdo->prepare("INSERT INTO clue_types (id, label, color, icon) VALUES (?, ?, ?, ?)");
foreach ($data['clueTypes'] as $id => $ct) {
    $stmt->execute([$id, $ct['label'], $ct['color'], $ct['icon']]);
}

// Seed locations
$stmt = $pdo->prepare("INSERT INTO locations (id, name, description, lat, lng, type, unlocked_by_default) VALUES (?, ?, ?, ?, ?, ?, ?)");
foreach ($data['locations'] as $id => $loc) {
    $stmt->execute([$id, $loc['name'], $loc['description'], $loc['coords'][0], $loc['coords'][1], $loc['type'], $loc['unlocked'] ? 1 : 0]);
}

// Seed clues
$stmt = $pdo->prepare("INSERT INTO clues (id, title, description, type, unlocks_location_id) VALUES (?, ?, ?, ?, ?)");
foreach ($data['clues'] as $id => $clue) {
    $stmt->execute([$id, $clue['title'], $clue['description'], $clue['type'], $clue['unlocksLocation'] ?? null]);
}

// Seed clue_links
$stmt = $pdo->prepare("INSERT INTO clue_links (clue_id, linked_clue_id) VALUES (?, ?)");
foreach ($data['clues'] as $id => $clue) {
    foreach ($clue['linkedClues'] ?? [] as $linked) {
        $stmt->execute([$id, $linked]);
    }
}

// Seed location_unlock_clues
$stmt = $pdo->prepare("INSERT INTO location_unlock_clues (location_id, clue_id) VALUES (?, ?)");
foreach ($data['locations'] as $id => $loc) {
    foreach ($loc['unlockedBy'] ?? [] as $clueId) {
        $stmt->execute([$id, $clueId]);
    }
}

// Seed characters
$stmtChar = $pdo->prepare("INSERT INTO characters (id, name, anonymous_name, role, location_id, portrait_mood, system_prompt) VALUES (?, ?, ?, ?, ?, ?, ?)");
$stmtClue = $pdo->prepare("INSERT INTO character_clues (character_id, clue_id, trigger_condition, knowledge) VALUES (?, ?, ?, ?)");
foreach ($data['characters'] as $id => $char) {
    $stmtChar->execute([$id, $char['name'], $char['anonymousName'] ?? 'Okänd', $char['role'], $char['location'], $char['portrait_mood'], $char['systemPrompt']]);
    foreach ($char['clues'] ?? [] as $clueId => $clueData) {
        $stmtClue->execute([$id, $clueId, $clueData['triggerCondition'], $clueData['knowledge'] ?? null]);
    }
}

echo "Database seeded successfully!\n";
echo "  " . count($data['locations']) . " locations\n";
echo "  " . count($data['characters']) . " characters\n";
echo "  " . count($data['clues']) . " clues\n";
echo "  " . count($data['clueTypes']) . " clue types\n";
