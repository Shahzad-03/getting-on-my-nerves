import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FINISH } from '../src/engine/board.js';
import { getCurrentPlayer, getLegalPlays, applyPlay } from '../src/engine/game.js';
import { newTestGame } from './helpers.js';

// A game where Ana (player 0) goes first.
function setUp(names) {
  const game = newTestGame(names);
  game.currentPlayer = 0;
  game.forcedDiscards = false;
  return game;
}

// Put Ana on the last P space, holding a Propagation card, so her next move finishes.
function getAnaReadyToFinish(game) {
  game.players[0].position = FINISH - 1;
  game.players[0].hand = ['PROPAGATION', 'K_OPEN'];
}

function finishMove(game) {
  return getLegalPlays(game).find((play) => play.type === 'MOVE');
}

test('the first player to reach FINISH wins', () => {
  const game = setUp(['Ana', 'Ben']);
  getAnaReadyToFinish(game);
  applyPlay(game, finishMove(game));

  assert.equal(game.winner, 0);
  assert.deepEqual(game.finishOrder, [0]);
});

test('with 2 players, the game ends when someone finishes', () => {
  const game = setUp(['Ana', 'Ben']);
  getAnaReadyToFinish(game);
  applyPlay(game, finishMove(game));

  assert.equal(game.gameOver, true);
  assert.deepEqual(getLegalPlays(game), []); // nothing can be played any more
});

test('with 3 players, the others carry on and the finisher is skipped', () => {
  const game = setUp(['Ana', 'Ben', 'Cat']);
  getAnaReadyToFinish(game);
  applyPlay(game, finishMove(game));

  assert.equal(game.gameOver, false);
  assert.equal(getCurrentPlayer(game).name, 'Ben'); // Ana's turn ended straight away
  applyPlay(game, { type: 'END_TURN' }); // Ben -> Cat
  applyPlay(game, { type: 'END_TURN' }); // Cat -> Ben (Ana is skipped)
  assert.equal(getCurrentPlayer(game).name, 'Ben');
});

test('a finished player\'s cards go back into the game', () => {
  const game = setUp(['Ana', 'Ben', 'Cat']);
  getAnaReadyToFinish(game);
  applyPlay(game, finishMove(game));
  assert.deepEqual(game.players[0].hand, []);
  assert.ok(game.discards.potential.includes('K_OPEN'));
});

test('knocked-out players are skipped', () => {
  const game = setUp(['Ana', 'Ben', 'Cat']);
  game.players[1].eliminated = true; // Ben is out
  applyPlay(game, { type: 'END_TURN' }); // Ana -> Cat
  assert.equal(getCurrentPlayer(game).name, 'Cat');
});

test('you cannot attack a player who is out', () => {
  const game = setUp(['Ana', 'Ben', 'Cat']);
  game.players[0].hand = ['ALCOHOL'];
  game.players[1].position = 4; // Ben could be hit by Alcohol...
  game.players[1].eliminated = true; // ...but he is out
  game.players[2].position = FINISH; // and Cat has finished
  const attacks = getLegalPlays(game).filter((play) => play.type === 'ATTACK');
  assert.equal(attacks.length, 0);
});

test('if everyone else is knocked out, the last player standing wins', () => {
  const game = setUp(['Ana', 'Ben']);
  game.players[1].eliminated = true;
  applyPlay(game, { type: 'END_TURN' }); // the game notices at the end of the turn
  assert.equal(game.gameOver, true);
  assert.equal(game.winner, 0);
});

test('a whole game can be played from start to finish', () => {
  // Simple rule for choosing a play: move if you can, otherwise end your turn,
  // otherwise (a compulsory discard is owed) discard.
  function choosePlay(game) {
    const plays = getLegalPlays(game);
    return plays.find((play) => play.type === 'MOVE')
      || plays.find((play) => play.type === 'SKIP_TURN')
      || plays.find((play) => play.type === 'END_TURN')
      || plays.find((play) => play.type === 'DISCARD');
  }

  for (let i = 0; i < 20; i++) {
    const game = newTestGame(['Ana', 'Ben', 'Cat']);
    let plays = 0;
    while (!game.gameOver) {
      applyPlay(game, choosePlay(game));
      plays = plays + 1;
      assert.ok(plays < 20000, 'the game should not go on forever');
    }
    assert.notEqual(game.winner, null);
  }
});