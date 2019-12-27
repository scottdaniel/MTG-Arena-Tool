import { IPC_OVERLAY } from "../shared/constants";

import { ipc_send as ipcSend } from "./backgroundUtil";

export default function clearDeck(): void {
  const deck = { mainDeck: [], sideboard: [], name: "" };
  ipcSend("set_deck", deck, IPC_OVERLAY);
}
