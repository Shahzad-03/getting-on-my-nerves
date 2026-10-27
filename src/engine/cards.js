// cards.js
// Every type of card in the game and how many copies of each there are.

export const POTENTIAL = 'potential';
export const ACTION = 'action';

export const CARD_TYPES = {
  // Potential deck (122 cards)
  PROPAGATION:     { name: 'Propagation',          deck: POTENTIAL, count: 24 },
  STRONG_STIMULUS: { name: 'Strong stimulus',      deck: POTENTIAL, count: 12 },
  NA_OPEN:         { name: 'Na+ channel open',     deck: POTENTIAL, count: 18 },
  NA_CLOSED:       { name: 'Na+ channel closed',   deck: POTENTIAL, count: 14 },
  NA_INACTIVE:     { name: 'Na+ channel inactive', deck: POTENTIAL, count: 14 },
  K_OPEN:          { name: 'K+ channel open',      deck: POTENTIAL, count: 26 },
  K_CLOSED:        { name: 'K+ channel closed',    deck: POTENTIAL, count: 14 },

  // Action deck (62 cards)
  TETRODOTOXIN:        { name: 'Tetrodotoxin',               deck: ACTION, count: 6 },
  CAFFEINE:            { name: 'Caffeine',                   deck: ACTION, count: 8 },
  ALCOHOL:             { name: 'Alcohol',                    deck: ACTION, count: 8 },
  LARGE_AXON:          { name: 'Large axon',                 deck: ACTION, count: 9 },
  NARROW_AXON:         { name: 'Narrow axon',                deck: ACTION, count: 4 },
  MYELINATED_AXON:     { name: 'Myelinated axon',            deck: ACTION, count: 9 },
  DEMYELINATED_AXON:   { name: 'Demyelinated axon',          deck: ACTION, count: 4 },
  WEAK_STIMULUS:       { name: 'Weak stimulus',              deck: ACTION, count: 6 },
  ABSOLUTE_REFRACTORY: { name: 'Absolute refractory period', deck: ACTION, count: 4 },
  RELATIVE_REFRACTORY: { name: 'Relative refractory period', deck: ACTION, count: 4 },
};

// Look up a card type by its ID, e.g. getCardType('CAFFEINE').name -> 'Caffeine'.
// Throws an error for a misspelt ID, so typos are caught straight away.
export function getCardType(id) {
  const cardType = CARD_TYPES[id];
  if (cardType === undefined) {
    throw new Error('Unknown card type: ' + id);
  }
  return cardType;
}

// Add up how many cards are in one deck.
export function countCardsInDeck(deck) {
  let total = 0;
  for (const id in CARD_TYPES) {
    if (CARD_TYPES[id].deck === deck) {
      total = total + CARD_TYPES[id].count;
    }
  }
  return total;
}