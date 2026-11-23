// game.js
// Creating a new game: building the decks, shuffling and dealing.

import { CARD_TYPES, POTENTIAL, ACTION, getCardType } from './cards.js';
import { AXON_HILLOCK, START, FINISH } from './board.js';
import { getMoveOptions, ATTACK_CARDS, canBeAttacked } from './rules.js';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const HAND_SIZE = { potential: 4, action: 2 };
export const MAX_DISCARDS = { potential: 2, action: 1 }; // per turn
export const TETRODOTOXIN_LIMIT = 3; // collect this many and you're out

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

// Take the top card of a deck.
// If the deck has run out, the discard pile is shuffled to make a new one.
// Returns null only if there are no cards left at all.
export function drawCard(game, deck) {
  if (game.decks[deck].length === 0) {
    game.decks[deck] = shuffle(game.discards[deck]);
    game.discards[deck] = [];
  }
  if (game.decks[deck].length === 0) {
    return null;
  }
  return game.decks[deck].pop();
}

// Draw cards until the player has 4 potential and 2 action cards.
// A Tetrodotoxin card is never held: it goes face up in front of the player,
// and they draw again to replace it.
export function refillHand(game, player) {
  for (const deck of [POTENTIAL, ACTION]) {
    while (!player.eliminated && countInHand(player, deck) < HAND_SIZE[deck]) {
      const card = drawCard(game, deck);
      if (card === null) {
        break; // no cards left anywhere
      }
      if (card === 'TETRODOTOXIN') {
        collectTetrodotoxin(game, player, card);
      } else {
        player.hand.push(card);
      }
    }
  }
}

// Put a Tetrodotoxin card in front of the player. The third one knocks them out.
function collectTetrodotoxin(game, player, card) {
  player.tetrodotoxin.push(card);
  if (player.tetrodotoxin.length >= TETRODOTOXIN_LIMIT) {
    player.eliminated = true;
    // Their hand goes on the discard piles, so the cards stay in the game.
    for (const heldCard of player.hand) {
      game.discards[getCardType(heldCard).deck].push(heldCard);
    }
    player.hand = [];
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
    played: { potential: false, action: false }, // played a card from this deck this turn?
    discarded: { potential: 0, action: 0 },      // cards discarded this turn
    forcedDiscards: true, // the "discard if you can't play" rule (tests can switch it off)
    gameOver: false,
    winner: null,     // index of the winning player, once there is one
    finishOrder: [],  // indexes of players, in the order they reached FINISH
  };

  for (const p of players) {
    game.players.push({
      name: p.name,
      isComputer: p.isComputer === true,
      position: AXON_HILLOCK,
      hand: [],
      penalty: null, // the card that will make them skip their next turn, if any
      tetrodotoxin: [], // Tetrodotoxin cards face up in front of them
      eliminated: false, // true after their third Tetrodotoxin
    });
  }

  for (const player of game.players) {
    refillHand(game, player);
  }

  // Very rarely, players are knocked out by Tetrodotoxin while the cards are dealt.
  checkGameOver(game);

  // Pick a random player to go first, from those still in the game.
  const stillIn = [];
  for (let i = 0; i < game.players.length; i++) {
    if (isStillPlaying(game.players[i])) {
      stillIn.push(i);
    }
  }
  if (stillIn.length > 0) {
    game.currentPlayer = stillIn[Math.floor(Math.random() * stillIn.length)];
  }

  return game;
}

// ---------------- Taking turns ----------------

// The player whose turn it is.
export function getCurrentPlayer(game) {
  return game.players[game.currentPlayer];
}

// Is this player still in the race? (Not finished, and not knocked out.)
export function isStillPlaying(player) {
  return !player.eliminated && player.position < FINISH;
}

