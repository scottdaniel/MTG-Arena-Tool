const fs = require("fs");
const path = require("path");
const { app, ipcRenderer: ipc, remote } = require("electron");
const _ = require("lodash");
const striptags = require("striptags");

const {
  CARD_TYPE_CODES,
  CARD_TYPES,
  COLORS_ALL,
  DRAFT_RANKS,
  MANA,
  MANA_COLORS,
  IPC_MAIN,
  IPC_BACKGROUND
} = require("../shared/constants");
const db = require("../shared/database");
const pd = require("../shared/player-data");
const ConicGradient = require("../shared/conic-gradient");
const {
  createDiv,
  createImg,
  createInput,
  createLabel,
  createSpan,
  queryElements: $$
} = require("../shared/dom-fns");
const deckDrawer = require("../shared/deck-drawer");
const cardTypes = require("../shared/card-types");
const { addCardHover } = require("../shared/card-hover");
const {
  add,
  compare_cards,
  get_card_image,
  get_deck_export,
  get_deck_export_txt,
  get_deck_types_ammount,
  get_rank_index,
  makeId
} = require("../shared/util");
const {
  hypergeometricSignificance,
  hypergeometricRange
} = require("../shared/stats-fns");

const byId = id => document.getElementById(id);
let draftPosition = 1;
let popTimeout = null;
// quick and dirty shared state object for main renderer process
// (for state shared across processes, use database or player-data)
const localState = {
  authToken: "",
  discordTag: null,
  lastDataIndex: 0,
  lastScrollTop: 0,
  exploreData: null
};
const actionLogDir = path.join(
  (app || remote.app).getPath("userData"),
  "actionlogs"
);

//
exports.ipcSend = ipcSend;
function ipcSend(method, arg, to = IPC_BACKGROUND) {
  ipc.send("ipc_switch", method, IPC_MAIN, arg, to);
}

//
exports.pop = pop;
function pop(str, timeout) {
  $(".popup").css("opacity", 1);
  $(".popup").html(str);
  if (popTimeout != null) {
    clearTimeout(popTimeout);
  }
  if (timeout < 1) {
    popTimeout = null;
  } else {
    popTimeout = setTimeout(function() {
      $(".popup").css("opacity", 0);
      popTimeout = null;
    }, timeout);
  }
}

//
exports.showLoadingBars = showLoadingBars;
function showLoadingBars() {
  $$(".main_loading")[0].style.display = "block";
  document.body.style.cursor = "progress";
}

//
exports.hideLoadingBars = hideLoadingBars;
function hideLoadingBars() {
  $$(".main_loading")[0].style.display = "none";
  document.body.style.cursor = "auto";
}

//
exports.setLocalState = setLocalState;
function setLocalState(state = {}) {
  Object.assign(localState, state);
}

//
exports.getLocalState = getLocalState;
function getLocalState() {
  return localState;
}

// convenience handler for player data singleton
exports.toggleArchived = toggleArchived;
function toggleArchived(id) {
  ipcSend("toggle_archived", id);
}

//
exports.getTagColor = getTagColor;
function getTagColor(tag) {
  return pd.tags_colors[tag] || "#FAE5D2";
}

//
exports.makeResizable = makeResizable;
function makeResizable(div, resizeCallback, finalCallback) {
  var m_pos;
  let finalWidth;

  let resize = function(e) {
    var parent = div.parentNode;
    var dx = m_pos - e.x;
    m_pos = e.x;
    let newWidth = Math.max(10, parseInt(parent.style.width) + dx);
    parent.style.width = `${newWidth}px`;
    parent.style.flex = `0 0 ${newWidth}px`;
    if (resizeCallback instanceof Function) resizeCallback(newWidth);
    finalWidth = newWidth;
  };

  let saveWidth = function(width) {
    ipcSend("save_user_settings", { right_panel_width: width });
  };

  div.addEventListener(
    "mousedown",
    event => {
      m_pos = event.x;
      document.addEventListener("mousemove", resize, false);
    },
    false
  );

  document.addEventListener(
    "mouseup",
    () => {
      document.removeEventListener("mousemove", resize, false);
      if (finalWidth) {
        saveWidth(finalWidth);
        if (finalCallback instanceof Function) finalCallback(finalWidth);
        finalWidth = null;
      }
    },
    false
  );
}

