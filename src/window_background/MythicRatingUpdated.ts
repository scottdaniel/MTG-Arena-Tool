import db from "../shared/database";
import { playerDb } from "../shared/db/LocalDatabase";

import playerData from "../shared/player-data";
import globals from "./globals";
import { parseWotcTimeFallback, setData } from "./backgroundUtil";

import LogEntry from "../types/logDecoder";

interface EntryJson {
  timestamp: string;
  eventId: string;
  oldMythicPercentile: number;
  newMythicPercentile: number;
  newMythicLeaderboardPlacement: number;
  context: string;
}

interface Entry extends LogEntry {
  json: () => EntryJson;
}

export default function MythicRatingUpdated(entry: Entry): void {
  const json = entry.json();
  // This is exclusive to constructed?
  // Not sure what the limited event is called.

  // Example data:
  // (-1) Incoming MythicRating.Updated {
  //   "oldMythicPercentile": 100.0,
  //   "newMythicPercentile": 100.0,
  //   "newMythicLeaderboardPlacement": 77,
  //   "context": "PostMatchResult"
  // }

  if (!json) return;
  const newJson = {
    ...json,
    date: json.timestamp,
    timestamp: parseWotcTimeFallback(json.timestamp).getTime(),
    lastMatchId: globals.currentMatch.matchId,
    eventId: globals.currentMatch.eventId
  };

  // Default constructed?
  let type = "constructed";
  // should probably be db.constructed_ranked_events
  if (db.standard_ranked_events.includes(newJson.eventId)) {
    type = "constructed";
  } else if (db.limited_ranked_events.includes(newJson.eventId)) {
    type = "limited";
  }

  const rank = { ...playerData.rank };

  rank.constructed.percentile = newJson.newMythicPercentile;
  rank.constructed.leaderboardPlace = newJson.newMythicLeaderboardPlacement;

  const seasonal_rank = playerData.addSeasonalRank(
    newJson,
    rank.constructed.seasonOrdinal,
    type
  );

  setData({ rank, seasonal_rank });
  playerDb.upsert("", "rank", rank);
  playerDb.upsert("", "seasonal_rank", seasonal_rank);
}
