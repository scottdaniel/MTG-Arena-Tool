import { playerDb } from "../../shared/db/LocalDatabase";
import playerData from "../../shared/player-data";
import globals from "../globals";
import { setData } from "../backgroundUtil";
import LogEntry from "../../types/logDecoder";
import { RankUpdate } from "../../types/rank";

interface Entry extends LogEntry {
  json: () => RankUpdate;
}

export default function RankUpdated(entry: Entry): void {
  const json = entry.json();
  if (!json) return;
  json.id = entry.hash;
  json.date = json.timestamp;
  json.timestamp = globals.logTime;
  json.lastMatchId = globals.currentMatch.matchId;
  json.eventId = globals.currentMatch.eventId;
  const rank = { ...playerData.rank };

  // json.wasLossProtected
  // json.seasonOrdinal
  const updateType = json.rankUpdateType.toLowerCase();

  rank[updateType].rank = json.newClass;
  rank[updateType].tier = json.newLevel;
  rank[updateType].step = json.newStep;
  rank[updateType].seasonOrdinal = json.seasonOrdinal;

  const seasonal_rank = playerData.addSeasonalRank(
    json,
    json.seasonOrdinal,
    updateType
  );

  const httpApi = require("../httpApi");
  httpApi.httpSetSeasonal(json);

  setData({ rank, seasonal_rank });
  playerDb.upsert("", "rank", rank);
  playerDb.upsert("", "seasonal_rank", seasonal_rank);
}
