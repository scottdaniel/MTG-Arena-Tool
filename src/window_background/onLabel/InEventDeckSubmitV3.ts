import convertDeckFromV3 from "../convertDeckFromV3";
import selectDeck from "../selectDeck";
import LogEntry from "../../types/logDecoder";
import { PlayerCourse } from "../../types/event";

interface Entry extends LogEntry {
  json: () => PlayerCourse;
}

export default function onLabelInEventDeckSubmitV3(entry: Entry): void {
  const json = entry.json();
  if (!json) return;
  selectDeck(convertDeckFromV3(json));
}
