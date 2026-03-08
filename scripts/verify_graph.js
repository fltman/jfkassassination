#!/usr/bin/env node
/**
 * verify_graph.js — BFS reachability checker for JFK game data.
 *
 * Usage:
 *   node scripts/verify_graph.js                              # verify base data
 *   node scripts/verify_graph.js data/jfk_expansion.json      # merge expansion & verify
 *
 * Starts BFS from all initially-unlocked locations (Dealey Plaza),
 * walks the clue graph, and reports reachable / orphaned content.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadJSON(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    console.error(`ERROR: File not found: ${abs}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(abs, 'utf-8'));
}

/**
 * Deep-merge an expansion file into the base data.
 * For each top-level object key (locations, characters, clues, clueTypes)
 * we merge entries by ID. Arrays (like location.characters, clue.linkedClues,
 * location.unlockedBy) are concatenated and de-duped.
 */
function mergeData(base, expansion) {
  const merged = JSON.parse(JSON.stringify(base)); // deep clone

  for (const section of ['locations', 'characters', 'clues', 'clueTypes']) {
    if (!expansion[section]) continue;
    if (!merged[section]) merged[section] = {};

    for (const [id, entry] of Object.entries(expansion[section])) {
      if (!merged[section][id]) {
        // New entry — just add it
        merged[section][id] = entry;
      } else {
        // Existing entry — merge fields
        const existing = merged[section][id];
        for (const [key, val] of Object.entries(entry)) {
          if (Array.isArray(val) && Array.isArray(existing[key])) {
            // Concatenate and de-dup arrays
            existing[key] = [...new Set([...existing[key], ...val])];
          } else if (typeof val === 'object' && val !== null && !Array.isArray(val)
                     && typeof existing[key] === 'object' && existing[key] !== null) {
            // Merge sub-objects (e.g. character.clues)
            Object.assign(existing[key], val);
          } else {
            existing[key] = val;
          }
        }
      }
    }
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Validation: check for broken references
// ---------------------------------------------------------------------------

function validateReferences(data) {
  const issues = [];

  // Check that every character referenced by a location exists
  for (const [locId, loc] of Object.entries(data.locations)) {
    for (const charId of (loc.characters || [])) {
      if (!data.characters[charId]) {
        issues.push(`Location "${locId}" references missing character "${charId}"`);
      }
    }
    // Check unlockedBy clues exist
    for (const clueId of (loc.unlockedBy || [])) {
      if (!data.clues[clueId]) {
        issues.push(`Location "${locId}" unlockedBy references missing clue "${clueId}"`);
      }
    }
  }

  // Check that every character's location exists
  for (const [charId, ch] of Object.entries(data.characters)) {
    if (ch.location && !data.locations[ch.location]) {
      issues.push(`Character "${charId}" references missing location "${ch.location}"`);
    }
  }

  // Check that every clue's unlocksLocation exists
  for (const [clueId, clue] of Object.entries(data.clues)) {
    if (clue.unlocksLocation && !data.locations[clue.unlocksLocation]) {
      issues.push(`Clue "${clueId}" unlocksLocation references missing location "${clue.unlocksLocation}"`);
    }
    // Check linkedClues exist
    for (const linked of (clue.linkedClues || [])) {
      if (!data.clues[linked]) {
        issues.push(`Clue "${clueId}" linkedClues references missing clue "${linked}"`);
      }
    }
  }

  // Check that clues referenced in character.clues exist in top-level clues
  for (const [charId, ch] of Object.entries(data.characters)) {
    const clueIds = ch.clues ? Object.keys(ch.clues) : [];
    for (const clueId of clueIds) {
      if (!data.clues[clueId]) {
        issues.push(`Character "${charId}" has clue "${clueId}" not defined in top-level clues`);
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// BFS reachability
// ---------------------------------------------------------------------------

function bfs(data) {
  const visitedLocations = new Set();
  const reachableCharacters = new Set();
  const reachableClues = new Set();

  // Seed: all initially unlocked locations
  const queue = [];
  for (const [id, loc] of Object.entries(data.locations)) {
    if (loc.unlocked) {
      queue.push(id);
      visitedLocations.add(id);
    }
  }

  // Build reverse map: clueId -> locations it can unlock
  const clueUnlocksMap = {};
  for (const [locId, loc] of Object.entries(data.locations)) {
    for (const reqClue of (loc.unlockedBy || [])) {
      if (!clueUnlocksMap[reqClue]) clueUnlocksMap[reqClue] = [];
      clueUnlocksMap[reqClue].push(locId);
    }
  }

  // Helper: check if all unlockedBy clues for a location are obtained
  const canUnlock = (locId) => {
    const loc = data.locations[locId];
    if (!loc) return false;
    return (loc.unlockedBy || []).every(c => reachableClues.has(c));
  };

  let changed = true;
  while (changed) {
    changed = false;
    while (queue.length > 0) {
      changed = true;
      const locId = queue.shift();
      const loc = data.locations[locId];
      if (!loc) continue;

      // Visit all characters at this location
      for (const charId of (loc.characters || [])) {
        reachableCharacters.add(charId);
        const ch = data.characters[charId];
        if (!ch || !ch.clues) continue;

        // Collect clue IDs (clues is an object keyed by clue_id)
        const clueIds = Array.isArray(ch.clues) ? ch.clues : Object.keys(ch.clues);
        for (const clueId of clueIds) {
          if (reachableClues.has(clueId)) continue;
          reachableClues.add(clueId);

          // Check if this clue unlocks new locations (via unlockedBy)
          const targets = clueUnlocksMap[clueId] || [];
          for (const targetLoc of targets) {
            if (!visitedLocations.has(targetLoc) && canUnlock(targetLoc)) {
              visitedLocations.add(targetLoc);
              queue.push(targetLoc);
            }
          }
        }
      }
    }

    // Also check if any not-yet-visited location can now be unlocked
    for (const [locId, loc] of Object.entries(data.locations)) {
      if (!visitedLocations.has(locId) && canUnlock(locId)) {
        visitedLocations.add(locId);
        queue.push(locId);
        changed = true;
      }
    }
  }

  return { visitedLocations, reachableCharacters, reachableClues };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function report(data, result) {
  const { visitedLocations, reachableCharacters, reachableClues } = result;

  const allLocations = Object.keys(data.locations);
  const allCharacters = Object.keys(data.characters);
  const allClues = Object.keys(data.clues);

  const unreachableLocations = allLocations.filter(id => !visitedLocations.has(id));
  const unreachableCharacters = allCharacters.filter(id => !reachableCharacters.has(id));
  const orphanClues = allClues.filter(id => !reachableClues.has(id));

  // Determine clues that exist in top-level but no character can reveal them
  const characterRevealable = new Set();
  for (const ch of Object.values(data.characters)) {
    if (ch.clues) {
      for (const cid of Object.keys(ch.clues)) {
        characterRevealable.add(cid);
      }
    }
  }
  const noCharacterClues = allClues.filter(id => !characterRevealable.has(id));

  console.log('');
  console.log('=== JFK GAME DATA — GRAPH VERIFICATION ===');
  console.log('');

  // Locations
  if (unreachableLocations.length === 0) {
    console.log(`  ALL ${allLocations.length} locations reachable`);
  } else {
    console.log(`  ${visitedLocations.size}/${allLocations.length} locations reachable`);
    console.log(`  UNREACHABLE LOCATIONS (${unreachableLocations.length}):`);
    for (const id of unreachableLocations) {
      const loc = data.locations[id];
      console.log(`    - ${id} ("${loc.name}") — needs: [${(loc.unlockedBy || []).join(', ')}]`);
    }
  }

  // Characters
  if (unreachableCharacters.length === 0) {
    console.log(`  ALL ${allCharacters.length} characters reachable`);
  } else {
    console.log(`  ${reachableCharacters.size}/${allCharacters.length} characters reachable`);
    console.log(`  UNREACHABLE CHARACTERS (${unreachableCharacters.length}):`);
    for (const id of unreachableCharacters) {
      const ch = data.characters[id];
      console.log(`    - ${id} ("${ch.name}") at ${ch.location}`);
    }
  }

  // Clues
  if (orphanClues.length === 0) {
    console.log(`  ALL ${allClues.length} clues obtainable`);
  } else {
    console.log(`  ${reachableClues.size}/${allClues.length} clues obtainable`);
    console.log(`  UNOBTAINABLE CLUES (${orphanClues.length}):`);
    for (const id of orphanClues) {
      const clue = data.clues[id];
      console.log(`    - ${id} ("${clue.title}")${clue.unlocksLocation ? ' -> unlocks ' + clue.unlocksLocation : ''}`);
    }
  }

  // Clues with no character to reveal them
  if (noCharacterClues.length > 0) {
    console.log('');
    console.log(`  WARNING: ${noCharacterClues.length} clue(s) defined but no character can reveal them:`);
    for (const id of noCharacterClues) {
      const clue = data.clues[id];
      console.log(`    - ${id} ("${clue.title}")`);
    }
  }

  console.log('');

  // Final verdict
  const ok = unreachableLocations.length === 0
          && unreachableCharacters.length === 0
          && orphanClues.length === 0;

  if (ok) {
    console.log('  RESULT: PASS — full graph connectivity confirmed.');
  } else {
    console.log('  RESULT: FAIL — orphaned content detected (see above).');
  }
  console.log('');

  return ok;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const baseFile = path.resolve(__dirname, '..', 'data', 'jfk_game_data.json');
  const expansionFile = process.argv[2]
    ? path.resolve(process.argv[2])
    : null;

  console.log(`Loading base data: ${baseFile}`);
  const baseData = loadJSON(baseFile);

  let data = baseData;

  if (expansionFile) {
    console.log(`Loading expansion:  ${expansionFile}`);
    const expansion = loadJSON(expansionFile);
    data = mergeData(baseData, expansion);
    console.log('Merged expansion into base data.');
  }

  // Reference validation
  const refIssues = validateReferences(data);
  if (refIssues.length > 0) {
    console.log('');
    console.log(`  REFERENCE ERRORS (${refIssues.length}):`);
    for (const issue of refIssues) {
      console.log(`    - ${issue}`);
    }
  }

  // BFS
  const result = bfs(data);
  const ok = report(data, result);

  process.exit(ok && refIssues.length === 0 ? 0 : 1);
}

main();
