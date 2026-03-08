<?php
/**
 * Configuration — edit these values for your server
 */

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'your_database');
define('DB_USER', getenv('DB_USER') ?: 'your_user');
define('DB_PASS', getenv('DB_PASS') ?: 'your_password');
define('OPENROUTER_API_KEY', getenv('OPENROUTER_API_KEY') ?: '');
define('AI_MODEL', 'anthropic/claude-haiku-4.5');

function getDb(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

function jsonResponse($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonInput(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

function getApiKey(): string {
    return $_SERVER['HTTP_X_OPENROUTER_KEY'] ?? OPENROUTER_API_KEY;
}

function callOpenRouter(array $body, ?string $apiKey = null): array {
    $key = $apiKey ?? getApiKey();
    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $key,
            'HTTP-Referer: https://jfkassassination.local',
            'X-Title: JFK Assassination Investigation',
        ],
        CURLOPT_POSTFIELDS => json_encode($body),
        CURLOPT_TIMEOUT => 30,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception("OpenRouter error: $httpCode — $response");
    }
    return json_decode($response, true);
}
