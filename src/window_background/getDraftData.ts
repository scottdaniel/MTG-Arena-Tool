import playerData from "../shared/player-data";
import globals from "./globals";
import createDraft from "./createDraft";

export default function getDraftData(id: string): any {
  const data = playerData.draft(id) || createDraft(id);
  if (!data.date) {
    // the first event we see we set the date.
    data.date = globals.logTime;
  }
  return data;
}