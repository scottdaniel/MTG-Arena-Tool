import globals from "./globals";
import actionLog from "./actionLog";
import { ipc_send as ipcSend } from "./backgroundUtil";

import { createMatch } from "./data";
import { MatchData } from "../types/currentMatch";

import { ARENA_MODE_MATCH } from "../shared/constants";
import { EntryJson as MatchCreatedEvent } from "./onLabel/EventMatchCreated";

// Create a match from data, set globals and trigger ipc
export default function processMatch(
  json: MatchCreatedEvent,
  matchBeginTime: Date
): MatchData {
  actionLog(-99, globals.logTime, "");

  if (globals.debugLog || !globals.firstPass) {
    ipcSend("set_arena_state", ARENA_MODE_MATCH);
  }

  const match = createMatch(json, matchBeginTime);

  // set global values
  globals.currentMatch = match;
  globals.matchGameStats = [];
  globals.matchCompletedOnGameNumber = 0;
  globals.gameNumberCompleted = 0;
  globals.initialLibraryInstanceIds = [];
  globals.idChanges = {};
  globals.instanceToCardIdMap = {};

  ipcSend("ipc_log", "vs " + match.opponent.name);

  if (match.eventId == "DirectGame" && globals.currentDeck) {
    const str = globals.currentDeck.getSave();
    const httpApi = require("../httpApi");
    httpApi.httpTournamentCheck(str, match.opponent.name, true);
  }

  return match;
}