// Everything the current player is allowed to do right now.
// Each play is a small object, e.g. { type: 'END_TURN' }.
export function getLegalPlays(game) {
  const player = getCurrentPlayer(game);
  const plays = [];

  // Nothing can be played once the game is over.
  if (game.gameOver) {
    return plays;
  }

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
      if (!isStillPlaying(target)) {
        continue; // they've finished or been knocked out
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

  // Discards: up to 2 potential and 1 action card per turn.
  for (const card of new Set(player.hand)) {
    const deck = getCardType(card).deck;
    if (game.discarded[deck] < MAX_DISCARDS[deck]) {
      plays.push({ type: 'DISCARD', card: card });
    }
  }

  // You can end your turn, unless you still owe a compulsory discard.
  if (!mustDiscard(game, plays, POTENTIAL) && !mustDiscard(game, plays, ACTION)) {
    plays.push({ type: 'END_TURN' });
  }
  return plays;
}

// Rulebook: "If you cannot make any legal play with potential cards, discard 2.
// If you cannot play any action card, discard 1."
// Does the player still have to discard from this deck before ending their turn?
function mustDiscard(game, plays, deck) {
  if (!game.forcedDiscards) {
    return false;
  }
  if (game.played[deck]) {
    return false; // they played a card from this deck this turn
  }
  if (canPlayFromDeck(plays, deck)) {
    return false; // they could still play one
  }
  const player = getCurrentPlayer(game);
  const stillToDiscard = MAX_DISCARDS[deck] - game.discarded[deck];
  return stillToDiscard > 0 && countInHand(player, deck) > 0;
}

// Is there a MOVE or ATTACK in this list that uses a card from this deck?
function canPlayFromDeck(plays, deck) {
  for (const play of plays) {
    let cards = [];
    if (play.type === 'MOVE') {
      cards = play.cards;
    } else if (play.type === 'ATTACK') {
      cards = [play.card];
    }
    for (const card of cards) {
      if (getCardType(card).deck === deck) {
        return true;
      }
    }
  }
  return false;
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
  } else if (play.type === 'DISCARD') {
    discardCard(game, play);
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
    game.played[getCardType(card).deck] = true;
  }
  player.position = Math.min(player.position + play.steps, FINISH);

  // Weak stimulus: onto START, but no more forward moves this turn.
  if (play.cards.includes('WEAK_STIMULUS')) {
    game.canMove = false;
  }

  if (player.position === FINISH) {
    finishRace(game);
  }
}

// The current player has reached the axon terminal.
function finishRace(game) {
  const player = getCurrentPlayer(game);
  game.finishOrder.push(game.currentPlayer);
  if (game.winner === null) {
    game.winner = game.currentPlayer; // first to finish wins
  }

  // Their cards go back into the game for everyone else.
  for (const card of player.hand) {
    game.discards[getCardType(card).deck].push(card);
  }
  player.hand = [];

  checkGameOver(game);
  passTurn(game);
}

// Play an action card against another player.
function attackPlayer(game, play) {
  const player = getCurrentPlayer(game);
  const target = game.players[play.target];
  discardFromHand(game, player, play.card);
  game.played.action = true;

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
  game.played.potential = true;
  player.penalty = null;
}

// Throw away a card you don't want.
function discardCard(game, play) {
  discardFromHand(game, getCurrentPlayer(game), play.card);
  game.discarded[getCardType(play.card).deck] += 1;
}

// Refill the player's hand, then pass the turn to the next player.
function endTurn(game) {
  refillHand(game, getCurrentPlayer(game));
  checkGameOver(game); // they might have just drawn their third Tetrodotoxin
  passTurn(game);
}

// Move on to the next player who is still in the race, and reset the turn.
function passTurn(game) {
  if (game.gameOver) {
    return;
  }
  do {
    game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
  } while (!isStillPlaying(getCurrentPlayer(game)));

  game.turnNumber = game.turnNumber + 1;
  game.canMove = true;
  game.played = { potential: false, action: false };
  game.discarded = { potential: 0, action: 0 };
}

// The game ends when fewer than 2 players are still in the race.
function checkGameOver(game) {
  const stillPlaying = game.players.filter((player) => isStillPlaying(player));
  if (stillPlaying.length >= 2) {
    return;
  }
  game.gameOver = true;

  // Nobody finished, but everyone else was knocked out: the last one standing wins.
  if (game.winner === null && stillPlaying.length === 1) {
    game.winner = game.players.indexOf(stillPlaying[0]);
  }
}