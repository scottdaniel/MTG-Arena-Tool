import db from "../../shared/database";
import { ipc_send as ipcSend } from "../backgroundUtil";
import LogEntry from "../../types/logDecoder";
import { SeasonAndRankDetail } from "../../types/event";

interface Entry extends LogEntry {
  json: () => SeasonAndRankDetail;
}

export default function onLabelInEventGetSeasonAndRankDetail(entry: Entry): void {
  const json = entry.json();
  if (!json) return;
  db.handleSetSeason(null, json);
  ipcSend("set_season", json);
}
