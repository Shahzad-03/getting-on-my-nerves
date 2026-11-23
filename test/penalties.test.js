import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCurrentPlayer, getLegalPlays, applyPlay } from '../src/engine/game.js';
import { newTestGame } from './helpers.js';

// Some positions on the board, by colour.
const PINK_SPACE = 4;
const PEACH_SPACE = 10;
const MAGENTA_SPACE = 15;
const BLUE_SPACE = 22;
const REST_SPACE = 28;
const P_SPACE = 33;

// Ana (player 0) goes first, holding anasHand. Ben stands on bensPosition.
function setUp(anasHand, bensPosition) {
    const game = newTestGame(['Ana', 'Ben']);
  game.currentPlayer = 0;
  game.players[0].position = PINK_SPACE;
  game.players[0].hand = anasHand;
  game.players[1].position = bensPosition;
  return game;
}

function getAttacks(game) {
  return getLegalPlays(game).filter((play) => play.type === 'ATTACK');
}

// ---------- Which cards hit where ----------

test('absolute refractory period hits peach or magenta only', () => {
  for (const [position, canHit] of [[PEACH_SPACE, true], [MAGENTA_SPACE, true], [PINK_SPACE, false], [BLUE_SPACE, false]]) {
    const game = setUp(['ABSOLUTE_REFRACTORY'], position);
    assert.equal(getAttacks(game).length, canHit ? 1 : 0, 'position ' + position);
  }
});

test('relative refractory period hits blue, but not green REST', () => {
  assert.equal(getAttacks(setUp(['RELATIVE_REFRACTORY'], BLUE_SPACE)).length, 1);
  assert.equal(getAttacks(setUp(['RELATIVE_REFRACTORY'], REST_SPACE)).length, 0);
});

test('narrow and demyelinated axon hit players on the P track', () => {
  const game = setUp(['NARROW_AXON', 'DEMYELINATED_AXON'], P_SPACE);
  assert.equal(getAttacks(game).length, 2);
});

// ---------- Skipping a turn ----------

test('a skip card gives the target a penalty and goes on the discard pile', () => {
  const game = setUp(['NARROW_AXON'], P_SPACE);
  applyPlay(game, { type: 'ATTACK', card: 'NARROW_AXON', target: 1 });
  assert.equal(game.players[1].penalty, 'NARROW_AXON');
  assert.ok(game.discards.action.includes('NARROW_AXON'));
});

test('the penalised player can only skip their turn, then plays normally next time', () => {
  const game = setUp(['NARROW_AXON'], P_SPACE);
  applyPlay(game, { type: 'ATTACK', card: 'NARROW_AXON', target: 1 });
  applyPlay(game, { type: 'END_TURN' }); // Ana -> Ben

  assert.equal(getCurrentPlayer(game).name, 'Ben');
  assert.deepEqual(getLegalPlays(game), [{ type: 'SKIP_TURN' }]);

  applyPlay(game, { type: 'SKIP_TURN' }); // Ben -> Ana
  assert.equal(getCurrentPlayer(game).name, 'Ana');
  assert.equal(game.players[1].penalty, null);
});

test('penalties do not stack: you cannot hit someone who already has one', () => {
  const game = setUp(['NARROW_AXON'], P_SPACE);
  game.players[1].penalty = 'DEMYELINATED_AXON';
  assert.equal(getAttacks(game).length, 0);
});

// ---------- Strong stimulus ----------

test('strong stimulus cancels a relative refractory period', () => {
  const game = setUp([], BLUE_SPACE);
  game.currentPlayer = 1; // Ben's turn
  game.players[1].penalty = 'RELATIVE_REFRACTORY';
  game.players[1].hand = ['STRONG_STIMULUS', 'K_OPEN'];

  applyPlay(game, { type: 'CANCEL_PENALTY' });
  assert.equal(game.players[1].penalty, null);
  assert.deepEqual(game.players[1].hand, ['K_OPEN']);
  assert.equal(getCurrentPlayer(game).name, 'Ben'); // still Ben's turn
  assert.ok(getLegalPlays(game).some((play) => play.type === 'END_TURN'));
});

test('strong stimulus cannot cancel an absolute refractory period', () => {
  const game = setUp([], PEACH_SPACE);
  game.currentPlayer = 1;
  game.players[1].penalty = 'ABSOLUTE_REFRACTORY';
  game.players[1].hand = ['STRONG_STIMULUS'];
  assert.deepEqual(getLegalPlays(game), [{ type: 'SKIP_TURN' }]);
});