import inventoryUpdate from "./inventoryUpdate";
import { BattlePassUpdate } from "../types/postmatch";
import { Entry as PostMatchUpdateEntry } from "./onLabel/PostMatchUpdate";

export default function trackUpdate(
  entry: PostMatchUpdateEntry,
  trackUpdate: BattlePassUpdate
): void {
  if (!trackUpdate) return;
  const { trackName, trackTier, trackDiff, orbCountDiff } = trackUpdate;

  if (trackDiff && trackDiff.inventoryUpdates) {
    trackDiff.inventoryUpdates.forEach(update => {
      const data = {
        ...update,
        trackName,
        trackTier
      };
      data.context.subSource = trackName;
      inventoryUpdate(entry, data);
    });
  }

  // For some reason, orbs live separately from all other inventory
  if (
    orbCountDiff &&
    orbCountDiff.oldOrbCount !== undefined &&
    orbCountDiff.currentOrbCount !== undefined &&
    orbCountDiff.currentOrbCount - orbCountDiff.oldOrbCount
  ) {
    const data = { trackName, trackTier, orbCountDiff };
    inventoryUpdate(entry, data);
  }
}
