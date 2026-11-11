import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POTENTIAL, ACTION } from '../src/engine/cards.js';
import { AXON_HILLOCK } from '../src/engine/board.js';
import { createGame, buildDeck, shuffle, countInHand } from '../src/engine/game.js';

// Count every card in the game: both decks, both discard piles and every hand.
function countAllCards(game) {
  let total = game.decks.potential.length + game.decks.action.length;
  total = total + game.discards.potential.length + game.discards.action.length;
  for (const player of game.players) {
    total = total + player.hand.length;
  }
  return total;
}

test('buildDeck makes the full decks', () => {
  assert.equal(buildDeck(POTENTIAL).length, 122);
  assert.equal(buildDeck(ACTION).length, 62);
});

test('shuffle keeps the same cards, just in a different order', () => {
  const deck = buildDeck(POTENTIAL);
  const shuffled = shuffle(buildDeck(POTENTIAL));
  assert.equal(shuffled.length, deck.length);
  assert.deepEqual([...shuffled].sort(), [...deck].sort());
});

test('each player is dealt 4 potential and 2 action cards', () => {
  const game = createGame([{ name: 'Ana' }, { name: 'Ben' }, { name: 'Cat' }]);
  for (const player of game.players) {
    assert.equal(countInHand(player, POTENTIAL), 4);
    assert.equal(countInHand(player, ACTION), 2);
  }
});

test('dealt cards are taken out of the decks, and no card is lost', () => {
  const game = createGame([{ name: 'Ana' }, { name: 'Ben' }]);
  assert.equal(game.decks.potential.length, 122 - 8);
  assert.equal(game.decks.action.length, 62 - 4);
  assert.equal(countAllCards(game), 184);
});

test('everyone starts on the axon hillock', () => {
  const game = createGame([{ name: 'Ana' }, { name: 'Computer', isComputer: true }]);
  for (const player of game.players) {
    assert.equal(player.position, AXON_HILLOCK);
  }
  assert.equal(game.players[1].isComputer, true);
  assert.equal(game.players[0].isComputer, false);
});

test('the first player is one of the players', () => {
  const game = createGame([{ name: 'Ana' }, { name: 'Ben' }]);
  assert.ok(game.currentPlayer >= 0 && game.currentPlayer < 2);
});

test('a game needs 2 to 6 players', () => {
  assert.throws(() => createGame([{ name: 'Ana' }]));
  const seven = [];
  for (let i = 0; i < 7; i++) seven.push({ name: 'P' + i });
  assert.throws(() => createGame(seven));
});