//
exports.drawDeck = drawDeck;
function drawDeck(div, deck, showWildcards = false) {
  div.innerHTML = "";
  const unique = makeId(4);

  // draw maindeck grouped by cardType
  const cardsByGroup = _(deck.mainDeck)
    .map(card => ({ data: db.card(card.id), ...card }))
    .groupBy(card => {
      const cardType = cardTypes.cardType(card.data);
      switch (cardType) {
        case "Creature":
          return "Creatures";
        case "Planeswalker":
          return "Planeswalkers";
        case "Instant":
        case "Sorcery":
          return "Spells";
        case "Enchantment":
          return "Enchantments";
        case "Artifact":
          return "Artifacts";
        case "Land":
          return "Lands";
        default:
          throw new Error(`Unexpected card type: ${cardType}`);
      }
    })
    .value();

  _([
    "Creatures",
    "Planeswalkers",
    "Spells",
    "Enchantments",
    "Artifacts",
    "Lands"
  ])
    .filter(group => !_.isEmpty(cardsByGroup[group]))
    .forEach(group => {
      // draw a separator for the group
      const cards = cardsByGroup[group];
      const count = _.sumBy(cards, "quantity");
      const separator = deckDrawer.cardSeparator(`${group} (${count})`);
      div.appendChild(separator);

      // draw the cards
      _(cards)
        .filter(card => card.quantity > 0)
        .orderBy(["data.cmc", "data.name"])
        .forEach(card => {
          const tile = deckDrawer.cardTile(
            pd.settings.card_tile_style,
            card.id,
            unique + "a",
            card.quantity,
            showWildcards,
            deck,
            false
          );
          div.appendChild(tile);
        });
    });

  const sideboardSize = _.sumBy(deck.sideboard, "quantity");
  if (sideboardSize) {
    // draw a separator for the sideboard
    let separator = deckDrawer.cardSeparator(`Sideboard (${sideboardSize})`);
    div.appendChild(separator);

    // draw the cards
    _(deck.sideboard)
      .filter(card => card.quantity > 0)
      .map(card => ({ data: db.card(card.id), ...card }))
      .orderBy(["data.cmc", "data.name"])
      .forEach(card => {
        const tile = deckDrawer.cardTile(
          pd.settings.card_tile_style,
          card.id,
          unique + "b",
          card.quantity,
          showWildcards,
          deck,
          true
        );
        div.appendChild(tile);
      });
  }
}

//
exports.drawCardList = drawCardList;
function drawCardList(div, cards) {
  let unique = makeId(4);
  let counts = {};
  cards.forEach(cardId => (counts[cardId] = (counts[cardId] || 0) + 1));
  Object.keys(counts).forEach(cardId => {
    let tile = deckDrawer.cardTile(
      pd.settings.card_tile_style,
      cardId,
      unique,
      counts[cardId]
    );
    div.append(tile);
  });
}

//
exports.drawDeckVisual = drawDeckVisual;
function drawDeckVisual(container, deck, openCallback) {
  container.innerHTML = "";
  container.style.flexDirection = "column";

  container.appendChild(deckTypesStats(deck));

  // attempt at sorting visually..
  const newMainDeck = [];

  for (let cmc = 0; cmc < 21; cmc++) {
    for (let qq = 4; qq > -1; qq--) {
      deck.mainDeck.forEach(function(c) {
        const grpId = c.id;
        const card = db.card(grpId);
        let quantity;
        if (!card.type.includes("Land") && grpId !== 67306) {
          if (card.cmc === cmc) {
            quantity = c.quantity;

            if (quantity === qq) {
              newMainDeck.push(c);
            }
          }
        } else if (cmc === 20) {
          quantity = c.quantity;
          if (qq === 0 && quantity > 4) {
            newMainDeck.push(c);
          }
          if (quantity === qq) {
            newMainDeck.push(c);
          }
        }
      });
    }
  }

  const listDiv = createDiv(["decklist"]);
  listDiv.style.display = "flex";
  listDiv.style.width = "auto";
  listDiv.style.margin = "0 auto";

  const sz = pd.cardsSize;
  const mainDiv = createDiv(["visual_mainboard"]);
  mainDiv.style.display = "flex";
  mainDiv.style.flexWrap = "wrap";
  mainDiv.style.alignContent = "start";
  mainDiv.style.maxWidth = (sz + 6) * 5 + "px";

  let tileNow;
  let _n = 0;
  newMainDeck.forEach(c => {
    const card = db.card(c.id);
    if (c.quantity > 0) {
      let dfc = "";
      if (card.dfc === "DFC_Back") dfc = "a";
      if (card.dfc === "DFC_Front") dfc = "b";
      if (card.dfc === "SplitHalf") dfc = "a";
      if (dfc !== "b") {
        for (let i = 0; i < c.quantity; i++) {
          if (_n % 4 === 0) {
            tileNow = createDiv(["deck_visual_tile"]);
            mainDiv.appendChild(tileNow);
          }

          const d = createDiv(["deck_visual_card"]);
          d.style.width = sz + "px";
          const img = createImg(["deck_visual_card_img"], "", {
            src: get_card_image(card)
          });
          img.style.width = sz + "px";
          addCardHover(img, card);
          d.appendChild(img);

          tileNow.appendChild(d);
          _n++;
        }
      }
    }
  });
  listDiv.appendChild(mainDiv);

  const sideDiv = createDiv(["visual_sideboard"]);
  sideDiv.style.display = "flex";
  sideDiv.style.flexWrap = "wrap";
  sideDiv.style.marginLeft = "32px";
  sideDiv.style.alignContent = "start";
  sideDiv.style.maxWidth = (sz + 6) * 1.5 + "px";

  if (deck.sideboard && deck.sideboard.length) {
    tileNow = createDiv(["deck_visual_tile_side"]);
    tileNow.style.width = (sz + 6) * 5 + "px";

    let _n = 0;
    deck.sideboard.forEach(c => {
      const card = db.card(c.id);
      if (c.quantity > 0) {
        let dfc = "";
        if (card.dfc === "DFC_Back") dfc = "a";
        if (card.dfc === "DFC_Front") dfc = "b";
        if (card.dfc === "SplitHalf") dfc = "a";
        if (dfc !== "b") {
          for (let i = 0; i < c.quantity; i++) {
            const d = createDiv(["deck_visual_card_side"]);
            d.style.width = sz + "px";
            if (_n % 2 === 0) {
              d.style.marginLeft = "60px";
            }

            const img = createImg(["deck_visual_card_img"], "", {
              src: get_card_image(card)
            });
            img.style.width = sz + "px";
            addCardHover(img, card);
            d.appendChild(img);

            tileNow.appendChild(d);
            _n++;
          }
        }
      }
    });
    sideDiv.appendChild(tileNow);
  }
  listDiv.appendChild(sideDiv);

  container.appendChild(listDiv);

  if (openCallback) {
    const normalButton = createDiv(["button_simple"], "Normal view");
    normalButton.addEventListener("click", () => openCallback());
    container.appendChild(normalButton);
  }
}

