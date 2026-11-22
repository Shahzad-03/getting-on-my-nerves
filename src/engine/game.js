// game.js
// Creating a new game: building the decks, shuffling and dealing.

import { CARD_TYPES, POTENTIAL, ACTION, getCardType } from './cards.js';
import { AXON_HILLOCK } from './board.js';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const HAND_SIZE = { potential: 4, action: 2 };

// Make one deck: a list of card IDs, with each ID repeated `count` times.
export function buildDeck(deck) {
  const cards = [];
  for (const id in CARD_TYPES) {
    if (CARD_TYPES[id].deck === deck) {
      for (let i = 0; i < CARD_TYPES[id].count; i++) {
        cards.push(id);
      }
    }
  }
  return cards;
}

// Shuffle a list into a random order (the Fisher-Yates shuffle).
// Go backwards through the list, swapping each card with a random card
// at or before it.
export function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = cards[i];
    cards[i] = cards[j];
    cards[j] = temp;
  }
  return cards;
}

// How many cards from one deck does this player hold?
export function countInHand(player, deck) {
  let count = 0;
  for (const card of player.hand) {
    if (getCardType(card).deck === deck) {
      count = count + 1;
    }
  }
  return count;
}

// Take the top card of a deck. Returns null if the deck is empty.
export function drawCard(game, deck) {
  if (game.decks[deck].length === 0) {
    return null;
  }
  return game.decks[deck].pop();
}

// Draw cards until the player has 4 potential and 2 action cards.
export function refillHand(game, player) {
  for (const deck of [POTENTIAL, ACTION]) {
    while (countInHand(player, deck) < HAND_SIZE[deck]) {
      const card = drawCard(game, deck);
      if (card === null) {
        break; // deck is empty
      }
      player.hand.push(card);
    }
  }
}

// Start a new game.
// players is a list like: [{ name: 'Ana' }, { name: 'Computer', isComputer: true }]
export function createGame(players) {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error('A game needs ' + MIN_PLAYERS + ' to ' + MAX_PLAYERS + ' players');
  }

  const game = {
    players: [],
    decks: {
      potential: shuffle(buildDeck(POTENTIAL)),
      action: shuffle(buildDeck(ACTION)),
    },
    discards: {
      potential: [],
      action: [],
    },
    currentPlayer: 0,
    turnNumber: 1,
  };

  for (const p of players) {
    game.players.push({
      name: p.name,
      isComputer: p.isComputer === true,
      position: AXON_HILLOCK,
      hand: [],
    });
  }

  for (const player of game.players) {
    refillHand(game, player);
  }

  // Pick a random player to go first.
  game.currentPlayer = Math.floor(Math.random() * game.players.length);

  return game;
}

// ---------------- Taking turns ----------------

// The player whose turn it is.
export function getCurrentPlayer(game) {
  return game.players[game.currentPlayer];
}

// Everything the current player is allowed to do right now.
// Each play is a small object, e.g. { type: 'END_TURN' }.
// For now you can only end your turn. Later steps add moving, action cards and discarding.
export function getLegalPlays(game) {
  const plays = [];
  plays.push({ type: 'END_TURN' });
  return plays;
}

// Is this play in the list of legal plays?
export function isLegalPlay(game, play) {
  for (const legal of getLegalPlays(game)) {
    if (JSON.stringify(legal) === JSON.stringify(play)) {
      return true;
    }
  }
  return false;
}

// Carry out a play. Throws an error if the play isn't allowed.
export function applyPlay(game, play) {
  if (!isLegalPlay(game, play)) {
    throw new Error('That play is not allowed: ' + JSON.stringify(play));
  }

  if (play.type === 'END_TURN') {
    endTurn(game);
  }
}

// Refill the player's hand, then pass the turn to the next player.
function endTurn(game) {
  refillHand(game, getCurrentPlayer(game));
  game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
  game.turnNumber = game.turnNumber + 1;
}