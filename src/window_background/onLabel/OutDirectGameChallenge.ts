import globals from "../globals";
import LogEntry from "../../types/logDecoder";
import convertDeckFromV3 from "../convertDeckFromV3";
import selectDeck from "../selectDeck";

interface EntryJson {
  params: {
    deck: string;
    opponentDisplayName: string;
    playFirst: boolean;
    bo3: boolean;
  }
}

interface Entry extends LogEntry {
  json: () => EntryJson;
}

export default function OutDirectGameChallenge(entry: Entry): void {
  const json = entry.json();
  if (!json) return;
  let deck = json.params.deck;
  deck = JSON.parse(deck);
  selectDeck(convertDeckFromV3(deck));

  const httpApi = require("./httpApi");
  httpApi.httpTournamentCheck(
    globals.currentDeck.getSave(),
    json.params.opponentDisplayName,
    false,
    json.params.playFirst,
    json.params.bo3
  );
}