//
function get_deck_curve(deck) {
  var curve = [];

  deck.mainDeck.forEach(function(card) {
    var grpid = card.id;
    var cmc = db.card(grpid).cmc;
    if (curve[cmc] == undefined) curve[cmc] = [0, 0, 0, 0, 0, 0];

    let card_cost = db.card(grpid).cost;

    if (db.card(grpid).type.indexOf("Land") == -1) {
      card_cost.forEach(function(c) {
        if (c.indexOf("w") !== -1) curve[cmc][1] += card.quantity;
        if (c.indexOf("u") !== -1) curve[cmc][2] += card.quantity;
        if (c.indexOf("b") !== -1) curve[cmc][3] += card.quantity;
        if (c.indexOf("r") !== -1) curve[cmc][4] += card.quantity;
        if (c.indexOf("g") !== -1) curve[cmc][5] += card.quantity;
      });

      curve[cmc][0] += card.quantity;
    }
  });
  /*
  // Do not account sideboard?
  deck.sideboard.forEach(function(card) {
    var grpid = card.id;
    var cmc = db.card(grpid).cmc;
    if (curve[cmc] == undefined)  curve[cmc] = 0;
    curve[cmc] += card.quantity

    if (db.card(grpid).rarity !== 'land') {
      curve[cmc] += card.quantity
    }
  });
  */
  //console.log(curve);
  return curve;
}

//
exports.deckManaCurve = deckManaCurve;
function deckManaCurve(deck) {
  const manaCounts = get_deck_curve(deck);
  const curveMax = Math.max(
    ...manaCounts
      .filter(v => {
        if (v == undefined) return false;
        return true;
      })
      .map(v => v[0] || 0)
  );
  // console.log("deckManaCurve", manaCounts, curveMax);

  const container = createDiv();
  const curve = createDiv(["mana_curve"]);
  const numbers = createDiv(["mana_curve_numbers"]);

  manaCounts.forEach((cost, i) => {
    const total = cost[0];
    const manaTotal = cost.reduce(add, 0) - total;

    const curveCol = createDiv(["mana_curve_column"]);
    curveCol.style.height = (total * 100) / curveMax + "%";

    const curveNum = createDiv(["mana_curve_number"], total > 0 ? total : "");
    curveCol.appendChild(curveNum);

    MANA_COLORS.forEach((mc, ind) => {
      if (ind < 5 && cost[ind + 1] > 0) {
        const col = createDiv(["mana_curve_column_color"]);
        col.style.height = Math.round((cost[ind + 1] / manaTotal) * 100) + "%";
        col.style.backgroundColor = mc;
        curveCol.appendChild(col);
      }
    });

    curve.appendChild(curveCol);

    const colNum = createDiv(["mana_curve_column_number"]);
    const numDiv = createDiv(["mana_s16", "mana_" + i]);
    numDiv.style.margin = "0 auto !important";
    colNum.appendChild(numDiv);
    numbers.appendChild(colNum);
  });

  container.appendChild(curve);
  container.appendChild(numbers);

  return container;
}

//
exports.deckTypesStats = deckTypesStats;
function deckTypesStats(deck) {
  const cardTypes = get_deck_types_ammount(deck);
  const typesContainer = createDiv(["types_container"]);
  CARD_TYPE_CODES.forEach((cardTypeKey, index) => {
    const type = createDiv(["type_icon_cont"]);
    type.appendChild(
      createDiv(["type_icon", "type_" + cardTypeKey], "", {
        title: CARD_TYPES[index]
      })
    );
    type.appendChild(createSpan([], cardTypes[cardTypeKey]));
    typesContainer.appendChild(type);
  });
  return typesContainer;
}

