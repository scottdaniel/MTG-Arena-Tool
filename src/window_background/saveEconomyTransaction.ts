import playerData from "../shared/player-data";
import { setData } from "./backgroundUtil";
import { playerDb } from "../shared/db/LocalDatabase";
import { InternalEconomyTransaction } from "../types/inventory";

export default function saveEconomyTransaction(
  transaction: InternalEconomyTransaction
): void {
  const id = transaction.id;
  const txnData = {
    // preserve custom fields if possible
    ...(playerData.transaction(id) || {}),
    ...transaction
  };

  if (!playerData.economy_index.includes(id)) {
    const economy_index = [...playerData.economy_index, id];
    playerDb.upsert("", "economy_index", economy_index);
    setData({ economy_index }, false);
  }

  playerDb.upsert("", id, txnData);
  setData({ [id]: txnData });
  const httpApi = require("./httpApi");
  httpApi.httpSetEconomy(txnData);
}
