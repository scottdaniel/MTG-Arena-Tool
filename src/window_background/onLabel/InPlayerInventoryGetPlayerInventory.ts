import playerData from "../../shared/player-data";
import { setData } from "../backgroundUtil";
import { playerDb } from "../../shared/db/LocalDatabase";
import LogEntry from "../../types/logDecoder";
import { PlayerInventory } from "../../types/inventory";

interface Entry extends LogEntry {
  json: () => PlayerInventory;
}

export default function InPlayerInventoryGetPlayerInventory(
  entry: Entry
): void {
  const json = entry.json();
  if (!json) return;
  const economy = {
    ...playerData.economy,
    gold: json.gold,
    gems: json.gems,
    vault: json.vaultProgress,
    wcTrack: json.wcTrackPosition,
    wcCommon: json.wcCommon,
    wcUncommon: json.wcUncommon,
    wcRare: json.wcRare,
    wcMythic: json.wcMythic,
    boosters: json.boosters
  };
  setData({ economy });
  playerDb.upsert("", "economy", economy);
}