//
exports.colorPieChart = colorPieChart;
function colorPieChart(colorCounts, title) {
  /*
    used for land / card pie charts.
    colorCounts should be object with values for each of the color codes wubrgc and total.
    */
  // console.log("making colorPieChart", colorCounts, title);

  const stops = [];
  let start = 0;
  COLORS_ALL.forEach((colorCode, i) => {
    const currentColor = MANA_COLORS[i];
    const stop =
      start + ((colorCounts[colorCode] || 0) / colorCounts.total) * 100;
    stops.push(`${currentColor} 0 ${stop}%`);
    // console.log('\t', start, stop, currentColor);
    start = stop;
  });
  const gradient = new ConicGradient({
    stops: stops.join(", "),
    size: 400
  });
  const chart = createDiv(
    ["pie_container"],
    `<span>${title}</span>
    <svg class="pie">${gradient.svg}</svg>`
  );
  return chart;
}

//
exports.openDraft = openDraft;
function openDraft(id) {
  console.log("OPEN DRAFT", id, draftPosition);
  $("#ux_1").html("");
  $("#ux_1").removeClass("flex_item");
  const draft = pd.draft(id);
  let tileGrpid = db.sets[draft.set].tile;

  if (draftPosition < 1) draftPosition = 1;
  if (draftPosition > packSize * 6) draftPosition = packSize * 6;

  var packSize = 14;
  if (draft.set == "Guilds of Ravnica" || draft.set == "Ravnica Allegiance") {
    packSize = 15;
  }

  var pa = Math.floor((draftPosition - 1) / 2 / packSize);
  var pi = Math.floor(((draftPosition - 1) / 2) % packSize);
  var key = "pack_" + pa + "pick_" + pi;

  var pack = (draft[key] && draft[key].pack) || [];
  var pick = (draft[key] && draft[key].pick) || "";

  var top = $(
    '<div class="decklist_top"><div class="button back"></div><div class="deck_name">' +
      draft.set +
      " Draft</div></div>"
  );
  let flr = $('<div class="deck_top_colors"></div>');
  top.append(flr);

  if (db.card(tileGrpid)) {
    changeBackground("", tileGrpid);
  }

  var cont = $('<div class="flex_item" style="flex-direction: column;"></div>');
  cont.append(
    '<div class="draft_nav_container"><div class="draft_nav_prev"></div><div class="draft_nav_next"></div></div>'
  );

  $(
    '<div class="draft_title">Pack ' +
      (pa + 1) +
      ", Pick " +
      (pi + 1) +
      "</div>"
  ).appendTo(cont);

  var slider = $('<div class="slidecontainer"></div>');
  slider.appendTo(cont);
  var sliderInput = $(
    '<input type="range" min="1" max="' +
      packSize * 6 +
      '" value="' +
      draftPosition +
      '" class="slider" id="draftPosRange">'
  );
  sliderInput.appendTo(slider);

  const pdiv = $('<div class="draft_pack_container"></div>');
  pdiv.appendTo(cont);

  pack.forEach(function(grpId) {
    var d = $(
      '<div style="width: ' +
        pdiv.cardsSize +
        'px !important;" class="draft_card"></div>'
    );
    var img = $(
      '<img style="width: ' +
        pdiv.cardsSize +
        'px !important;" class="draft_card_img"></img>'
    );
    if (grpId == pick && draftPosition % 2 == 0) {
      img.addClass("draft_card_picked");
    }
    var card = db.card(grpId);
    img.attr("src", get_card_image(card));

    img.appendTo(d);
    var r = $(
      '<div style="" class="draft_card_rating">' +
        DRAFT_RANKS[card.rank] +
        "</div>"
    );
    r.appendTo(d);
    addCardHover(img, card);
    d.appendTo(pdiv);
  });

  $("#ux_1").append(top);
  $("#ux_1").append(cont);

  var posRange = $("#draftPosRange")[0];

  $(".draft_nav_prev").off();
  $(".draft_nav_next").off();
  $("#draftPosRange").off();

  $("#draftPosRange").on("click mousemove", function() {
    var pa = Math.floor((posRange.value - 1) / 2 / packSize);
    var pi = Math.floor(((posRange.value - 1) / 2) % packSize);
    $(".draft_title").html("Pack " + (pa + 1) + ", Pick " + (pi + 1));
  });

  $("#draftPosRange").on("click mouseup", function() {
    draftPosition = parseInt(posRange.value);
    openDraft(id, tileGrpid, draft.set);
  });

  $(".draft_nav_prev").on("click mouseup", function() {
    draftPosition -= 1;
    openDraft(id, tileGrpid, draft.set);
  });

  $(".draft_nav_next").on("click mouseup", function() {
    draftPosition += 1;
    openDraft(id, tileGrpid, draft.set);
  });
  //
  $(".back").click(function() {
    changeBackground("default");
    $(".moving_ux").animate({ left: "0px" }, 250, "easeInOutCubic");
  });
}

