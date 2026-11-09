// board.js

export const PINK = 'pink';
export const PEACH = 'peach';
export const MAGENTA = 'magenta';
export const BLUE = 'blue';
export const GREEN = 'green';
export const YELLOW = 'yellow';

// All the spaces, in order. SPACES[0] is START.
export const SPACES = [];

function addSpaces(colour, voltages) {
  for (const mv of voltages) {
    SPACES.push({ colour: colour, mv: mv });
  }
}

addSpaces(PINK, [-70, -68, -66, -64, -62, -60, -58, -56, -55]);
addSpaces(PEACH, [-30, -15, 0, 15, 30]);
addSpaces(MAGENTA, [20, 0, -20, -40, -50, -60, -70]);
addSpaces(BLUE, [-75, -80, -85, -90, -85, -80, -75]);
addSpaces(GREEN, [-70]);
for (let i = 0; i < 19; i++) {
  SPACES.push({ colour: YELLOW, mv: null });
}

// Important positions. A player's position is just a number.
export const AXON_HILLOCK = -1;
export const START = 0;
export const THRESHOLD = 8;
export const FINISH = SPACES.length;

// Which colour is the space at this position?
export function getColourAt(position) {
  if (position === AXON_HILLOCK) {
    return null;
  }
  if (position >= FINISH) {
    return 'finish';
  }
  return SPACES[position].colour;
}