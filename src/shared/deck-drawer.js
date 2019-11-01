import * as React from "react";
import * as ReactDOM from "react-dom";
import _ from "lodash";

import db from "./database";
import { createDiv } from "./dom-fns";
import CardTile from "./CardTile";

export function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

export function frameClassName(card) {
  const frame = card ? card.frame.concat().sort() : [];
  if (_.isEqual(frame, [])) return "tile_c";
  if (_.isEqual(frame, [1])) return "tile_w";
  if (_.isEqual(frame, [2])) return "tile_u";
  if (_.isEqual(frame, [3])) return "tile_b";
  if (_.isEqual(frame, [4])) return "tile_r";
  if (_.isEqual(frame, [5])) return "tile_g";
  if (_.isEqual(frame, [1, 2])) return "tile_uw";
  if (_.isEqual(frame, [1, 3])) return "tile_wb";
  if (_.isEqual(frame, [1, 4])) return "tile_wr";
  if (_.isEqual(frame, [1, 5])) return "tile_gw";
  if (_.isEqual(frame, [2, 3])) return "tile_ub";
  if (_.isEqual(frame, [2, 4])) return "tile_ur";
  if (_.isEqual(frame, [2, 5])) return "tile_ug";
  if (_.isEqual(frame, [3, 4])) return "tile_br";
  if (_.isEqual(frame, [3, 5])) return "tile_bg";
  if (_.isEqual(frame, [4, 5])) return "tile_rg";
  if (frame.length > 2) return "tile_multi";
}

export function rankingClassName(ranking) {
  switch (ranking) {
    case "A+":
    case "A":
      return "blue";

    case "A-":
    case "B+":
    case "B":
      return "green";

    case "C-":
    case "D+":
    case "D":
      return "orange";

    case "D-":
    case "F":
      return "red";

    default:
      return "white";
  }
}

export const cardSeparator = function(str) {
  return createDiv(["card_tile_separator"], str);
};

export const cardTile = function(
  style,
  grpId,
  indent,
  quantity,
  showWildcards = false,
  deck = null,
  isSideboard = false,
  isHighlighted = false
) {
  if (quantity === 0) return false;

  let card;
  if (grpId && typeof grpId == "object" && grpId.name) {
    card = grpId;
    grpId = grpId.id;
  } else {
    card = db.card(grpId);
  }
  let dfcCard;
  if (card && card.dfcId) {
    dfcCard = db.card(card.dfcId);
  }

  const wrap = createDiv([]);
  const props = {
    card,
    deck,
    dfcCard,
    indent,
    isHighlighted,
    isSideboard,
    quantity,
    showWildcards
  };
  ReactDOM.render(<CardTile {...props} />, wrap);

  return wrap;
};