//
exports.openMatch = openMatch;
function openMatch(id) {
  $("#ux_1").html("");
  $("#ux_1").removeClass("flex_item");
  const match = pd.match(id);

  let top = $(
    '<div class="decklist_top"><div class="button back"></div><div class="deck_name">' +
      match.playerDeck.name +
      "</div></div>"
  );
  let flr = $('<div class="deck_top_colors"></div>');

  if (match.playerDeck.colors != undefined) {
    match.playerDeck.colors.forEach(function(color) {
      var m = $('<div class="mana_s20 mana_' + MANA[color] + '"></div>');
      flr.append(m);
    });
  }
  top.append(flr);

  var flc = $(
    '<div class="flex_item" style="justify-content: space-evenly;"></div>'
  );
  if (fs.existsSync(path.join(actionLogDir, id + ".txt"))) {
    $('<div class="button_simple openLog">Action log</div>').appendTo(flc);
  }

  var tileGrpid = match.playerDeck.deckTileId;
  if (db.card(tileGrpid)) {
    changeBackground("", tileGrpid);
  }
  var fld = $('<div class="flex_item"></div>');

  // this is a mess
  var flt = $('<div class="flex_item"></div>');
  var fltl = $('<div class="flex_item"></div>');
  var r = $('<div class="rank"></div>');
  r.appendTo(fltl);

  var fltr = $('<div class="flex_item"></div>');
  fltr.css("flex-direction", "column");
  var fltrt = $('<div class="flex_top"></div>');
  var fltrb = $('<div class="flex_bottom"></div>');
  fltrt.appendTo(fltr);
  fltrb.appendTo(fltr);

  fltl.appendTo(flt);
  fltr.appendTo(flt);

  var rank = match.player.rank;
  var tier = match.player.tier;
  r.css(
    "background-position",
    get_rank_index(rank, tier) * -48 + "px 0px"
  ).attr("title", rank + " " + tier);

  var name = $(
    '<div class="list_match_player_left">' +
      match.player.name.slice(0, -6) +
      " (" +
      match.player.win +
      ")</div>"
  );
  name.appendTo(fltrt);

  if (match.player.win > match.opponent.win) {
    var w = $('<div class="list_match_player_left green">Winner</div>');
    w.appendTo(fltrb);
  }

  var dl = $('<div class="decklist"></div>');
  flt.appendTo(dl);

  drawDeck(dl, match.playerDeck);

  $(
    '<div class="button_simple centered exportDeckPlayer">Export to Arena</div>'
  ).appendTo(dl);
  $(
    '<div class="button_simple centered exportDeckStandardPlayer">Export to .txt</div>'
  ).appendTo(dl);

  flt = $('<div class="flex_item" style="flex-direction: row-reverse;"></div>');
  fltl = $('<div class="flex_item"></div>');
  r = $('<div class="rank"></div>');
  r.appendTo(fltl);

  fltr = $('<div class="flex_item"></div>');
  fltr.css("flex-direction", "column");
  fltr.css("align-items", "flex-end");
  fltrt = $('<div class="flex_top"></div>');
  fltrb = $('<div class="flex_bottom"></div>');
  fltrt.appendTo(fltr);
  fltrb.appendTo(fltr);

  fltl.appendTo(flt);
  fltr.appendTo(flt);

  rank = match.opponent.rank;
  tier = match.opponent.tier;
  r.css(
    "background-position",
    get_rank_index(rank, tier) * -48 + "px 0px"
  ).attr("title", rank + " " + tier);

  name = $(
    '<div class="list_match_player_right">' +
      match.opponent.name.slice(0, -6) +
      " (" +
      match.opponent.win +
      ")</div>"
  );
  name.appendTo(fltrt);

  if (match.player.win < match.opponent.win) {
    w = $('<div class="list_match_player_right green">Winner</div>');
    w.appendTo(fltrb);
  }

  var odl = $('<div class="decklist"></div>');
  flt.appendTo(odl);

  match.oppDeck.mainDeck.sort(compare_cards);
  match.oppDeck.sideboard.sort(compare_cards);
  /*
  match.oppDeck.mainDeck.forEach(function(c) {
    c.quantity = 9999;
  });
  match.oppDeck.sideboard.forEach(function(c) {
    c.quantity = 9999;
  });
  */
  drawDeck(odl, match.oppDeck);

  $(
    '<div class="button_simple centered exportDeck">Export to Arena</div>'
  ).appendTo(odl);
  $(
    '<div class="button_simple centered exportDeckStandard">Export to .txt</div>'
  ).appendTo(odl);

  dl.appendTo(fld);
  odl.appendTo(fld);

  $("#ux_1").append(top);
  $("#ux_1").append(flc);
  $("#ux_1").append(fld);

  if (match.gameStats) {
    match.gameStats.forEach((game, gameIndex) => {
      if (game && game.sideboardChanges) {
        let separator1 = deckDrawer.cardSeparator(
          `Game ${gameIndex + 1} Sideboard Changes`
        );
        $("#ux_1").append(separator1);
        let sideboardDiv = $('<div class="card_lists_list"></div>');
        let additionsDiv = $('<div class="cardlist"></div>');
        if (
          game.sideboardChanges.added.length == 0 &&
          game.sideboardChanges.removed.length == 0
        ) {
          let separator2 = deckDrawer.cardSeparator("No changes");
          additionsDiv.append(separator2);
          additionsDiv.appendTo(sideboardDiv);
        } else {
          let separator3 = deckDrawer.cardSeparator("Sideboarded In");
          additionsDiv.append(separator3);
          drawCardList(additionsDiv, game.sideboardChanges.added);
          additionsDiv.appendTo(sideboardDiv);
          let removalsDiv = $('<div class="cardlist"></div>');
          let separator4 = deckDrawer.cardSeparator("Sideboarded Out");
          removalsDiv.append(separator4);
          drawCardList(removalsDiv, game.sideboardChanges.removed);
          removalsDiv.appendTo(sideboardDiv);
        }

        $("#ux_1").append(sideboardDiv);
      }

      let separator5 = deckDrawer.cardSeparator(
        `Game ${gameIndex + 1} Hands Drawn`
      );
      $("#ux_1").append(separator5);

      let handsDiv = $('<div class="card_lists_list"></div>');
      if (game && game.handsDrawn.length > 3) {
        // The default value of "center" apparently causes padding to be omitted in the calculation of how far
        // the scrolling should go. So, if there are enough hands to actually need scrolling, override it.
        handsDiv.css("justify-content", "start");
      }

      if (game) {
        game.handsDrawn.forEach((hand, i) => {
          let handDiv = $('<div class="cardlist"></div>');
          drawCardList(handDiv, hand);
          handDiv.appendTo(handsDiv);
          if (game.bestOf == 1 && i == 0) {
            let landDiv = $(
              '<div style="margin: auto; text-align: center;" tooltip-top tooltip-content=' +
                '"This hand was drawn with weighted odds that Wizards of the Coast has not disclosed because it is the first hand in a best-of-one match. ' +
                'It should be more likely to have a close to average number of lands, but only they could calculate the exact odds.">Land Percentile: Unknown</div>'
            );
            landDiv.appendTo(handDiv);
          } else {
            let likelihood = hypergeometricSignificance(
              game.handLands[i],
              game.deckSize,
              hand.length,
              game.landsInDeck
            );
            let landDiv = $(
              '<div style="margin: auto; text-align: center;" tooltip-top tooltip-content=' +
                '"The probability of a random hand of the same size having a number of lands at least as far from average as this one, ' +
                'calculated as if the distribution were continuous. Over a large number of games, this should average about 50%.">Land Likelihood: ' +
                (likelihood * 100).toFixed(2) +
                "%</div>"
            );
            landDiv.appendTo(handDiv);
          }
        });

        $("#ux_1").append(handsDiv);

        let separator6 = deckDrawer.cardSeparator(
          `Game ${gameIndex + 1} Shuffled Order`
        );
        $("#ux_1").append(separator6);
        let libraryDiv = $('<div class="library_list"></div>');
        let unique = makeId(4);
        let handSize = 8 - game.handsDrawn.length;

        game.shuffledOrder.forEach((cardId, libraryIndex) => {
          let rowShade =
            libraryIndex === handSize - 1
              ? "line_dark line_bottom_border"
              : libraryIndex < handSize - 1
              ? "line_dark"
              : (libraryIndex - handSize) % 2 === 0
              ? "line_light"
              : "line_dark";
          let cardDiv = $(`<div class="library_card ${rowShade}"></div>`);
          let tile = deckDrawer.cardTile(
            pd.settings.card_tile_style,
            cardId,
            unique + libraryIndex,
            "#" + (libraryIndex + 1)
          );
          cardDiv.append(tile);
          cardDiv.appendTo(libraryDiv);
        });
        let unknownCards = game.deckSize - game.shuffledOrder.length;
        if (unknownCards > 0) {
          let cardDiv = $('<div class="library_card"></div>');
          let tile = deckDrawer.cardTile(
            pd.settings.card_tile_style,
            null,
            unique + game.deckSize,
            unknownCards + "x"
          );
          cardDiv.append(tile);
          cardDiv.appendTo(libraryDiv);
        }

        let handExplanation = $(
          '<div class="library_hand">The opening hand is excluded from the below statistics to prevent mulligan choices from influencing them.</div>'
        );
        handExplanation.css("grid-row-end", "span " + (handSize - 1));
        handExplanation.appendTo(libraryDiv);

        let headerDiv = $(
          '<div class="library_header" tooltip-bottom tooltip-content="The number of lands in the library at or before this point.">Lands</div>'
        );
        headerDiv.css("grid-area", handSize + " / 2");
        headerDiv.appendTo(libraryDiv);
        headerDiv = $(
          '<div class="library_header" tooltip-bottom tooltip-content="The average number of lands expected in the library at or before this point.">Expected</div>'
        );
        headerDiv.css("grid-area", handSize + " / 3");
        headerDiv.appendTo(libraryDiv);
        headerDiv = $(
          '<div class="library_header" tooltip-bottom tooltip-content="The probability of the number of lands being at least this far from average, calculated as if the distribution were continuous. For details see footnote. Over a large number of games, this should average about 50%.">Likelihood</div>'
        );
        headerDiv.css("grid-area", handSize + " / 4");
        headerDiv.appendTo(libraryDiv);
        headerDiv = $(
          '<div class="library_header" tooltip-bottomright tooltip-content="The expected percentage of games where the actual number of lands is equal or less than this one. This is easier to calculate and more widely recognized but harder to assess the meaning of.">Percentile</div>'
        );
        headerDiv.css("grid-area", handSize + " / 5");
        headerDiv.appendTo(libraryDiv);

        game.libraryLands.forEach((count, index) => {
          let rowShade = index % 2 === 0 ? "line_light" : "line_dark";
          let landsDiv = $(
            `<div class="library_stat ${rowShade}">${count}</div>`
          );
          landsDiv.css("grid-area", handSize + index + 1 + " / 2");
          landsDiv.appendTo(libraryDiv);
          let expected = (
            ((index + 1) * game.landsInLibrary) /
            game.librarySize
          ).toFixed(2);
          let expectedDiv = $(
            `<div class="library_stat ${rowShade}">${expected}</div>`
          );
          expectedDiv.css("grid-area", handSize + index + 1 + " / 3");
          expectedDiv.appendTo(libraryDiv);
          let likelihood = hypergeometricSignificance(
            count,
            game.librarySize,
            index + 1,
            game.landsInLibrary
          );
          let likelihoodDiv = $(
            `<div class="library_stat ${rowShade}">${(likelihood * 100).toFixed(
              2
            )}</div>`
          );
          likelihoodDiv.css("grid-area", handSize + index + 1 + " / 4");
          likelihoodDiv.appendTo(libraryDiv);
          let percentile = hypergeometricRange(
            0,
            count,
            game.librarySize,
            index + 1,
            game.landsInLibrary
          );
          let percentileDiv = $(
            `<div class="library_stat ${rowShade}">${(percentile * 100).toFixed(
              2
            )}</div>`
          );
          percentileDiv.css("grid-area", handSize + index + 1 + " / 5");
          percentileDiv.appendTo(libraryDiv);
        });

        let footnoteLabel = $(
          '<div id="library_footnote_label' +
            gameIndex +
            '" class="library_footnote" tooltip-bottom ' +
            'tooltip-content="Click to show footnote" onclick="toggleVisibility(\'library_footnote_label' +
            gameIndex +
            "', 'library_footnote" +
            gameIndex +
            "')\">Footnote on Likelihood</div>"
        );
        footnoteLabel.css("grid-row", game.shuffledOrder.length + 1);
        footnoteLabel.appendTo(libraryDiv);
        let footnote = $(
          '<div id="library_footnote' +
            gameIndex +
            '" class="library_footnote hidden" ' +
            "onclick=\"toggleVisibility('library_footnote_label" +
            gameIndex +
            "', 'library_footnote" +
            gameIndex +
            "')\">" +
            "<p>The Likelihood column calculations are designed to enable assessment of fairness at a glance, in a way " +
            "that is related to percentile but differs in important ways. In short, it treats the count of lands as if " +
            "it were actually a bucket covering a continuous range, and calculates the cumulative probability of the " +
            "continuous value being at least as far from the median as a randomly selected value within the range covered " +
            "by the actual count. Importantly, this guarantees that the theoretical average will always be exactly 50%.</p>" +
            "<p>For values that are not the median, the result is halfway between the value's own percentile and the " +
            "next one up or down. For the median itself, the covered range is split and weighted for how much of it is " +
            "on each side of the 50th percentile. In both cases, the result's meaning is the same for each direction " +
            "from the 50th percentile, and scaled up by a factor of 2 to keep the possible range at 0% to 100%. " +
            "For precise details, see the source code on github.</p></div>"
        );
        footnote.css("grid-row", game.shuffledOrder.length + 1);
        footnote.appendTo(libraryDiv);

        $("#ux_1").append(libraryDiv);
      }
    });
  }

  $(".openLog").click(function() {
    openActionLog(id, $("#ux_1"));
  });

  $(".exportDeckPlayer").click(function() {
    var list = get_deck_export(match.playerDeck);
    ipcSend("set_clipboard", list);
  });
  $(".exportDeckStandardPlayer").click(function() {
    var list = get_deck_export_txt(match.playerDeck);
    ipcSend("export_txt", { str: list, name: match.playerDeck.name });
  });

  $(".exportDeck").click(function() {
    var list = get_deck_export(match.oppDeck);
    ipcSend("set_clipboard", list);
  });
  $(".exportDeckStandard").click(function() {
    var list = get_deck_export_txt(match.oppDeck);
    ipcSend("export_txt", {
      str: list,
      name: match.opponent.name.slice(0, -6) + "'s deck"
    });
  });

  $(".back").click(function() {
    changeBackground("default");
    $(".moving_ux").animate({ left: "0px" }, 250, "easeInOutCubic");
  });
}

