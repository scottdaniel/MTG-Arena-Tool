import { ARENA_MODE_DRAFT } from "../shared/constants";
import playerData from "../shared/player-data";
import { ipc_send as ipcSend } from "./backgroundUtil";
import globals from "./globals";

export default function startDraft(): void {
  if (globals.debugLog || !globals.firstPass) {
    if (playerData.settings.close_on_match) {
      ipcSend("renderer_hide", 1);
    }
    ipcSend("set_arena_state", ARENA_MODE_DRAFT);
  }
  globals.duringDraft = true;
}
