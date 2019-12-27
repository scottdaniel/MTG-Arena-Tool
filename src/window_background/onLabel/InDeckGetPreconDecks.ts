import LogEntry from "../../types/logDecoder";
import { ArenaV3Deck } from "../../types/Deck";
import { ipc_send as ipcSend } from "../backgroundUtil";

interface Entry extends LogEntry {
  json: () => ArenaV3Deck[];
}

export default function InDeckGetPreconDecks(entry: Entry): void {
  const json = entry.json();
  if (!json) return;
  ipcSend("set_precon_decks", json);
}
