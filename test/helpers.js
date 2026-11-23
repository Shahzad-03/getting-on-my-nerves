// helpers.js
// Shared set-up for the tests.

import { createGame } from '../src/engine/game.js';

// Make a game for testing, with these player names, e.g. newTestGame(['Ana', 'Ben']).
// Tetrodotoxin is random, and could knock a player out in the middle of a test about
// something else. So: if anyone is knocked out while dealing, deal again, and then
// take the Tetrodotoxin cards out of the deck.
// (Tetrodotoxin has its own tests, which use createGame directly.)
export function newTestGame(names) {
  const players = names.map((name) => ({ name: name }));
  let game = createGame(players);
  while (game.players.some((player) => player.eliminated)) {
    game = createGame(players);
  }
  game.decks.action = game.decks.action.filter((card) => card !== 'TETRODOTOXIN');
  return game;
}