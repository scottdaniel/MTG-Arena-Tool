import { CardObject } from "../../types/Deck";
import convertDeckFromV3 from "../convertDeckFromV3";
import db from "../../shared/database";
import LogEntry from "../../types/logDecoder";
import { playerDb } from "../../shared/db/LocalDatabase";
import playerData from "../../shared/player-data";
import { setData } from "../backgroundUtil";
import { ArenaV3Deck } from "../../types/Deck";

interface Entry extends LogEntry {
  json: () => ArenaV3Deck;
}

interface Changes {
  id: string;
  deckId: string;
  date: Date;
  changesMain: CardObject[];
  changesSide: CardObject[];
  previousMain: ArenaV3Deck;
  previousSide: ArenaV3Deck;
}

interface TempCardObject extends CardObject {
  existed?: boolean;
}

// REVIEW Deck.UpdateDeckV3 in the logs
export default function InDeckUpdateDeckV3(entry: Entry): void {
  let json = entry.json();
  if (!json) return;

  json = convertDeckFromV3(json);
  const _deck = playerData.deck(json.id);

  const changeId = entry.hash;
  const deltaDeck: Changes = {
    id: changeId,
    deckId: _deck.id,
    date: json.lastUpdated,
    changesMain: [],
    changesSide: [],
    previousMain: _deck.mainDeck,
    previousSide: _deck.sideboard
  };

  // Check Mainboard
  _deck.mainDeck.forEach((card: CardObject) => {
    const cardObj = db.card(card.id);
    if (cardObj !== undefined) {
      let diff = 0 - card.quantity;
      json.mainDeck.forEach((cardB: TempCardObject) => {
        const cardObjB = db.card(cardB.id);
        if (cardObjB !== undefined) {
          if (cardObj.name === cardObjB.name) {
            cardB.existed = true;
            diff = cardB.quantity - card.quantity;
          }
        }
      });

      if (diff !== 0) {
        deltaDeck.changesMain.push({ id: card.id, quantity: diff });
      }
    }
  });

  json.mainDeck.forEach(card => {
    if (card.existed === undefined) {
      deltaDeck.changesMain.push({ id: card.id, quantity: card.quantity });
    }
  });

  // Check sideboard
  _deck.sideboard.forEach((card: CardObject) => {
    const cardObj = db.card(card.id);
    if (cardObj !== undefined) {
      let diff = 0 - card.quantity;
      json.sideboard.forEach(cardB => {
        const cardObjB = db.card(cardB.id);
        if (cardObjB !== undefined) {
          if (cardObj.name === cardObjB.name) {
            cardB.existed = true;
            diff = cardB.quantity - card.quantity;
          }
        }
      });

      if (diff !== 0) {
        deltaDeck.changesSide.push({ id: card.id, quantity: diff });
      }
    }
  });

  json.sideboard.forEach(card => {
    if (card.existed === undefined) {
      deltaDeck.changesSide.push({ id: card.id, quantity: card.quantity });
    }
  });

  const foundNewDeckChange =
    !playerData.deckChangeExists(changeId) &&
    (deltaDeck.changesMain.length || deltaDeck.changesSide.length);

  if (foundNewDeckChange) {
    playerDb.upsert("deck_changes", changeId, deltaDeck);
    const deck_changes = { ...playerData.deck_changes, [changeId]: deltaDeck };
    const deck_changes_index = [...playerData.deck_changes_index];
    if (!deck_changes_index.includes(changeId)) {
      deck_changes_index.push(changeId);
    }
    playerDb.upsert("", "deck_changes_index", deck_changes_index);
    setData({ deck_changes, deck_changes_index });
  }

  const deckData = { ..._deck, ...json };
  const decks = { ...playerData.decks, [json.id]: deckData };
  playerDb.upsert("decks", json.id, deckData);
  setData({ decks });
}