import globals from "../globals";
import { InternalCourseDeck } from "../../types/event";
import LogEntry from "../../types/logDecoder";
import { setData } from "../backgroundUtil";
import playerData from "../../shared/player-data";

interface EntryJson {
  CourseDeck: InternalCourseDeck;
}

interface Entry extends LogEntry {
  json: () => EntryJson;
}

export default function InDeckGetDeckLists(entry: Entry, json = false): void {
  if (!json && entry) json = entry.json();
  if (!json) return;

  const decks = { ...playerData.decks };
  const static_decks = [];
  json.forEach(deck => {
    const deckData = { ...(playerData.deck(deck.id) || {}), ...deck };
    decks[deck.id] = deckData;
    if (globals.debugLog || !globals.firstPass)
      globals.store.set("decks." + deck.id, deckData);
    static_decks.push(deck.id);
  });

  setData({ decks, static_decks });
  if (globals.debugLog || !globals.firstPass) {
    globals.store.set("static_decks", static_decks);
  }
}