import db from "../shared/database";

export default function getDraftSet(eventName: string): string {
  if (!eventName) return "";
  for (const set in db.sets) {
    const setCode = db.sets[set].code;
    if (eventName.includes(setCode)) {
      return set;
    }
  }
  return "";
}