//
exports.openActionLog = openActionLog;
function openActionLog(actionLogId) {
  $("#ux_2").html("");
  let top = $(
    `<div class="decklist_top"><div class="button back actionlog_back"></div><div class="deck_name">Action Log</div><div class="deck_name"></div></div>`
  );

  let actionLogContainer = $(`<div class="action_log_container"></div>`);

  let actionLogFile = path.join(actionLogDir, actionLogId + ".txt");
  let str = fs.readFileSync(actionLogFile).toString();

  let actionLog = str.split("\n");
  for (let line = 1; line < actionLog.length - 1; line += 3) {
    let seat = actionLog[line];
    let time = actionLog[line + 1];
    let str = actionLog[line + 2];
    str = striptags(str, ["log-card", "log-ability"]);

    var boxDiv = $('<div class="actionlog log_p' + seat + '"></div>');
    var timeDiv = $('<div class="actionlog_time">' + time + "</div>");
    var strDiv = $('<div class="actionlog_text">' + str + "</div>");

    boxDiv.append(timeDiv);
    boxDiv.append(strDiv);
    actionLogContainer.append(boxDiv);
  }

  $("#ux_2").append(top);
  $("#ux_2").append(actionLogContainer);

  $$("log-card").forEach(obj => {
    let grpId = obj.getAttribute("id");
    addCardHover(obj, db.card(grpId));
  });

  $$("log-ability").forEach(obj => {
    let grpId = obj.getAttribute("id");
    let abilityText = db.abilities[grpId] || "";
    obj.title = abilityText;
  });

  $(".moving_ux").animate({ left: "-200%" }, 250, "easeInOutCubic");

  $(".actionlog_back").click(() => {
    $(".moving_ux").animate({ left: "-100%" }, 250, "easeInOutCubic");
  });
}

