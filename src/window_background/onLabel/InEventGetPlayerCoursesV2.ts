import LogEntry from "../../types/logDecoder";
import { setData } from "../backgroundUtil";
import { playerDb } from "../../shared/db/LocalDatabase";
import convertDeckFromV3 from "../convertDeckFromV3";
import { PlayerCourse } from "../../types/event";
import addCustomDeck from "../addCustomDeck";

interface Entry extends LogEntry {
  json: () => PlayerCourse[];
}

export default function InEventGetPlayerCoursesV2(entry: Entry): void {
  const json = entry.json();
  if (!json) return;

  const staticEvents: string[] = [];
  json.forEach(course => {
    if (course.CourseDeck) {
      course.CourseDeck = convertDeckFromV3(course.CourseDeck);
    }
    if (course.CurrentEventState != "PreMatch") {
      if (course.CourseDeck != null) {
        addCustomDeck(course.CourseDeck);
      }
    }
    if (course.Id) staticEvents.push(course.Id);
  });

  setData({ staticEvents });
  playerDb.upsert("", "static_events", staticEvents);
}