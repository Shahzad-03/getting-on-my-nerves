import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POTENTIAL, ACTION, getCardType } from '../src/engine/cards.js';
import {
  createGame, getCurrentPlayer, getLegalPlays, applyPlay, countInHand,
} from '../src/engine/game.js';

// A 3-player game where player 0 (Ana) goes first.
function newGame() {
  let game = createGame([{ name: 'Ana' }, { name: 'Ben' }, { name: 'Cat' }]);
  // Very rarely someone is dealt three Tetrodotoxin and is out before the game starts.
  // That would muddle these tests, so deal again.
  while (game.players.some((player) => player.eliminated)) {
    game = createGame([{ name: 'Ana' }, { name: 'Ben' }, { name: 'Cat' }]);
  }
  game.currentPlayer = 0;
  game.forcedDiscards = false; // these tests are only about turns
  return game;
}

test('getCurrentPlayer returns whose turn it is', () => {
  const game = newGame();
  assert.equal(getCurrentPlayer(game).name, 'Ana');
});

test('ending your turn is always a legal play', () => {
  const game = newGame();
  const types = getLegalPlays(game).map((play) => play.type);
  assert.ok(types.includes('END_TURN'));
});

test('ending your turn passes it to the next player', () => {
  const game = newGame();
  applyPlay(game, { type: 'END_TURN' });
  assert.equal(getCurrentPlayer(game).name, 'Ben');
  assert.equal(game.turnNumber, 2);
});

test('after the last player, it goes back to the first', () => {
  const game = newGame();
  applyPlay(game, { type: 'END_TURN' }); // Ana -> Ben
  applyPlay(game, { type: 'END_TURN' }); // Ben -> Cat
  applyPlay(game, { type: 'END_TURN' }); // Cat -> Ana
  assert.equal(getCurrentPlayer(game).name, 'Ana');
});

test('a play that is not allowed throws an error', () => {
  const game = newGame();
  assert.throws(() => applyPlay(game, { type: 'FLY_TO_FINISH' }));
});

test('ending your turn refills your hand to 4 + 2', () => {
  const game = newGame();
  const ana = getCurrentPlayer(game);

  // Pretend Ana played two cards: move them from her hand to the discard piles.
  for (let i = 0; i < 2; i++) {
    const card = ana.hand.pop();
    game.discards[getCardType(card).deck].push(card);
  }
  assert.equal(ana.hand.length, 4);

  applyPlay(game, { type: 'END_TURN' });
  if (!ana.eliminated) { // (unless she drew her third Tetrodotoxin)
    assert.equal(countInHand(ana, POTENTIAL), 4);
    assert.equal(countInHand(ana, ACTION), 2);
  }
});