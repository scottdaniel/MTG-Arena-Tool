import LogEntry from "../../types/logDecoder";
import { DraftStatus } from "../../types/draft";
import startDraft from "../startDraft";
import clearDraftData from "../clearDraftData";
import getDraftData from "../getDraftData";
import setDraftData from "../setDraftData";

interface Entry extends LogEntry {
  json: () => DraftStatus;
}

export default function InDraftDraftStatus(entry: Entry): void {
  const json = entry.json();
  // console.log("LABEL:  Draft status ", json);
  if (!json) return;

  startDraft();
  const {
    DraftId: draftId,
    PackNumber: packNumber,
    PickNumber: pickNumber,
    PickedCards
  } = json;
  if (packNumber === 0 && pickNumber === 0 && PickedCards.length === 0) {
    // ensure new drafts have clear working-space
    clearDraftData(draftId);
  }
  const data = {
    ...getDraftData(draftId),
    ...json,
    currentPack: (json.DraftPack || []).slice(0)
  };
  data.draftId = data.id;

  setDraftData(data);
}