// game.js
// Creating a new game: building the decks, shuffling and dealing.

import { CARD_TYPES, POTENTIAL, ACTION, getCardType } from './cards.js';
import { AXON_HILLOCK, START, FINISH } from './board.js';
import { getMoveOptions, ATTACK_CARDS, canBeAttacked } from './rules.js';

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
    canMove: true, // false after a Weak stimulus, until the next turn
  };

  for (const p of players) {
    game.players.push({
      name: p.name,
      isComputer: p.isComputer === true,
            position: AXON_HILLOCK,
      hand: [],
      penalty: null, // the card that will make them skip their next turn, if any
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
export function getLegalPlays(game) {
  const player = getCurrentPlayer(game);
  const plays = [];

  // A player with a penalty must skip this turn, unless they can cancel it.
  if (player.penalty !== null) {
    if (player.penalty === 'RELATIVE_REFRACTORY' && player.hand.includes('STRONG_STIMULUS')) {
      plays.push({ type: 'CANCEL_PENALTY' });
    }
    plays.push({ type: 'SKIP_TURN' });
    return plays;
  }

  // Moves: one play for each move option the player has the cards for.
  if (game.canMove) {
    for (const option of getMoveOptions(player.position)) {
      if (hasAllCards(player, option.cards)) {
        plays.push({ type: 'MOVE', cards: option.cards, steps: option.steps });
      }
    }
  }

  // Attacks: one play for each attack card and each opponent it can hit.
  for (const card of ATTACK_CARDS) {
    if (!player.hand.includes(card)) {
      continue;
    }
    for (let i = 0; i < game.players.length; i++) {
      const target = game.players[i];
      if (i === game.currentPlayer) {
        continue; // not yourself
      }
      if (!canBeAttacked(card, target.position)) {
        continue; // wrong part of the board
      }
      if (card !== 'ALCOHOL' && target.penalty !== null) {
        continue; // penalties don't stack
      }
      plays.push({ type: 'ATTACK', card: card, target: i });
    }
  }

  plays.push({ type: 'END_TURN' });
  return plays;
}

// Does the player hold every one of these cards?
function hasAllCards(player, cards) {
  for (const card of cards) {
    if (!player.hand.includes(card)) {
      return false;
    }
  }
  return true;
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

      if (play.type === 'MOVE') {
    movePiece(game, play);
  } else if (play.type === 'ATTACK') {
    attackPlayer(game, play);
  } else if (play.type === 'SKIP_TURN') {
    skipTurn(game);
  } else if (play.type === 'CANCEL_PENALTY') {
    cancelPenalty(game);
  } else if (play.type === 'END_TURN') {
    endTurn(game);
  }
}

// Move a card from the player's hand onto its discard pile.
function discardFromHand(game, player, card) {
  const index = player.hand.indexOf(card);
  player.hand.splice(index, 1);
  game.discards[getCardType(card).deck].push(card);
}

// Play the cards and move the current player's piece forward.
function movePiece(game, play) {
  const player = getCurrentPlayer(game);
  for (const card of play.cards) {
    discardFromHand(game, player, card);
  }
  player.position = Math.min(player.position + play.steps, FINISH);

  // Weak stimulus: onto START, but no more forward moves this turn.
  if (play.cards.includes('WEAK_STIMULUS')) {
    game.canMove = false;
  }
}

// Play an action card against another player.
// Play an action card against another player.
function attackPlayer(game, play) {
  const player = getCurrentPlayer(game);
  const target = game.players[play.target];
  discardFromHand(game, player, play.card);

  if (play.card === 'ALCOHOL') {
    target.position = Math.max(START, target.position - 2);
  } else {
    // All the other attack cards make the target skip their next turn.
    target.penalty = play.card;
  }
}

// Miss this turn because of a penalty.
function skipTurn(game) {
  getCurrentPlayer(game).penalty = null;
  endTurn(game);
}

// Play a Strong stimulus to cancel a Relative refractory period, then carry on as normal.
function cancelPenalty(game) {
  const player = getCurrentPlayer(game);
  discardFromHand(game, player, 'STRONG_STIMULUS');
  player.penalty = null;
}

// Refill the player's hand, then pass the turn to the next player.
function endTurn(game) {
  refillHand(game, getCurrentPlayer(game));
  game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
  game.turnNumber = game.turnNumber + 1;
  game.canMove = true;
}