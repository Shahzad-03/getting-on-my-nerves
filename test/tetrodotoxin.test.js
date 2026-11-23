import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POTENTIAL, ACTION, getCardType } from '../src/engine/cards.js';
import { createGame, refillHand, drawCard, countInHand } from '../src/engine/game.js';

function newGame() {
  return createGame([{ name: 'Ana' }, { name: 'Ben' }]);
}

// Move one copy of `card` to the top of its deck, so it is drawn next.
// (It might be in the deck or on the discard pile.)
function putOnTop(game, deck, card) {
  let pile = game.decks[deck];
  if (!pile.includes(card)) {
    pile = game.discards[deck];
  }
  pile.splice(pile.indexOf(card), 1);
  game.decks[deck].push(card);
}

// Empty a player's hand and Tetrodotoxin pile onto the discard piles (so no card is lost).
function clearPlayer(game, player) {
  for (const card of player.hand) {
    game.discards[getCardType(card).deck].push(card);
  }
  for (const card of player.tetrodotoxin) {
    game.discards.action.push(card);
  }
  player.hand = [];
  player.tetrodotoxin = [];
  player.eliminated = false;
}

// Count every card: decks, discard piles, hands, and Tetrodotoxin on the table.
function countAllCards(game) {
  let total = game.decks.potential.length + game.decks.action.length;
  total = total + game.discards.potential.length + game.discards.action.length;
  for (const player of game.players) {
    total = total + player.hand.length + player.tetrodotoxin.length;
  }
  return total;
}

// ---------- Tetrodotoxin ----------

test('nobody is ever dealt a Tetrodotoxin into their hand', () => {
  for (let i = 0; i < 50; i++) {
    const game = newGame();
    for (const player of game.players) {
      assert.ok(!player.hand.includes('TETRODOTOXIN'));
      if (!player.eliminated) {
        // (Very rarely, someone is dealt three Tetrodotoxin and is out straight away.)
        assert.equal(countInHand(player, ACTION), 2);
      }
    }
  }
});

test('drawing Tetrodotoxin puts it in front of you and you draw a replacement', () => {
  const game = newGame();
  const ana = game.players[0];
  clearPlayer(game, ana);
  putOnTop(game, ACTION, 'TETRODOTOXIN');

  refillHand(game, ana);
  // At least 1: the replacement card could, by chance, be another Tetrodotoxin.
  assert.ok(ana.tetrodotoxin.length >= 1);
  assert.ok(!ana.hand.includes('TETRODOTOXIN'));
  if (!ana.eliminated) {
    assert.equal(countInHand(ana, ACTION), 2);
  }
  assert.equal(countAllCards(game), 184);
});

test('your third Tetrodotoxin knocks you out of the game', () => {
  const game = newGame();
  const ana = game.players[0];
  clearPlayer(game, ana);
  // Give Ana two Tetrodotoxin already (taken from the deck, so no cards are invented).
  for (let i = 0; i < 2; i++) {
    putOnTop(game, ACTION, 'TETRODOTOXIN');
    ana.tetrodotoxin.push(game.decks.action.pop());
  }
  putOnTop(game, ACTION, 'TETRODOTOXIN');

  refillHand(game, ana);
  assert.equal(ana.tetrodotoxin.length, 3);
  assert.equal(ana.eliminated, true);
  assert.deepEqual(ana.hand, []);
  assert.equal(countAllCards(game), 184);
});

// ---------- Running out of cards ----------

test('when a deck runs out, the discard pile is shuffled to make a new one', () => {
  const game = newGame();
  // Move every card left in the potential deck onto the discard pile.
  const cardsLeft = game.decks.potential.length;
  game.discards.potential = game.decks.potential;
  game.decks.potential = [];

  const card = drawCard(game, POTENTIAL);
  assert.notEqual(card, null);
  assert.equal(game.discards.potential.length, 0);
  assert.equal(game.decks.potential.length, cardsLeft - 1);
});

test('if there are no cards left anywhere, drawing gives null', () => {
  const game = newGame();
  game.decks.potential = [];
  game.discards.potential = [];
  assert.equal(drawCard(game, POTENTIAL), null);
});