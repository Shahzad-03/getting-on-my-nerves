import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AXON_HILLOCK } from '../src/engine/board.js';
import { getLegalPlays, applyPlay } from '../src/engine/game.js';
import { newTestGame } from './helpers.js';

// Ana goes first, standing at `position`, holding `hand`. Ben hasn't started.
function setUp(position, hand) {
  const game = newTestGame(['Ana', 'Ben']);
  game.currentPlayer = 0;
  game.players[0].position = position;
  game.players[0].hand = hand;
  game.players[1].position = AXON_HILLOCK;
  return game;
}

function getPlaysOfType(game, type) {
  return getLegalPlays(game).filter((play) => play.type === type);
}

function canEndTurn(game) {
  return getPlaysOfType(game, 'END_TURN').length === 1;
}

// ---------- Choosing to discard ----------

test('you can discard a card you do not want', () => {
  const game = setUp(3, ['NA_OPEN', 'K_OPEN']);
  applyPlay(game, { type: 'DISCARD', card: 'K_OPEN' });
  assert.deepEqual(game.players[0].hand, ['NA_OPEN']);
  assert.ok(game.discards.potential.includes('K_OPEN'));
});

test('at most 2 potential cards and 1 action card per turn', () => {
  const game = setUp(3, ['K_OPEN', 'K_OPEN', 'K_OPEN', 'NA_OPEN', 'LARGE_AXON', 'LARGE_AXON']);
  applyPlay(game, { type: 'DISCARD', card: 'K_OPEN' });
  applyPlay(game, { type: 'DISCARD', card: 'K_OPEN' });
  applyPlay(game, { type: 'DISCARD', card: 'LARGE_AXON' });
  assert.equal(getPlaysOfType(game, 'DISCARD').length, 0);
});

test('two of the same card give one discard option', () => {
  const game = setUp(3, ['K_OPEN', 'K_OPEN']);
  assert.equal(getPlaysOfType(game, 'DISCARD').length, 1);
});

test('the discard limit resets next turn', () => {
  const game = setUp(3, ['K_OPEN', 'K_OPEN', 'NA_OPEN']);
  applyPlay(game, { type: 'DISCARD', card: 'K_OPEN' });
  applyPlay(game, { type: 'DISCARD', card: 'K_OPEN' });
  assert.equal(game.discarded.potential, 2);
  applyPlay(game, { type: 'END_TURN' });
  assert.equal(game.discarded.potential, 0);
});

// ---------- Compulsory discards ----------

test('stuck with your potential cards: you must discard 2 before ending your turn', () => {
  // On the axon hillock with no stimulus: no potential card can be played.
  const game = setUp(AXON_HILLOCK, ['K_OPEN', 'K_OPEN', 'NA_OPEN', 'NA_CLOSED']);
  assert.equal(canEndTurn(game), false);

  applyPlay(game, { type: 'DISCARD', card: 'K_OPEN' });
  assert.equal(canEndTurn(game), false); // still owe 1
  applyPlay(game, { type: 'DISCARD', card: 'NA_CLOSED' });
  assert.equal(canEndTurn(game), true);
});

test('stuck with your action cards: you must discard 1', () => {
  // Nobody is on the P track, so Narrow axon can't be played.
  const game = setUp(3, ['NA_OPEN', 'NARROW_AXON']);
  assert.equal(canEndTurn(game), false);
  applyPlay(game, { type: 'DISCARD', card: 'NARROW_AXON' });
  assert.equal(canEndTurn(game), true);
});

test('no compulsory discard if you could still play the card', () => {
  const game = setUp(3, ['NA_OPEN']); // Na+ open can move you
  assert.equal(canEndTurn(game), true);
});

test('no compulsory discard if you already played from that deck this turn', () => {
  const game = setUp(3, ['NA_OPEN', 'K_OPEN']);
  applyPlay(game, getPlaysOfType(game, 'MOVE')[0]); // play Na+ open
  assert.equal(canEndTurn(game), true); // K+ open is stuck, but you already played
});