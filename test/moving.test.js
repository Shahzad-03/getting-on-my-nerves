import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AXON_HILLOCK, START, THRESHOLD, FINISH } from '../src/engine/board.js';
import { createGame, getCurrentPlayer, getLegalPlays, applyPlay } from '../src/engine/game.js';

// A 2-player game where Ana goes first, standing at `position`, holding `hand`.
function setUp(position, hand) {
  const game = createGame([{ name: 'Ana' }, { name: 'Ben' }]);
  game.currentPlayer = 0;
  const ana = getCurrentPlayer(game);
  ana.position = position;
  ana.hand = hand;
  return game;
}

// Just the MOVE plays from the legal list.
function getMoves(game) {
  return getLegalPlays(game).filter((play) => play.type === 'MOVE');
}

test('you need a stimulus to leave the axon hillock', () => {
  const game = setUp(AXON_HILLOCK, ['NA_OPEN', 'K_OPEN']);
  assert.equal(getMoves(game).length, 0);
});

test('strong stimulus moves you onto START, and you can keep moving', () => {
  const game = setUp(AXON_HILLOCK, ['STRONG_STIMULUS', 'NA_OPEN']);
  applyPlay(game, getMoves(game)[0]);
  assert.equal(getCurrentPlayer(game).position, START);

  applyPlay(game, getMoves(game)[0]); // Na+ open: -70 -> -68
  assert.equal(getCurrentPlayer(game).position, 1);
});

test('weak stimulus moves you onto START but stops you moving again this turn', () => {
  const game = setUp(AXON_HILLOCK, ['WEAK_STIMULUS', 'NA_OPEN']);
  applyPlay(game, getMoves(game)[0]);
  assert.equal(getCurrentPlayer(game).position, START);
  assert.equal(getMoves(game).length, 0);

  applyPlay(game, { type: 'END_TURN' });
  assert.equal(game.canMove, true); // allowed again next turn
});

test('moving within pink needs Na+ open', () => {
  const game = setUp(3, ['NA_OPEN']);
  applyPlay(game, getMoves(game)[0]);
  assert.equal(getCurrentPlayer(game).position, 4);
});

test('crossing from -55 to -30 needs Na+ open AND K+ closed', () => {
  let game = setUp(THRESHOLD, ['NA_OPEN']);
  assert.equal(getMoves(game).length, 0);

  game = setUp(THRESHOLD, ['NA_OPEN', 'K_CLOSED']);
  applyPlay(game, getMoves(game)[0]);
  assert.equal(getCurrentPlayer(game).position, THRESHOLD + 1);
});

test('each stage needs its own pair of cards', () => {
  // [position, the right pair, a wrong pair]
  const checks = [
    [13, ['NA_INACTIVE', 'K_OPEN'], ['NA_OPEN', 'K_CLOSED']], // +30 -> +20 (magenta)
    [20, ['NA_CLOSED', 'K_OPEN'], ['NA_INACTIVE', 'K_OPEN']], // -70 -> -75 (blue)
    [27, ['NA_CLOSED', 'K_CLOSED'], ['NA_CLOSED', 'K_OPEN']], // -75 -> REST (green)
  ];
  for (const [position, rightPair, wrongPair] of checks) {
    let game = setUp(position, wrongPair);
    assert.equal(getMoves(game).length, 0, 'wrong pair should not move from ' + position);

    game = setUp(position, rightPair);
    applyPlay(game, getMoves(game)[0]);
    assert.equal(getCurrentPlayer(game).position, position + 1);
  }
});

test('played cards leave your hand and go on the discard pile', () => {
  const game = setUp(THRESHOLD, ['NA_OPEN', 'K_CLOSED', 'K_OPEN']);
  applyPlay(game, getMoves(game)[0]);
  assert.deepEqual(getCurrentPlayer(game).hand, ['K_OPEN']);
  assert.ok(game.discards.potential.includes('NA_OPEN'));
  assert.ok(game.discards.potential.includes('K_CLOSED'));
});

test('propagation moves 1, or 2 with a myelinated or large axon', () => {
  const game = setUp(28, ['PROPAGATION', 'MYELINATED_AXON']); // on REST
  const steps = getMoves(game).map((play) => play.steps);
  assert.deepEqual(steps, [1, 2]);

  applyPlay(game, getMoves(game)[1]);
  assert.equal(getCurrentPlayer(game).position, 30);
});

test('axon cards do nothing outside the P track', () => {
  const game = setUp(3, ['LARGE_AXON', 'MYELINATED_AXON']);
  assert.equal(getMoves(game).length, 0);
});

test('you can never move past FINISH', () => {
  const game = setUp(FINISH - 1, ['PROPAGATION', 'LARGE_AXON']);
  applyPlay(game, getMoves(game)[1]);
  assert.equal(getCurrentPlayer(game).position, FINISH);
});

test('two of the same card still only give one move option', () => {
  const game = setUp(3, ['NA_OPEN', 'NA_OPEN']);
  assert.equal(getMoves(game).length, 1);
});