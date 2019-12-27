import playerData from "../shared/player-data";
import { setData } from "./backgroundUtil";
import { InventoryUpdate } from "../types/inventory";

export default function inventoryAddDelta(
  delta: InventoryUpdate["delta"]
): void {
  const economy = playerData.economy;
  economy.gems += delta.gemsDelta;
  economy.gold += delta.goldDelta;

  // Update new cards obtained.
  const cardsNew = playerData.cardsNew;
  const cards = playerData.cards;
  delta.cardsAdded.forEach((grpId: number) => {
    // Add to inventory
    if (cards.cards[grpId] === undefined) {
      cards.cards[grpId] = 1;
    } else {
      cards.cards[grpId] += 1;
    }
    // Add to newly aquired
    if (cardsNew[grpId] === undefined) {
      cardsNew[grpId] = 1;
    } else {
      cardsNew[grpId] += 1;
    }
  });

  economy.vault += delta.vaultProgressDelta;
  economy.wcCommon += delta.wcCommonDelta;
  economy.wcUncommon += delta.wcUncommonDelta;
  economy.wcRare += delta.wcRareDelta;
  economy.wcMythic += delta.wcMythicDelta;
  // console.log("cardsNew", cardsNew);
  setData({ economy, cardsNew, cards });
}
