import LogEntry from "../../types/logDecoder";
import { setData } from "../backgroundUtil";
import { playerDb } from "../../shared/db/LocalDatabase";
import playerData from "../../shared/player-data";
import { PlayerProgression } from "../../types/progression";

interface Entry extends LogEntry {
  json: () => PlayerProgression;
}

export default function onLabelInProgressionGetPlayerProgress(entry: Entry): void {
  const json = entry.json();
  if (!json || !json.activeBattlePass) return;
  const activeTrack = json.activeBattlePass;
  const economy = {
    ...playerData.economy,
    trackName: activeTrack.trackName,
    // this one is not in my logs, but I havent purchased the pass this season
    trackTier: activeTrack.currentTier,
    currentLevel: activeTrack.currentLevel,
    currentExp: activeTrack.currentExp,
    currentOrbCount: activeTrack.currentOrbCount
  };
  setData({ economy });
  playerDb.upsert("", "economy", economy);
}
