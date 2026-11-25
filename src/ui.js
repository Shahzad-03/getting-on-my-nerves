// ui.js
// A simple screen for the game.
// The screen never works out the rules itself:
//   getLegalPlays() tells it which buttons to show,
//   applyPlay() carries out the button that was clicked.

import { createGame, getCurrentPlayer, getLegalPlays, applyPlay } from './engine/game.js';
import { getCardType } from './engine/cards.js';
import { SPACES, AXON_HILLOCK, FINISH } from './engine/board.js';

let game = null;

// ---------------- Starting a game ----------------

document.getElementById('start').addEventListener('click', () => {
  const players = [];
  for (const input of document.querySelectorAll('.name')) {
    const name = input.value.trim();
    if (name !== '') {
      players.push({ name: name });
    }
  }

  if (players.length < 2) {
    document.getElementById('setup-error').textContent = 'You need at least 2 players.';
    return;
  }

  game = createGame(players);
  document.getElementById('setup').hidden = true;
  document.getElementById('game').hidden = false;
  showGame();
});

// ---------------- Showing the game ----------------

// Redraw everything. Called at the start, and after every play.
function showGame() {
  showBoard();
  showPlayers();

  if (game.gameOver) {
    showWinner();
    return;
  }

  const player = getCurrentPlayer(game);
  document.getElementById('turn').textContent = player.name + "'s turn";
  showHand(player);
  showPlays();
}

// The board: one coloured box per space, with the players' pieces inside.
function showBoard() {
  const board = document.getElementById('board');
  board.innerHTML = ''; // clear the old board

  board.appendChild(makeSpace('hillock', 'Hillock', AXON_HILLOCK));
  for (let i = 0; i < SPACES.length; i++) {
    const space = SPACES[i];
    let label = 'P';
    if (space.mv !== null) {
      label = space.mv;
    }
    board.appendChild(makeSpace(space.colour, label, i));
  }
  board.appendChild(makeSpace('finish', 'Finish', FINISH));
}

// Make one box for the board.
function makeSpace(colour, label, position) {
  const box = document.createElement('div');
  box.className = 'space ' + colour;
  box.textContent = label;

  // Add a piece for every player standing here.
  for (const player of game.players) {
    if (player.position === position && !player.eliminated) {
      const piece = document.createElement('span');
      piece.className = 'piece';
      piece.textContent = player.name.charAt(0).toUpperCase();
      box.appendChild(piece);
    }
  }
  return box;
}

// The list of players, with where they are.
function showPlayers() {
  const list = document.getElementById('players');
  list.innerHTML = '';
  for (const player of game.players) {
    let text = player.name + ': ' + describePosition(player.position);
    if (player.eliminated) {
      text = player.name + ': out of the game';
    }
    if (player.penalty !== null) {
      text = text + ' (misses next turn)';
    }
    if (player.tetrodotoxin.length > 0 && !player.eliminated) {
      text = text + ' (Tetrodotoxin: ' + player.tetrodotoxin.length + ' of 3)';
    }
    const item = document.createElement('li');
    item.textContent = text;
    list.appendChild(item);
  }
}

// The current player's cards, using Kai's card designs.
// Each image file is named after the card's ID, e.g. assets/cards/NA_OPEN.webp
function showHand(player) {
  const hand = document.getElementById('hand');
  hand.innerHTML = '';
  for (const card of player.hand) {
    const image = document.createElement('img');
    image.src = 'assets/cards/' + card + '.webp';
    image.alt = getCardType(card).name; // read out by screen readers
    image.className = 'card';
    hand.appendChild(image);
  }
}

// One button for every legal play.
function showPlays() {
  const box = document.getElementById('plays');
  box.innerHTML = '';
  const plays = getLegalPlays(game);

  for (const play of plays) {
    const button = document.createElement('button');
    button.textContent = describePlay(play);
    button.addEventListener('click', () => {
      applyPlay(game, play);
      showGame();
    });
    box.appendChild(button);
  }

  // Explain why End turn is missing, if it is.
  const canEndTurn = plays.some((play) => play.type === 'END_TURN');
  const message = document.getElementById('message');
  if (getCurrentPlayer(game).penalty !== null) {
    message.textContent = 'You were hit by a skip-turn card, so you miss this turn.';
  } else if (!canEndTurn) {
    message.textContent = "You can't use some of your cards, so you must discard before you can end your turn.";
  } else {
    message.textContent = '';
  }
}

// When the game is over.
function showWinner() {
  let text = 'Nobody wins this time';
  if (game.winner !== null) {
    text = game.players[game.winner].name + ' wins!';
  }
  document.getElementById('turn').textContent = text;
  document.getElementById('message').textContent = 'Refresh the page to play again.';
  document.getElementById('hand').innerHTML = '';
  document.getElementById('plays').innerHTML = '';
}

// ---------------- Words ----------------

// Where a piece is, e.g. '-55 mV'.
function describePosition(position) {
  if (position === AXON_HILLOCK) {
    return 'not started';
  }
  if (position >= FINISH) {
    return 'finished';
  }
  if (SPACES[position].mv === null) {
    return 'on the axon (P)';
  }
  return SPACES[position].mv + ' mV';
}

// The text on a play's button.
function describePlay(play) {
  if (play.type === 'MOVE') {
    const names = play.cards.map((card) => getCardType(card).name);
    return 'Move: ' + names.join(' + ');
  }
  if (play.type === 'ATTACK') {
    return getCardType(play.card).name + ' on ' + game.players[play.target].name;
  }
  if (play.type === 'DISCARD') {
    return 'Discard ' + getCardType(play.card).name;
  }
  if (play.type === 'SKIP_TURN') {
    return 'Miss this turn';
  }
  if (play.type === 'CANCEL_PENALTY') {
    return 'Play Strong stimulus to cancel the penalty';
  }
  return 'End turn';
}