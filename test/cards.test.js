import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARD_TYPES, POTENTIAL, ACTION, getCardType, countCardsInDeck } from '../src/engine/cards.js';

test('there are 17 card types', () => {
  assert.equal(Object.keys(CARD_TYPES).length, 17);
});

test('potential deck has 122 cards', () => {
  assert.equal(countCardsInDeck(POTENTIAL), 122);
});

test('action deck has 62 cards', () => {
  // Silvia's document says 61, but its rows add up to 62
  assert.equal(countCardsInDeck(ACTION), 62);
});

test('getCardType finds a card', () => {
  assert.equal(getCardType('CAFFEINE').name, 'Caffeine');
  assert.equal(getCardType('CAFFEINE').deck, ACTION);
});

test('getCardType throws for an unknown card', () => {
  assert.throws(() => getCardType('COFFEE'));
});