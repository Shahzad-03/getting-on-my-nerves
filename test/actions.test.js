import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AXON_HILLOCK, START, THRESHOLD } from '../src/engine/board.js';
import { getLegalPlays, applyPlay } from '../src/engine/game.js';
import { newTestGame } from './helpers.js';

// Ana (player 0) goes first. Set where everyone stands and what Ana holds.
// positions is a list, one per player, e.g. [3, 5] means Ana on 3, Ben on 5.
function setUp(positions, anasHand) {
  const names = ['Ana', 'Ben', 'Cat'].slice(0, positions.length);
  const game = newTestGame(names);
  game.currentPlayer = 0;
  for (let i = 0; i < positions.length; i++) {
    game.players[i].position = positions[i];
  }
  game.players[0].hand = anasHand;
  return game;
}

function getPlaysOfType(game, type) {
  return getLegalPlays(game).filter((play) => play.type === type);
}

function findCaffeine(game) {
  return getPlaysOfType(game, 'MOVE').find((play) => play.cards.includes('CAFFEINE'));
}

// ---------- Caffeine ----------

test('caffeine moves you 2 spaces before threshold', () => {
  const game = setUp([2, AXON_HILLOCK], ['CAFFEINE']);
  applyPlay(game, findCaffeine(game));
  assert.equal(game.players[0].position, 4);
});

test('caffeine never takes you past -55 mV', () => {
  const game = setUp([THRESHOLD - 1, AXON_HILLOCK], ['CAFFEINE']); // on -56
  applyPlay(game, findCaffeine(game));
  assert.equal(game.players[0].position, THRESHOLD); // stops on -55
});

test('caffeine cannot be played before starting, at threshold, or after it', () => {
  for (const position of [AXON_HILLOCK, THRESHOLD, THRESHOLD + 2]) {
    const game = setUp([position, AXON_HILLOCK], ['CAFFEINE']);
    assert.equal(findCaffeine(game), undefined, 'position ' + position);
  }
});

// ---------- Alcohol ----------

test('alcohol sends an opponent back 2 spaces', () => {
  const game = setUp([3, 5], ['ALCOHOL']);
  applyPlay(game, { type: 'ATTACK', card: 'ALCOHOL', target: 1 });
  assert.equal(game.players[1].position, 3);
  assert.ok(!game.players[0].hand.includes('ALCOHOL'));
  assert.ok(game.discards.action.includes('ALCOHOL'));
});

test('alcohol never sends anyone behind START', () => {
  const game = setUp([3, 1], ['ALCOHOL']); // Ben on -68
  applyPlay(game, { type: 'ATTACK', card: 'ALCOHOL', target: 1 });
  assert.equal(game.players[1].position, START);
});

test('alcohol only works on opponents between START and threshold', () => {
  for (const position of [AXON_HILLOCK, START, THRESHOLD, THRESHOLD + 3]) {
    const game = setUp([3, position], ['ALCOHOL']);
    assert.equal(getPlaysOfType(game, 'ATTACK').length, 0, 'position ' + position);
  }
});

test('you cannot play alcohol on yourself', () => {
  const game = setUp([3, AXON_HILLOCK], ['ALCOHOL']);
  assert.equal(getPlaysOfType(game, 'ATTACK').length, 0);
});

test('with 3 players you can choose which opponent to hit', () => {
  const game = setUp([3, 4, 6], ['ALCOHOL']);
  const targets = getPlaysOfType(game, 'ATTACK').map((play) => play.target);
  assert.deepEqual(targets, [1, 2]);
});