import LogEntry from "../../types/logDecoder";
import selectDeck from "../selectDeck";
import convertDeckFromV3 from "../convertDeckFromV3";

interface EntryJson {
  params: {
    deck: string;
  };
}

interface Entry extends LogEntry {
  json: () => EntryJson;
}

export default function OutEventAIPractice(entry: Entry): void {
  const json = entry.json();
  if (!json) return;
  let deck = json.params.deck;
  deck = JSON.parse(deck);
  selectDeck(convertDeckFromV3(deck));
}

