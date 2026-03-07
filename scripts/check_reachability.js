const d = require('../data/palme_game_data_v2.json');

const visited = new Set();
const reachableChars = new Set();
const reachableClues = new Set();

const queue = Object.entries(d.locations)
  .filter(([id, l]) => l.unlocked)
  .map(([id]) => id);
queue.forEach(id => visited.add(id));

while (queue.length > 0) {
  const locId = queue.shift();
  const loc = d.locations[locId];
  if (!loc || !loc.characters) continue;

  for (const charId of loc.characters) {
    reachableChars.add(charId);
    const ch = d.characters[charId];
    if (!ch || !ch.clues) continue;

    const clueIds = Array.isArray(ch.clues) ? ch.clues : Object.keys(ch.clues);
    for (const clueId of clueIds) {
      reachableClues.add(clueId);
      const clue = d.clues[clueId];
      if (clue && clue.unlocksLocation && !visited.has(clue.unlocksLocation)) {
        visited.add(clue.unlocksLocation);
        queue.push(clue.unlocksLocation);
      }
    }
  }
}

const allLocs = Object.keys(d.locations);
const allChars = Object.keys(d.characters);
const allClues = Object.keys(d.clues);

const unreachableLocs = allLocs.filter(id => !visited.has(id));
const unreachableChars = allChars.filter(id => !reachableChars.has(id));
const orphanClues = allClues.filter(id => !reachableClues.has(id));

console.log(`Reachable: ${visited.size}/${allLocs.length} locations, ${reachableChars.size}/${allChars.length} characters, ${reachableClues.size}/${allClues.length} clues`);
if (unreachableLocs.length) console.log('UNREACHABLE LOCATIONS:', unreachableLocs);
if (unreachableChars.length) console.log('UNREACHABLE CHARACTERS:', unreachableChars);
if (orphanClues.length) console.log('ORPHAN CLUES:', orphanClues);
if (!unreachableLocs.length && !unreachableChars.length && !orphanClues.length) {
  console.log('✅ All content is reachable!');
}
