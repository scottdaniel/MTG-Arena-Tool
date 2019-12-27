/* eslint-disable @typescript-eslint/camelcase */
import differenceInDays from "date-fns/differenceInDays";
import playerData from "../../shared/player-data";
import { setData } from "../backgroundUtil";
import { playerDb } from "../../shared/db/LocalDatabase";
import LogEntry from "../../types/logDecoder";

interface Cards {
  [grpId: string]: number;
}

interface Entry extends LogEntry {
  json: () => Cards;
}

export default function InPlayerInventoryGetPlayerCardsV3(entry: Entry): void {
  const json = entry.json();
  if (!json) return;
  const now = new Date();

  let { cards_time, cards_before } = playerData.cards;
  if (cards_time) {
    // If a day has passed since last update
    if (differenceInDays(now, new Date(cards_time)) > 0) {
      cards_before = playerData.cards.cards;
      cards_time = now;
    }
  } else {
    // Initialize
    cards_time = now;
  }

  const cards = {
    ...playerData.cards,
    cards_time,
    cards_before,
    cards: json
  };

  playerDb.upsert("", "cards", cards);

  const cardsNew: Cards = {};
  Object.keys(json).forEach((key: string) => {
    // get differences
    if (cards_before[key] === undefined) {
      cardsNew[key] = json[key];
    } else if (cards_before[key] < json[key]) {
      cardsNew[key] = json[key] - cards_before[key];
    }
  });

  setData({ cards, cardsNew });
}
