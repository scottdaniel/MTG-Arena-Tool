import db from "../../shared/database";
import { ipcSend } from "../backgroundUtil";
import LogEntry from "../../types/logDecoder";

export interface Reward {
  wins: number;
  awardDescription: {
    image1: string | null;
    image2: string | null;
    image3: string | null;
    prefab: string;
    referenceId: string | null;
    headerLocKey: string;
    descriptionLocKey: string | null;
    quantity: string | null;
    locParams: { number1?: number; number2?: number; number3?: number };
    availableDate: string;
  };
}

export interface EntryJson {
  dailyReset: string;
  weeklyReset: string;
  dailyRewards: Reward[];
  weeklyRewards: Reward[];
}

interface Entry extends LogEntry {
  json: () => EntryJson;
}

export default function GetPlayerInventoryGetRewardSchedule(entry: Entry): void {
  const json = entry.json();
  if (!json) return;

  const data = {
    daily: db.rewards_daily_ends.toISOString(),
    weekly: db.rewards_weekly_ends.toISOString()
  };

  if (json.dailyReset) {
    if (!json.dailyReset.endsWith("Z")) json.dailyReset = json.dailyReset + "Z";
    data.daily = json.dailyReset;
  }

  if (json.weeklyReset) {
    if (!json.weeklyReset.endsWith("Z"))
      json.weeklyReset = json.weeklyReset + "Z";
    data.weekly = json.weeklyReset;
  }

  ipcSend("set_reward_resets", data);
}
