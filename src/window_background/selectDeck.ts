import globals from "./globals";
import Deck from "../shared/deck";
import { IPC_OVERLAY } from "../shared/constants";
import { ipc_send as ipcSend } from "./backgroundUtil";
import { CourseDeck } from "../types/event";

export default function selectDeck(arg: { CourseDeck: CourseDeck }): void {
  if (arg.CourseDeck) {
    globals.currentDeck = new Deck(arg.CourseDeck);
  }
  // console.log("Select deck: ", globals.currentDeck, arg);
  globals.originalDeck = globals.currentDeck.clone();
  ipcSend("set_deck", globals.currentDeck.getSave(), IPC_OVERLAY);
}
