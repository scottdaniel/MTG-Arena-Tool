/*
global
  createDivision,
  cardsDb,
  addCardHover,
  shell,
  get_wc_missing,
  get_set_scryfall,
*/

const _ = require("lodash");

//
function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

var rarities = ["common", "uncommon", "rare", "mythic"];

function frameClassName(card) {
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

function rankingClassName(ranking) {
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

exports.addCardSeparator = function(str, element) {
  if (element instanceof jQuery) {
    element = element[0];
  }
  element.appendChild(createDivision(["card_tile_separator"], str));
};

exports.addCardTile = function(
  grpId,
  indent,
  quantity,
  element,
  showWildcards = false,
  deck = null,
  isSideboard = false
) {
  // if element is a jquery object convert to bare DOM element
  // TODO: Remove this once jQuery is removed.
  if (element instanceof jQuery) {
    element = element[0];
  }

  if (quantity !== 0) {
    var cont = createDivision(["card_tile_container", "click-on"]);

    cont.dataset["grpId"] = grpId;
    cont.dataset["id"] = indent;
    cont.dataset["quantity"] = quantity;

    var ww, ll;
    if (!isNumber(quantity)) {
      ww = 64;
      ll = 48;
      let col = rankingClassName(quantity);
      cont.appendChild(
        createDivision(["card_tile_odds", col], `<span>${quantity}</span>`)
      );
    } else if (quantity == 9999) {
      quantity = 1;
      ww = 32;
      ll = 17;

      let quantityDiv = createDivision(
        ["card_tile_quantity"],
        `<span>${quantity}</span>`
      );
      quantityDiv.style.cssText =
        "color: rgba(255, 255, 255, 0); min-width: 0px; width: 0px;";
      cont.appendChild(quantityDiv);
    } else {
      ww = 64;
      ll = 49;
      let quantityDiv = createDivision(
        ["card_tile_quantity"],
        `<span>${quantity}</span>`
      );
      cont.appendChild(quantityDiv);
    }
    element.appendChild(cont);
    var card = cardsDb.get(grpId);
    var cardTile = createDivision(["card_tile", frameClassName(card)]);
    cardTile.id = `t${grpId + indent}`;
    cardTile.style.cssText = `min-width: calc(100% - ${ww}px);`;
    // cardTile.style.minWidth = `calc(100% - ${ww}px)`;
    cont.appendChild(cardTile);

    // Glow hover
    var glow = createDivision(["card_tile_glow"]);
    glow.id = `t${grpId + indent}`;
    glow.style.cssText = `min-width: calc(100% - ${ww}px); left: calc(0px - 100% + ${ll}px)`;
    cont.appendChild(glow);

    if (card) {
      addCardHover(glow, card);
      glow.addEventListener("mouseenter", () => {
        cardTile.style.marginTop = "0";
      });
      glow.addEventListener("mouseleave", () => {
        cardTile.style.marginTop = "3px";
      });

      glow.addEventListener("click", () => {
        if (card.dfc == "SplitHalf") {
          card = cardsDb.get(card.dfcId);
        }
        shell.openExternal(
          `https://scryfall.com/card/${get_set_scryfall(card.set)}/${
            card.cid
          }/${card.name}`
        );
      });
    }

    //
    var fl = createDivision(["flex_item"]);
    fl.appendChild(
      createDivision(["card_tile_name"], card ? card.name : "Unknown")
    );
    cardTile.appendChild(fl);

    var fl2 = createDivision(["flex_item"]);
    fl2.style.lineHeight = "26px";
    cardTile.appendChild(fl2);

    if (!card) return cont;

    let prevc = true;
    const hasSplitCost = card.dfc === "SplitHalf";

    card.cost.forEach(cost => {
      if (hasSplitCost) {
        if (/^(x|\d)+$/.test(cost) && prevc === false) {
          fl2.innerHTML += "//";
        }
        prevc = /^\d+$/.test(cost);
      }
      fl2.appendChild(createDivision(["mana_s16", "flex_end", `mana_${cost}`]));
    });

    if (showWildcards) {
      if (card.type.indexOf("Basic Land") == -1) {
        let missing = 0;
        if (deck) {
          missing = get_wc_missing(deck, grpId, isSideboard);
        }

        let xoff = rarities.indexOf(card.rarity) * -24;

        if (missing > 0) {
          let yoff = missing * -24;

          var asasdf = createDivision(["not_owned_sprite"]);
          asasdf.style.cssText = `background-position: ${xoff}px ${yoff}px; left: calc(0px - 100% + ${ww -
            14}px);`;
          asasdf.title = `${missing} missing`;
          cont.appendChild(asasdf);
        }
      }
    }

    return cont;
  }
  return false;
};
