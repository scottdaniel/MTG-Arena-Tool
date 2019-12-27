import LogEntry from "../../types/logDecoder";
import { setData } from "../backgroundUtil";
import { playerDb } from "../../shared/db/LocalDatabase";

interface EntryJson {
  playerId: string;
  constructedSeasonOrdinal: number;
  constructedClass: string;
  constructedLevel: number;
  constructedStep: number;
  constructedMatchesWon: number;
  constructedMatchesLost: number;
  constructedMatchesDrawn: number;
  limitedSeasonOrdinal: number;
  limitedClass: string;
  limitedLevel: number;
  limitedStep: number;
  limitedMatchesWon: number;
  limitedMatchesLost: number;
  limitedMatchesDrawn: number;
  constructedPercentile: number;
  constructedLeaderboardPlace: number;
  limitedPercentile: number;
  limitedLeaderboardPlace: number;
}

interface Entry extends LogEntry {
  json: () => EntryJson;
}

export default function InEventGetCombinedRankInfo(entry: Entry): void {
  const json = entry.json();
  if (!json) return;
  const rank = {
    constructed: {
      rank: json.constructedClass,
      tier: json.constructedLevel,
      step: json.constructedStep,
      won: json.constructedMatchesWon,
      lost: json.constructedMatchesLost,
      drawn: json.constructedMatchesDrawn,
      percentile: json.constructedPercentile,
      leaderboardPlace: json.constructedLeaderboardPlace,
      seasonOrdinal: json.constructedSeasonOrdinal
    },
    limited: {
      rank: json.limitedClass,
      tier: json.limitedLevel,
      step: json.limitedStep,
      won: json.limitedMatchesWon,
      lost: json.limitedMatchesLost,
      drawn: json.limitedMatchesDrawn,
      percentile: json.limitedPercentile,
      leaderboardPlace: json.limitedLeaderboardPlace,
      seasonOrdinal: json.limitedSeasonOrdinal
    }
  };

  const infoLength = Object.keys(json).length - 1;
  const processedLength = [rank.limited, rank.constructed]
    .map(o => Object.keys(o).length)
    .reduce((a, b) => a + b, 0);
  if (infoLength != processedLength) {
    console.warn("rankInfo is not processing all data.", Object.keys(json));
  }

  setData({ rank });
  playerDb.upsert("", "rank", rank);
}
