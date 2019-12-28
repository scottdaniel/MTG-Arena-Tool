// PROBABLY DEPRECATED
import globals from "../globals";
import LogEntry from "../../types/logDecoder";
import { CourseDeck, InternalCourse } from "../../types/event";
import { setData } from "../backgroundUtil";
import { playerDb } from "../../shared/db/LocalDatabase";
import addCustomDeck from "../addCustomDeck";
import selectDeck from "../selectDeck";
import { get_deck_colors } from "../../shared/util";
import convertDeckFromV3 from "../convertDeckFromV3";
import playerData from "../../shared/player-data";

interface EntryJson {
  Id: string;
  CourseDeck: CourseDeck;
}

interface Entry extends LogEntry {
  json: () => EntryJson;
}

function saveCourse(json: InternalCourse): void {
  const id = json._id;
  delete json._id;
  json.id = id;
  const eventData = {
    date: globals.logTime,
    // preserve custom fields if possible
    ...(playerData.event(id) || {}),
    ...json
  };

  if (!playerData.courses_index.includes(id)) {
    const courses_index = [...playerData.courses_index, id];
    playerDb.upsert("", "courses_index", courses_index);
    setData({ courses_index }, false);
  }

  playerDb.upsert("", id, eventData);
  setData({ [id]: eventData });
}

export default function InEventGetPlayerCourseV2(entry: Entry): void {
  const json = entry.json();
  if (!json) return;
  if (json.Id == "00000000-0000-0000-0000-000000000000") return;

  const newJson: InternalCourse = {
    ...json,
    _id: json.Id,
    date: globals.logTime
  };
  delete json.Id;

  if (newJson.CourseDeck) {
    newJson.CourseDeck = convertDeckFromV3(json.CourseDeck);
    newJson.CourseDeck.colors = get_deck_colors(json.CourseDeck);
    addCustomDeck(json.CourseDeck);
    //newJson.date = timestamp();
    //console.log(newJson.CourseDeck, newJson.CourseDeck.colors)
    const httpApi = require("../httpApi");
    httpApi.httpSubmitCourse(newJson);
    saveCourse(newJson);
    selectDeck(newJson);
  }
}
