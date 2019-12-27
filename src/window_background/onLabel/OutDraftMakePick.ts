import LogEntry from "../../types/logDecoder";
import setDraftData from "../setDraftData";
import getDraftData from "../getDraftData";

interface EntryJson {
  params: {
    draftId: string;
    packNumber: number;
    pickNumber: number;
    cardId: number;
  };
}

interface Entry extends LogEntry {
  json: () => EntryJson;
}

// REVIEW
export default function onLabelOutDraftMakePick(entry: Entry): void {
  const json = entry.json();
  // console.log("LABEL:  Make pick < ", json);
  if (!json || !json.params) return;
  const { draftId, packNumber, pickNumber, cardId } = json.params;
  const key = "pack_" + packNumber + "pick_" + pickNumber;
  const data = getDraftData(draftId);
  data[key] = {
    pick: cardId,
    pack: data.currentPack
  };
  setDraftData(data);
}