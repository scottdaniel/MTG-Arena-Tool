import globals from "./globals";
import inventoryAddDelta from "./inventoryAddDelta";
import saveEconomyTransaction from "./saveEconomyTransaction";
import minifiedDelta from "./minifiedDelta";
import sha1 from "js-sha1";
import { InventoryUpdate } from "../types/inventory";
import { Entry as PostMatchUpdateEntry } from "./onLabel/PostMatchUpdate";

// REVIEW
export default function inventoryUpdate(
  entry: PostMatchUpdateEntry,
  update: InventoryUpdate
): void {
  // combine sub-context with parent context
  // console.log("inventoryUpdate", entry, update);
  let context = "PostMatch.Update";
  if (update.context && update.context.source) {
    // combine sub-context with parent context
    context += "." + update.context.source;
    if (update.context.sourceId && update.context.source === "QuestReward") {
      context += "." + update.context.sourceId;
    }
  }

  // This probably comes from our old economy formats
  if (update.context && update.context.subSource) {
    // combine sub-sub-context with parent context
    context += "." + update.context.subSource;
  }

  if (update.delta) {
    inventoryAddDelta(update.delta);
  }

  const transaction = {
    ...update,
    // Reduce the size for storage
    delta: update.delta ? minifiedDelta(update.delta) : {},
    context,
    subContext: update.context // preserve sub-context object data
  };
  // Construct a unique ID
  transaction.id = sha1(JSON.stringify(transaction) + entry.hash);
  // Add missing data
  transaction.date = globals.logTime;

  saveEconomyTransaction(transaction);
}
