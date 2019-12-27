import _ from "lodash";
import { ipc_send as ipcSend } from "../backgroundUtil";
import LogEntry from "../../types/logDecoder";
import { ActiveEvent } from "../../types/event";

interface Entry extends LogEntry {
  json: () => ActiveEvent[];
}
export default function InEventGetActiveEventsV2(entry: Entry): void {
  const json = entry.json();
  if (!json) return;

  const activeEvents = json.map(event => event.InternalEventName);
  ipcSend("set_active_events", JSON.stringify(activeEvents));
}