//
exports.toggleVisibility = toggleVisibility;
function toggleVisibility(...ids) {
  ids.forEach(id => {
    const el = byId(id);
    if ([...el.classList].includes("hidden")) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  });
}

//
exports.addCheckbox = addCheckbox;
function addCheckbox(div, label, id, def, func) {
  const labelEl = createLabel(["check_container", "hover_label"], label);

  const checkbox = createInput([], "", { type: "checkbox", id, checked: def });
  checkbox.addEventListener("click", func);
  labelEl.appendChild(checkbox);
  labelEl.appendChild(createSpan(["checkmark"]));

  div.appendChild(labelEl);
  return labelEl;
}

//
exports.changeBackground = changeBackground;
function changeBackground(arg = "default", grpId = 0) {
  let artistLine = "";
  const _card = db.card(grpId);
  const topArtist = $$(".top_artist")[0];
  const mainWrapper = $$(".main_wrapper")[0];

  //console.log(arg, grpId, _card);
  if (arg === "default") {
    if (pd.settings.back_url && pd.settings.back_url !== "default") {
      topArtist.innerHTML = "";
      mainWrapper.style.backgroundImage = "url(" + pd.settings.back_url + ")";
    } else {
      topArtist.innerHTML = "Ghitu Lavarunner by Jesper Ejsing";
      mainWrapper.style.backgroundImage =
        "url(../images/Ghitu-Lavarunner-Dominaria-MtG-Art.jpg)";
    }
  } else if (_card) {
    // console.log(_card.images["art_crop"]);
    mainWrapper.style.backgroundImage =
      "url(https://img.scryfall.com/cards" + _card.images["art_crop"] + ")";
    try {
      artistLine = _card.name + " by " + _card.artist;
      topArtist.innerHTML = artistLine;
    } catch (e) {
      console.log(e);
    }
  } else if (fs.existsSync(arg)) {
    topArtist.innerHTML = "";
    mainWrapper.style.backgroundImage = "url(" + arg + ")";
  } else {
    topArtist.innerHTML = "";
    const xhr = new XMLHttpRequest();
    xhr.open("HEAD", arg);
    xhr.onload = function() {
      if (xhr.status === 200) {
        mainWrapper.style.backgroundImage = "url(" + arg + ")";
      } else {
        mainWrapper.style.backgroundImage = "";
      }
    };
    xhr.send();
  }
}

