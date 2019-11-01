import React, { useEffect, useState } from "react";

import {
  CARD_RARITIES,
  CARD_TILE_FLAT,
  COLORS_ALL,
  FACE_SPLIT_FULL,
  FACE_ADVENTURE_MAIN
} from "./constants";
import Deck from "./deck";
import {
  get_wc_missing as getWildcardsMissing,
  getCardArtCrop,
  openScryfallCard
} from "./util";
import { addCardHover } from "./card-hover";
import { isNumber, frameClassName, rankingClassName } from "./deck-drawer";

const byId = (id: string): HTMLElement | null => document.getElementById(id);

export interface CardTileProps {
  card: any;
  deck: Deck | null;
  dfcCard: any;
  indent: string;
  isHighlighted: boolean;
  isSideboard: boolean;
  quantity: { quantity: number; odds: number } | number | string; // TODO clean this up?
  showWildcards: boolean;
  style: number;
}

export function ArenaCardTile(props: CardTileProps): JSX.Element {
  const {
    card,
    deck,
    dfcCard,
    indent,
    isHighlighted,
    isSideboard,
    quantity,
    showWildcards
  } = props;
  const [isMouseHovering, setMouseHovering] = useState(false);

  if (quantity === 0) return <></>;
  if (!card) return <></>;

  let ww, ll, quantityElement;
  if (typeof quantity === "object") {
    ww = 64;
    ll = 48;
    const rankClass = rankingClassName(quantity.quantity);
    quantityElement = (
      <div className={"card_tile_odds " + rankClass}>
        <span>{quantity.quantity}</span>
      </div>
    );
  } else if (!isNumber(quantity)) {
    ww = 64;
    ll = 48;
    const rankClass = rankingClassName(quantity);
    quantityElement = (
      <div className={"card_tile_odds " + rankClass}>
        <span>{quantity}</span>
      </div>
    );
  } else if (quantity === 9999) {
    ww = 32;
    ll = 17;
    quantityElement = (
      <div
        className="card_tile_quantity"
        style={{
          color: "rgba(255, 255, 255, 0)",
          minWidth: "0px",
          width: "0px"
        }}
      >
        <span>1</span>
      </div>
    );
  } else {
    ww = 64;
    ll = 49;
    quantityElement = (
      <div className="card_tile_quantity">
        <span>{quantity}</span>
      </div>
    );
  }

  const costSymbols: JSX.Element[] = [];
  const contId = `t${card.id + indent}`;
  let wildcardElement = null;
  if (card) {
    useEffect(() => {
      const tileDiv = byId(contId);
      if (tileDiv) {
        addCardHover(tileDiv, card);
      }
    });

    let prevc = true;
    const hasSplitCost = card.dfc === FACE_SPLIT_FULL;
    if (card.cost) {
      card.cost.forEach((cost: string, index: number) => {
        if (hasSplitCost) {
          if (/^(x|\d)+$/.test(cost) && prevc === false) {
            costSymbols.push(<span>//</span>);
          }
          prevc = /^\d+$/.test(cost);
        }
        costSymbols.push(
          <div
            key={card.id + "_" + index}
            className={"mana_s16 flex_end mana_" + cost}
          />
        );
      });
    }
    if (card.dfc === FACE_ADVENTURE_MAIN && dfcCard && dfcCard.cost) {
      costSymbols.push(<span>//</span>);
      dfcCard.cost.forEach((cost: string, index: number) => {
        costSymbols.push(
          <div
            key={card.id + "_" + index}
            className={"mana_s16 flex_end mana_" + cost}
          />
        );
      });
    }

    if (showWildcards && deck) {
      if (card.type.indexOf("Basic Land") === -1) {
        const missing = getWildcardsMissing(deck, card.id, isSideboard);
        if (missing > 0) {
          const xoff = CARD_RARITIES.indexOf(card.rarity) * -24;
          const yoff = missing * -24;

          wildcardElement = (
            <div
              className="not_owned_sprite"
              title={missing + " missing"}
              style={{
                backgroundPosition: `${xoff}px ${yoff}px`,
                left: `calc(0px - 100% + ${ww - 14}px)`
              }}
            />
          );
        }
      }
    }
  }

  const tileStyle = { backgroundColor: "rgba(0, 0, 0, 0.75)" };
  if (isHighlighted) {
    tileStyle.backgroundColor = "rgba(250, 229, 210, 0.66)";
  }

  return (
    <div
      className="card_tile_container click-on"
      id={contId}
      data-grp-id={card.id}
      data-id={indent}
      data-quantity={quantity}
      style={tileStyle}
      onMouseEnter={(): void => setMouseHovering(true)}
      onMouseLeave={(): void => setMouseHovering(false)}
      onClick={(): void => {
        let _card = card;
        if (card.dfc === FACE_SPLIT_FULL) {
          _card = dfcCard || card;
        }
        openScryfallCard(_card);
      }}
    >
      {quantityElement}
      <div
        className={
          "card_tile " + (card && card.frame ? frameClassName(card) : "")
        }
        style={{
          minWidth: `calc(100% - ${ww}px)`,
          marginTop: isMouseHovering ? 0 : "3px"
        }}
      >
        <div className="flex_item">
          <div className="card_tile_name">{card ? card.name : "Unknown"}</div>
        </div>
        <div className="flex_item" style={{ lineHeight: "26px" }}>
          {costSymbols}
        </div>
      </div>
      <div
        className="card_tile_glow"
        style={{
          minWidth: `calc(100% - ${ww}px)`,
          left: `calc(0px - 100% + ${ll}px)`
        }}
      />
      {wildcardElement}
    </div>
  );
}

export function FlatCardTile(props: CardTileProps): JSX.Element {
  const {
    card,
    deck,
    dfcCard,
    indent,
    isHighlighted,
    isSideboard,
    quantity,
    showWildcards
  } = props;
  const [isMouseHovering, setMouseHovering] = useState(false);

  if (quantity === 0) return <></>;
  if (!card) return <></>;

  let quantityElement;
  if (typeof quantity === "object") {
    // Mixed quantity (odds and quantity)
    quantityElement = (
      <div className="card_tile_odds_flat">
        <div className="card_tile_odds_flat_half">{quantity.quantity}</div>
        <div className="card_tile_odds_flat_half_dark">{quantity.odds}</div>
      </div>
    );
  } else if (!isNumber(quantity)) {
    // Text quantity
    const rankClass = rankingClassName(quantity);
    quantityElement = (
      <div className={"card_tile_odds_flat " + rankClass}>{quantity}</div>
    );
  } else if (quantity === 9999) {
    // Undefined Quantity
    quantityElement = <div className="card_tile_quantity_flat">1</div>;
  } else {
    // Normal Quantity
    quantityElement = <div className="card_tile_quantity_flat">{quantity}</div>;
  }

  const cardTileStyle = { backgroundImage: "", borderImage: "" };
  const costSymbols: JSX.Element[] = [];
  const contId = `t${card.id + indent}`;
  let wildcardElement = null;
  if (card) {
    useEffect(() => {
      const tileDiv = byId(contId);
      if (tileDiv) {
        addCardHover(tileDiv, card);
      }
    });

    try {
      if (card.type == "Special") {
        cardTileStyle.backgroundImage = `url(${card.images["art_crop"]})`;
      } else {
        cardTileStyle.backgroundImage = `url(${getCardArtCrop(card)})`;
      }
    } catch (e) {
      console.log(e);
    }

    let colorA = "c";
    let colorB = "c";
    if (card.frame) {
      if (card.frame.length == 1) {
        colorA = COLORS_ALL[card.frame[0] - 1];
        colorB = COLORS_ALL[card.frame[0] - 1];
      } else if (card.frame.length == 2) {
        colorA = COLORS_ALL[card.frame[0] - 1];
        colorB = COLORS_ALL[card.frame[1] - 1];
      } else if (card.frame.length > 2) {
        colorA = "m";
        colorB = "m";
      }
    }
    cardTileStyle.borderImage = `linear-gradient(to bottom, var(--color-${colorA}) 30%, var(--color-${colorB}) 70%) 1 100%`;

    let prevc = true;
    const hasSplitCost = card.dfc === FACE_SPLIT_FULL;
    if (card.cost) {
      card.cost.forEach((cost: string, index: number) => {
        if (hasSplitCost) {
          if (/^(x|\d)+$/.test(cost) && prevc === false) {
            costSymbols.push(<span>//</span>);
          }
          prevc = /^\d+$/.test(cost);
        }
        costSymbols.push(
          <div
            key={card.id + "_" + index}
            className={"mana_s16 flex_end mana_" + cost}
          />
        );
      });
    }
    if (card.dfc === FACE_ADVENTURE_MAIN && dfcCard && dfcCard.cost) {
      costSymbols.push(<span>//</span>);
      dfcCard.cost.forEach((cost: string, index: number) => {
        costSymbols.push(
          <div
            key={card.id + "_" + index}
            className={"mana_s16 flex_end mana_" + cost}
          />
        );
      });
    }

    if (showWildcards && deck) {
      if (card.type.indexOf("Basic Land") === -1) {
        const missing = getWildcardsMissing(deck, card.id, isSideboard);
        if (missing > 0) {
          const xoff = CARD_RARITIES.indexOf(card.rarity) * -24;
          const yoff = missing * -24;

          wildcardElement = (
            <div
              className="not_owned_sprite_flat"
              title={missing + " missing"}
              style={{
                backgroundPosition: `${xoff}px ${yoff}px`
              }}
            />
          );
        }
      }
    }
  }

  const tileStyle = { backgroundColor: "rgba(0, 0, 0, 0.75)" };
  if (isHighlighted) {
    tileStyle.backgroundColor = "rgba(250, 229, 210, 0.66)";
  } else if (isMouseHovering) {
    tileStyle.backgroundColor = "rgba(65, 50, 40, 0.75)";
  }

  return (
    <div
      className="card_tile_container_flat click-on"
      id={contId}
      data-grp-id={card.id}
      data-id={indent}
      data-quantity={quantity}
      style={tileStyle}
      onMouseEnter={(): void => setMouseHovering(true)}
      onMouseLeave={(): void => setMouseHovering(false)}
      onClick={(): void => {
        if (!card) return;
        let _card = card;
        if (card.dfc === FACE_SPLIT_FULL) {
          _card = dfcCard || card;
        }
        openScryfallCard(_card);
      }}
    >
      {quantityElement}
      <div className="card_tile_crop_flat" style={cardTileStyle} />
      <div className="card_tile_name_flat">{card ? card.name : "Unknown"}</div>
      <div className="cart_tile_mana_flat">{costSymbols}</div>
      {wildcardElement}
    </div>
  );
}

export default function CardTile(props: CardTileProps): JSX.Element {
  if (props.style === CARD_TILE_FLAT) {
    return FlatCardTile(props);
  }
  return ArenaCardTile(props);
}
