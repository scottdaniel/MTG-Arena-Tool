import * as React from "react";

import pd from "./player-data";
import { cardHasType } from "./card-types";

export default function OwnershipStars(_props) {
  const { card } = _props;
  if (!card || !card.type) {
    return <></>;
  }
  const isbasic = cardHasType(card, "Basic Land");
  const owned = pd.cards.cards[card.id];
  const acquired = pd.cardsNew[card.id];
  let title = "";

  if (isbasic) {
    // Show infinity for basics (should work for rats and petitioners?)
    if (owned > 0) title = `∞ copies in collection`;
    else title = `0 copies in collection`;
    if (acquired) {
      title += ` (∞ recent)`;
    }

    let color = "gray";
    if (owned > 0) color = "green";
    if (acquired > 0) color = "orange";

    return <div className={`inventory_card_infinity_${color}`} title={title} />;
  }

  title = `${owned || 0}/4 copies in collection`;
  if (acquired) {
    title += ` (${acquired} recent)`;
  }
  return (
    <>
      {[1, 2, 3, 4].map(i => {
        let color = "gray";
        if (i < owned) color = "green";
        if (acquired && i >= owned - acquired && i < owned) color = "orange";
        return (
          <div
            className={`inventory_card_quantity_${color}`}
            key={"inventory_card_quantity_" + i}
            title={title}
          />
        );
      })}
    </>
  );
}
