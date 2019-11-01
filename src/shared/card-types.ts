import _ from "lodash";
import { Card } from "./types/Metadata";
//
// this order matters because things like Artifact Creatures exist
export const cardTypes = [
  "Land",
  "Creature",
  "Artifact",
  "Enchantment",
  "Instant",
  "Sorcery",
  "Planeswalker"
] as const;

export const cardType = (card: Card) => {
  const result = cardTypes.find(ct => cardHasType(card, ct));
  if (!result) throw new Error("Card type could not be determined");
  return result;
};

export function cardHasType(card: Card, type: string) {
  return card.type.includes(type + " ");
}
