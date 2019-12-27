/* eslint-disable @typescript-eslint/no-var-requires */
import globals from "../globals";
import LogEntry from "../../types/logDecoder";
import processMatch from "../processMatch";
import { ipc_send as ipcSend } from "../backgroundUtil";

export interface EntryJson {
  controllerFabricUri: string;
  matchEndpointHost: string;
  matchEndpointPort: number;
  opponentScreenName: string;
  opponentIsWotc: false;
  matchId: string;
  opponentRankingClass: string;
  opponentRankingTier: number;
  opponentMythicPercentile: number;
  opponentMythicLeaderboardPlace: number;
  eventId: string;
  opponentAvatarSelection: string;
  opponentCardBackSelection: string;
  opponentPetSelection: { name: string; variant: string };
  avatarSelection: string;
  cardbackSelection: string;
  petSelection: { name: string; variant: string };
  battlefield: string;
  opponentCommanderGrpIds: number[];
  commanderGrpIds: number[];
}

interface Entry extends LogEntry {
  json: () => EntryJson;
}

export default function EventMatchCreated(entry: Entry): void {
  const json = entry.json();
  if (!json) return;
  const matchBeginTime = globals.logTime || new Date();

  if (json.opponentRankingClass == "Mythic") {
    const httpApi = require("./httpApi");
    httpApi.httpSetMythicRank(
      json.opponentScreenName,
      json.opponentMythicLeaderboardPlace
    );
  }

  ipcSend("ipc_log", "MATCH CREATED: " + matchBeginTime);
  if (json.eventId != "NPE") {
    processMatch(json, matchBeginTime);
  }
}
