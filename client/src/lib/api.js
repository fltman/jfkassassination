const BASE = '/api';

export async function fetchLocations() {
  const res = await fetch(`${BASE}/locations`);
  return res.json();
}

export async function fetchCharactersAtLocation(locationId) {
  const res = await fetch(`${BASE}/locations/${locationId}/characters`);
  return res.json();
}

export async function fetchCharacter(characterId) {
  const res = await fetch(`${BASE}/characters/${characterId}`);
  return res.json();
}

export async function fetchClues() {
  const res = await fetch(`${BASE}/clues`);
  return res.json();
}

export async function fetchClueTypes() {
  const res = await fetch(`${BASE}/clue-types`);
  return res.json();
}

export async function fetchConfig() {
  const res = await fetch(`${BASE}/config`);
  return res.json();
}

export async function sendMessage(characterId, messages, revealedClueIds) {
  const res = await fetch(`${BASE}/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, messages, revealedClueIds }),
  });
  if (!res.ok) {
    throw new Error('Chat request failed');
  }
  return res.json();
}

export async function createPlayer(name) {
  const res = await fetch(`${BASE}/player`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function loadPlayer(playerId) {
  const res = await fetch(`${BASE}/player/${playerId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function savePlayerState(playerId, state) {
  await fetch(`${BASE}/player/${playerId}/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
}

export async function saveConversation(playerId, characterId, messages) {
  await fetch(`${BASE}/player/${playerId}/conversation/${characterId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
}

export async function loadBoard(playerId) {
  const res = await fetch(`${BASE}/player/${playerId}/board`);
  if (!res.ok) return null;
  return res.json();
}

export async function saveBoard(playerId, data) {
  await fetch(`${BASE}/player/${playerId}/board`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function loadNotebook(playerId) {
  const res = await fetch(`${BASE}/player/${playerId}/notebook`);
  if (!res.ok) return '';
  const data = await res.json();
  return data.content || '';
}

export async function saveNotebook(playerId, content) {
  await fetch(`${BASE}/player/${playerId}/notebook`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

export async function generateNote(characterName, message) {
  const res = await fetch(`${BASE}/chat/note`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterName, message }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.note;
}

export async function summarizeConversation(characterId, messages) {
  const res = await fetch(`${BASE}/chat/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, messages }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.summary;
}
