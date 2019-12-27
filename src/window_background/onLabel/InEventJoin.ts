import addCustomDeck from "../addCustomDeck";
import convertDeckFromV3 from "../convertDeckFromV3";
import { get_deck_colors } from "../../shared/util";
import LogEntry from "../../types/logDecoder";
import selectDeck from "../selectDeck";
import { InternalCourseDeck } from "../../types/event";

interface EntryJson {
  CourseDeck: InternalCourseDeck;
}

interface Entry extends LogEntry {
  json: () => EntryJson;
}

export default function InEventJoin(entry: Entry): void {
  const json = entry.json();
  if (!json) return;

  if (json.CourseDeck) {
    json.CourseDeck.colors = get_deck_colors(json.CourseDeck);
    addCustomDeck(json.CourseDeck);
    selectDeck(convertDeckFromV3(json));
  }
}