import convertV3ToV2 from "./convertV3ToV2";

export default function convertDeckFromV3(deck: any) {
  if (deck.CourseDeck) {
    if (deck.CourseDeck.mainDeck)
      deck.CourseDeck.mainDeck = convertV3ToV2(deck.CourseDeck.mainDeck);
    if (deck.CourseDeck.sideboard)
      deck.CourseDeck.sideboard = convertV3ToV2(deck.CourseDeck.sideboard);
  } else {
    if (deck.mainDeck) deck.mainDeck = convertV3ToV2(deck.mainDeck);
    if (deck.sideboard) deck.sideboard = convertV3ToV2(deck.sideboard);
  }
  return deck;
}