//
exports.formatPercent = formatPercent;
function formatPercent(value, config = {}) {
  return value.toLocaleString([], {
    style: "percent",
    maximumSignificantDigits: 2,
    ...config
  });
}

//
exports.formatNumber = formatNumber;
function formatNumber(value, config = {}) {
  return value.toLocaleString([], {
    style: "decimal",
    ...config
  });
}

//
exports.getWinrateClass = getWinrateClass;
function getWinrateClass(wr) {
  if (wr > 0.65) return "blue";
  if (wr > 0.55) return "green";
  if (wr < 0.45) return "orange";
  if (wr < 0.35) return "red";
  return "white";
}

//
exports.getEventWinLossClass = getEventWinLossClass;
function getEventWinLossClass(wlGate) {
  if (wlGate === undefined) return "white";
  if (wlGate.MaxWins === wlGate.CurrentWins) return "blue";
  if (wlGate.CurrentWins > wlGate.CurrentLosses) return "green";
  if (wlGate.CurrentWins * 2 > wlGate.CurrentLosses) return "orange";
  return "red";
}

//
exports.compareWinrates = compareWinrates;
function compareWinrates(a, b) {
  let _a = a.wins / a.losses;
  let _b = b.wins / b.losses;

  if (_a < _b) return 1;
  if (_a > _b) return -1;

  return compareColorWinrates(a, b);
}

//
exports.compareColorWinrates = compareColorWinrates;
function compareColorWinrates(a, b) {
  a = a.colors;
  b = b.colors;

  if (a.length < b.length) return -1;
  if (a.length > b.length) return 1;

  let sa = a.reduce(function(_a, _b) {
    return _a + _b;
  }, 0);
  let sb = b.reduce(function(_a, _b) {
    return _a + _b;
  }, 0);
  if (sa < sb) return -1;
  if (sa > sb) return 1;

  return 0;
}
