// rules.js
// Which cards let a piece move forward. This is the rulebook's quick reference table.

import { AXON_HILLOCK, START, THRESHOLD, FINISH, PINK, PEACH, MAGENTA, BLUE, GREEN, YELLOW, getColourAt } from './board.js';

// The ways a piece at this position can move forward.
// Returns a list of options, each like { cards: ['NA_OPEN', 'K_CLOSED'], steps: 1 }.
export function getMoveOptions(position) {
  // Not started yet: a stimulus puts you onto START.
  if (position === AXON_HILLOCK) {
    return [
      { cards: ['STRONG_STIMULUS'], steps: 1 },
      { cards: ['WEAK_STIMULUS'], steps: 1 },
    ];
  }

  // Already finished: no more moves.
  if (position >= FINISH) {
    return [];
  }

  // Otherwise, the colour of the NEXT space decides which cards you need.
  const next = getColourAt(position + 1);

    if (next === PINK) {
    return [
      { cards: ['NA_OPEN'], steps: 1 },
      // Caffeine: 2 steps, but never past -55 mV
      { cards: ['CAFFEINE'], steps: Math.min(2, THRESHOLD - position) },
    ];
  }
  if (next === PEACH) {
    return [{ cards: ['NA_OPEN', 'K_CLOSED'], steps: 1 }];
  }
  if (next === MAGENTA) {
    return [{ cards: ['NA_INACTIVE', 'K_OPEN'], steps: 1 }];
  }
  if (next === BLUE) {
    return [{ cards: ['NA_CLOSED', 'K_OPEN'], steps: 1 }];
  }
  if (next === GREEN) {
    return [{ cards: ['NA_CLOSED', 'K_CLOSED'], steps: 1 }];
  }
  if (next === YELLOW || next === 'finish') {
    return [
      { cards: ['PROPAGATION'], steps: 1 },
      { cards: ['PROPAGATION', 'MYELINATED_AXON'], steps: 2 },
      { cards: ['PROPAGATION', 'LARGE_AXON'], steps: 2 },
    ];
  }
  return [];
}

// Can a player at this position be hit by Alcohol?
// Only on the pink spaces after START and before threshold (-68 to -56 mV).
export function canBeHitByAlcohol(position) {
  return position > START && position < THRESHOLD;
}