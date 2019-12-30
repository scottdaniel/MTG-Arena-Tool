import _ from "lodash";

import playerData from "../shared/player-data";

const currentDraftDefault = {
  eventId: "",
  draftId: "",
  set: "",
  owner: "",
  pickedCards: [],
  packNumber: 0,
  pickNumber: 0,
  currentPack: [],
  date: undefined
};

// REVIEW
export default function createDraft(id: string): any {
  const data = {
    ..._.cloneDeep(currentDraftDefault),
    id,
    draftId: id,
    owner: playerData.name
  };
  return data;
}
