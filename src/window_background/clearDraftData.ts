import { playerDb } from "../shared/db/LocalDatabase";
import playerData from "../shared/player-data";
import { setData } from "./backgroundUtil";

export default function clearDraftData(draftId: string): void {
  if (playerData.draftExists(draftId)) {
    if (playerData.draft_index.includes(draftId)) {
      const draft_index = [...playerData.draft_index];
      draft_index.splice(draft_index.indexOf(draftId), 1);
      setData({ draft_index }, false);
      playerDb.upsert("", "draft_index", draft_index);
    }
    setData({ [draftId]: null });
    playerDb.remove("", draftId);
  }
}
