import convertDeckFromV3 from "../convertDeckFromV3";
import LogEntry from "../../types/logDecoder";
import { InternalCourseDeck } from "../../types/event";
import InDeckGetDeckLists from "./InDeckGetDeckLists";

interface EntryJson {
  CourseDeck: InternalCourseDeck;
}

interface Entry extends LogEntry {
  json: () => EntryJson;
}

export default function InDeckGetDeckListsV3(entry: Entry): void {
  const json = entry.json();
  if (!json) return;
  InDeckGetDeckLists(
    entry,
    json.map(d => convertDeckFromV3(d))
  );
}