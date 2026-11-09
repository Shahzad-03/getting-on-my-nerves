import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SPACES, START, THRESHOLD, FINISH, AXON_HILLOCK, getColourAt,
  PINK, PEACH, MAGENTA, BLUE, GREEN, YELLOW,
} from '../src/engine/board.js';

// How many spaces have this colour?
function countColour(colour) {
  let count = 0;
  for (const space of SPACES) {
    if (space.colour === colour) {
      count = count + 1;
    }
  }
  return count;
}

test('the board has 48 spaces', () => {
  assert.equal(SPACES.length, 48);
  assert.equal(FINISH, 48);
});

test('each stage has the right number of spaces', () => {
  assert.equal(countColour(PINK), 9);
  assert.equal(countColour(PEACH), 5);
  assert.equal(countColour(MAGENTA), 7);
  assert.equal(countColour(BLUE), 7);
  assert.equal(countColour(GREEN), 1);
  assert.equal(countColour(YELLOW), 19);
});

test('START is -70 mV and THRESHOLD is -55 mV', () => {
  assert.equal(SPACES[START].mv, -70);
  assert.equal(SPACES[THRESHOLD].mv, -55);
  assert.equal(SPACES[THRESHOLD].colour, PINK);
});

test('the space after threshold is the first peach space', () => {
  assert.equal(getColourAt(THRESHOLD + 1), PEACH);
  assert.equal(SPACES[THRESHOLD + 1].mv, -30);
});

test('getColourAt handles the axon hillock and FINISH', () => {
  assert.equal(getColourAt(AXON_HILLOCK), null);
  assert.equal(getColourAt(FINISH), 'finish');
  assert.equal(getColourAt(FINISH - 1), YELLOW);
});