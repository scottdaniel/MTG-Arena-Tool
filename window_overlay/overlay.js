const { ipcRenderer: ipc, webFrame, remote } = require("electron");

if (!remote.app.isPackaged) {
  const { openNewGitHubIssue, debugInfo } = require("electron-util");
  const unhandled = require("electron-unhandled");
  unhandled({
    showDialog: true,
    reportButton: error => {
      openNewGitHubIssue({
        user: "Manuel-777",
        repo: "MTG-Arena-Tool",
        body: `\`\`\`\n${error.stack}\n\`\`\`\n\n---\n\n${debugInfo()}`
      });
    }
  });
}

const TransparencyMouseFix = require("electron-transparency-mouse-fix");
const fs = require("fs");
const striptags = require("striptags");
const $ = (window.$ = window.jQuery = require("jquery"));

const db = require("../shared/database");
const pd = require("../shared/player-data");
const Deck = require("../shared/deck.js");
const Colors = require("../shared/colors");
const deckDrawer = require("../shared/deck-drawer");
const { compare_cards, get_card_type_sort } = require("../shared/util");
const {
  addCardHover,
  attachOwnerhipStars,
  setRenderer
} = require("../shared/card-hover");
const { queryElements: $$, createDivision } = require("../shared/dom-fns");

const {
  DRAFT_RANKS,
  MANA,
  PACK_SIZES,
  IPC_BACKGROUND,
  IPC_OVERLAY,
  IPC_MAIN,
  OVERLAY_FULL,
  OVERLAY_LEFT,
  OVERLAY_ODDS,
  OVERLAY_SEEN,
  OVERLAY_DRAFT,
  OVERLAY_LOG
} = require("../shared/constants.js");

let landsCard = {
  id: 100,
  name: "Lands",
  set: "",
  artid: 0,
  type: "Special",
  cost: [],
  cmc: 0,
  rarity: "",
  cid: 0,
  frame: [1, 2, 3, 4, 5],
  artist: "",
  dfc: "None",
  collectible: false,
  craftable: false,
  dfcId: 0
};

let matchBeginTime = Date.now();
let priorityTimers = [];
let clockMode = 0;
let draftMode = 1;
let overlayMode = 0;
let overlayIndex = -1;
setRenderer(1);

let playerSeat = 0;
let oppName = "";
let turnPriority = 0;
let oddsSampleSize = 1;

let actionLog = [];

let currentMatch = null;

const fix = new TransparencyMouseFix({
  fixPointerEvents: "auto"
});

//
function get_ids_colors(list) {
  var colors = [];
  list.forEach(function(grpid) {
    var cdb = db.card(grpid);
    if (cdb) {
      //var card_name = cdb.name;
      var card_cost = cdb.cost;
      card_cost.forEach(function(c) {
        if (c.indexOf("w") !== -1 && !colors.includes(1)) colors.push(1);
        if (c.indexOf("u") !== -1 && !colors.includes(2)) colors.push(2);
        if (c.indexOf("b") !== -1 && !colors.includes(3)) colors.push(3);
        if (c.indexOf("r") !== -1 && !colors.includes(4)) colors.push(4);
        if (c.indexOf("g") !== -1 && !colors.includes(5)) colors.push(5);
      });
    }
  });

  return colors;
}

//
function compare_chances(a, b) {
  // Yeah this is lazy.. I know
  a = a.chance;
  b = b.chance;

  if (a > b) {
    return -1;
  }
  if (a < b) {
    return 1;
  }

  return 0;
}

//
function compare_draft_cards(a, b) {
  // Yeah this is lazy.. I know
  a = db.card(a);
  b = db.card(b);
  var as = get_card_type_sort(a.type);
  var bs = get_card_type_sort(b.type);

  // Order by type?
  if (as < bs) {
    return -1;
  }
  if (as > bs) {
    return 1;
  }

  // by cmc
  if (a.cmc < b.cmc) {
    return -1;
  }
  if (a.cmc > b.cmc) {
    return 1;
  }

  // then by name
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }

  return 0;
}

function ipc_send(method, arg, to = IPC_BACKGROUND) {
  if (method == "ipc_log") {
    //console.log("IPC LOG", arg);
  }
  ipc.send("ipc_switch", method, IPC_OVERLAY, arg, to);
}

window.setInterval(() => {
  updateClock();
}, 250);

function updateClock() {
  var hh, mm, ss;
  if (matchBeginTime == 0) {
    hh = 0;
    mm = 0;
    ss = 0;
  } else if (clockMode == 0) {
    let time = priorityTimers[1] / 1000;
    let now = new Date();
    if (turnPriority == 1 && time > 0) {
      time += (now - new Date(priorityTimers[0])) / 1000;
    }

    mm = Math.floor((time % 3600) / 60);
    mm = ("0" + mm).slice(-2);
    ss = Math.floor(time % 60);
    ss = ("0" + ss).slice(-2);
    $(".clock_priority_1").html(mm + ":" + ss);

    time = priorityTimers[2] / 1000;
    if (turnPriority == 2 && time > 0) {
      time += (now - new Date(priorityTimers[0])) / 1000;
    }

    mm = Math.floor((time % 3600) / 60);
    mm = ("0" + mm).slice(-2);
    ss = Math.floor(time % 60);
    ss = ("0" + ss).slice(-2);
    $(".clock_priority_2").html(mm + ":" + ss);
  } else if (clockMode == 1) {
    var diff = Math.floor((Date.now() - matchBeginTime) / 1000);
    hh = Math.floor(diff / 3600);
    mm = Math.floor((diff % 3600) / 60);
    ss = Math.floor(diff % 60);
    hh = ("0" + hh).slice(-2);
    mm = ("0" + mm).slice(-2);
    ss = ("0" + ss).slice(-2);
    $(".clock_elapsed").html(hh + ":" + mm + ":" + ss);
  } else if (clockMode == 2) {
    $(".clock_elapsed").html(new Date().toLocaleTimeString());
  }
}

function recreateClock() {
  if (clockMode == 0) {
    let p1 = $('<div class="clock_priority_1"></div>');
    let p2 = $('<div class="clock_priority_2"></div>');
    let p1name = oppName;
    let p2name = "You";
    if (playerSeat == 1) {
      p1name = "You";
      p2name = oppName;
    }
    $(".clock_turn").html(
      `<div class="clock_pname1 ${
        turnPriority == 1 ? "pname_priority" : ""
      }">${p1name}</div><div class="clock_pname2 ${
        turnPriority == 2 ? "pname_priority" : ""
      }">${p2name}</div>`
    );
    $(".clock_elapsed").html("");
    $(".clock_elapsed").append(p1);
    $(".clock_elapsed").append(p2);
  } else {
    $(".clock_turn").html("");
    $(".clock_elapsed").html("");

    if (turnPriority == playerSeat) {
      $(".clock_turn").html("You have priority.");
    } else {
      $(".clock_turn").html("Opponent has priority.");
    }
  }

  if (overlayMode == OVERLAY_DRAFT) {
    $(".clock_turn").html("");
  }

  updateClock();
}

ipc.on("set_overlay_index", (event, arg) => {
  overlayIndex = arg;
});

//
ipc.on("set_timer", function(event, arg) {
  if (arg == -1) {
    matchBeginTime = Date.now();
  } else if (arg !== 0) {
    //matchBeginTime = arg == 0 ? 0 : Date.parse(arg);
    matchBeginTime = Date.parse(arg);
  }
});

ipc.on("set_priority_timer", function(event, arg) {
  if (arg) {
    priorityTimers = arg;
  }
});

ipc.on("action_log", function(event, arg) {
  arg.str = striptags(arg.str, ["log-card", "log-ability"]);

  actionLog.push(arg);
  if (arg.seat == -99) {
    actionLog = [];
  }
  actionLog.sort(compare_logs);
  //console.log(arg.seat, arg.str);
});

ipc.on("settings_updated", () => {
  if (overlayIndex == -1) return;

  let settings = pd.settings.overlays[overlayIndex];

  overlayMode = settings.mode;

  change_background(pd.settings.back_url);

  webFrame.setZoomFactor(settings.scale / 100);

  $(".overlay_container").css("opacity", settings.alpha);
  $(".overlay_wrapper").css("opacity", settings.alpha_back);
  if (settings.alpha_back === 1) {
    $(".click-through").each(function() {
      $(this).css("pointer-events", "all");
    });
    $(document.body).css("background-color", "rgba(0,0,0,1)");
  } else {
    $(".click-through").each(function() {
      $(this).css("pointer-events", "inherit");
    });
    $(document.body).css("background-color", "rgba(0,0,0,0)");
  }

  $(".top").css("display", "");
  $(".overlay_deckname").css("display", "");
  $(".overlay_deckcolors").css("display", "");
  $(".overlay_decklist").css("display", "");
  $(".overlay_clock_container").css("display", "");
  $(".overlay_draft_container").attr("style", "");
  $(".overlay_deckname").attr("style", "");
  $(".overlay_deckcolors").attr("style", "");

  if (overlayMode !== OVERLAY_DRAFT) {
    $(".overlay_draft_container").hide();
  } else {
    $(".overlay_draft_container").show();
  }

  if (!settings.top) {
    hideDiv(".top");
    let style = "top: 0px !important;";
    $(".overlay_draft_container").attr("style", style);
  }
  if (!settings.title) {
    hideDiv(".overlay_deckname");
    hideDiv(".overlay_deckcolors");
  }
  if (!settings.deck) {
    hideDiv(".overlay_decklist");
    hideDiv(".overlay_draft_container");
  }
  if (!settings.clock || overlayMode == OVERLAY_DRAFT) {
    hideDiv(".overlay_clock_container");
  }

  if (currentMatch) {
    updateView();
  }
});

function hideDiv(div) {
  let _style = $(div).attr("style");
  if (_style == undefined) _style = "";
  _style += "display: none !important;";
  $(div).attr("style", _style);
}

//
ipc.on("set_hover", function(event, arg) {
  hoverCard(arg);
});

//
ipc.on("set_opponent", function(event, arg) {
  let cleanName = arg;
  if (cleanName && cleanName !== "Sparky") {
    cleanName = cleanName.slice(0, -6);
  }
  oppName = cleanName || "Opponent";
  recreateClock();
  $(".top_username").html(oppName);
});

//
ipc.on("set_opponent_rank", function(event, rank, title) {
  $(".top_rank")
    .css("background-position", rank * -48 + "px 0px")
    .attr("title", title);
});

let changedMode = true;

ipc.on("set_match", (event, arg) => {
  if (overlayMode == OVERLAY_DRAFT) return false;
  let settings = pd.settings.overlays[overlayIndex];

  if (settings.show == false && settings.show_always == false) return false;

  currentMatch = JSON.parse(arg);

  currentMatch.oppCards = new Deck(currentMatch.oppCards);

  let tempMain = currentMatch.playerCardsLeft.mainDeck;
  currentMatch.playerCardsLeft = new Deck(currentMatch.playerCardsLeft);
  currentMatch.playerCardsLeft.mainboard._list = tempMain;

  currentMatch.player.deck = new Deck(currentMatch.player.deck);
  currentMatch.player.originalDeck = new Deck(currentMatch.player.originalDeck);

  updateView();
});

function updateView() {
  if (overlayIndex == -1) return;
  let settings = pd.settings.overlays[overlayIndex];

  let cleanName =
    currentMatch && currentMatch.opponent && currentMatch.opponent.name;
  if (cleanName && cleanName !== "Sparky") {
    cleanName = cleanName.slice(0, -6);
  }
  oppName = cleanName || "Opponent";

  if (overlayMode !== OVERLAY_DRAFT) {
    $(".overlay_draft_container").hide();
  } else {
    $(".overlay_draft_container").show();
  }

  var doscroll = false;
  if (
    Math.round(
      $(".overlay_decklist")[0].scrollHeight - $(".overlay_decklist").height()
    ) -
      Math.round($(".overlay_decklist").scrollTop()) <
    32
  ) {
    doscroll = true;
  }

  $(".overlay_archetype").remove();
  $(".overlay_draft_container").hide();
  $(".overlay_decklist").html("");
  $(".overlay_deckcolors").html("");

  let deckListDiv;

  //
  // Action Log Mode
  //
  deckListDiv = $(".overlay_decklist");
  if (overlayMode == OVERLAY_LOG) {
    $(".overlay_deckname").html("Action Log");

    let initalTime = actionLog[0] ? new Date(actionLog[0].time) : new Date();
    actionLog.forEach(log => {
      var _date = new Date(log.time);
      var hh = ("0" + _date.getHours()).slice(-2);
      var mm = ("0" + _date.getMinutes()).slice(-2);
      var ss = ("0" + _date.getSeconds()).slice(-2);

      let secondsPast = Math.round((_date - initalTime) / 1000);

      var box = $('<div class="actionlog log_p' + log.seat + '"></div>');
      var time = $(
        `<div title="${hh}:${mm}:${ss}" class="actionlog_time">${secondsPast}s</div>`
      );
      var str = $('<div class="actionlog_text">' + log.str + "</div>");

      box.append(time);
      box.append(str);
      deckListDiv.append(box);
    });

    if (doscroll) {
      deckListDiv.scrollTop(deckListDiv[0].scrollHeight);
    }

    $$("log-card").forEach(obj => {
      let grpId = obj.getAttribute("id");
      addCardHover(obj, db.card(grpId));
    });

    $$("log-ability").forEach(obj => {
      let grpId = obj.getAttribute("id");
      let abilityText = db.abilities[grpId] || "";
      obj.title = abilityText;
    });

    return;
  }

  let deckToDraw = false;

  //
  // Opponent Cards Mode
  //
  if (overlayMode == OVERLAY_SEEN) {
    $('<div class="overlay_archetype"></div>').insertAfter(".overlay_deckname");
    $(".overlay_deckname").html("Played by " + oppName);
    $(".overlay_archetype").html(currentMatch.oppCards.archetype);

    currentMatch.oppCards.colors.get().forEach(color => {
      $(".overlay_deckcolors").append(
        '<div class="mana_s20 mana_' + MANA[color] + '"></div>'
      );
    });
    deckToDraw = currentMatch.oppCards;
  }

  //
  // Player Cards Odds Mode
  //
  if (overlayMode == OVERLAY_ODDS) {
    let cardsLeft = currentMatch.playerCardsLeft.mainboard.count();
    deckListDiv.append(
      `<div class="decklist_title">${cardsLeft} cards left</div>`
    );
    deckToDraw = currentMatch.playerCardsLeft;
  }

  //
  // Player Full Deck Mode
  //
  if (overlayMode == OVERLAY_FULL) {
    let cardsCount = currentMatch.player.deck.mainboard.count();
    deckListDiv.append(`<div class="decklist_title">${cardsCount} cards</div>`);
    deckToDraw = currentMatch.player.deck;
  }

  //
  // Player Cards Left Mode
  //
  if (overlayMode == OVERLAY_LEFT) {
    let cardsLeft = currentMatch.playerCardsLeft.mainboard.count();
    deckListDiv.append(
      `<div class="decklist_title">${cardsLeft} cards left</div>`
    );
    deckToDraw = currentMatch.playerCardsLeft;
  }

  if (
    overlayMode == OVERLAY_ODDS ||
    overlayMode == OVERLAY_FULL ||
    overlayMode == OVERLAY_LEFT
  ) {
    $(".overlay_deckname").html(deckToDraw.name);
    deckToDraw.colors.get().forEach(color => {
      $(".overlay_deckcolors").append(
        '<div class="mana_s20 mana_' + MANA[color] + '"></div>'
      );
    });
  }

  if (!deckToDraw) return;

  let sortFunc = compare_cards;
  if (overlayMode === OVERLAY_ODDS) {
    sortFunc = compare_chances;
  }

  let mainCards = deckToDraw.mainboard;
  mainCards.removeDuplicates();
  // group lands
  if (
    settings.lands &&
    overlayMode !== OVERLAY_DRAFT &&
    overlayMode !== OVERLAY_LOG
  ) {
    let landsNumber = 0;
    let landsChance = 0;
    let landsColors = new Colors();
    mainCards.get().forEach(card => {
      let cardObj = db.card(card.id);
      if (cardObj && cardObj.type.includes("Land", 0)) {
        landsNumber += card.quantity;
        landsChance += card.chance !== undefined ? card.chance : 0;
        delete card.chance;
        card.quantity = 0;
        if (cardObj.frame) {
          landsColors.addFromArray(cardObj.frame);
        }
      }
    });
    let lands = mainCards.add(landsCard, landsNumber, true);
    if (landsChance > 0) {
      lands.chance = landsChance;
    }

    // Set lands frame colors
    landsCard.frame = landsColors.get();
  }
  mainCards.get().sort(sortFunc);
  mainCards.get().forEach(card => {
    var grpId = card.id;
    let tile;
    if (overlayMode == OVERLAY_ODDS) {
      let quantity = (card.chance !== undefined ? card.chance : "0") + "%";
      if (!settings.lands || (settings.lands && quantity !== "0%")) {
        tile = deckDrawer.cardTile(
          pd.settings.card_tile_style,
          grpId,
          "a",
          quantity
        );
        deckListDiv.append(tile);
      }
    } else {
      tile = deckDrawer.cardTile(
        pd.settings.card_tile_style,
        grpId,
        "a",
        card.quantity
      );
      deckListDiv.append(tile);
    }

    // This is hackish.. the way we insert our custom elements in the
    // array of cards is wrong in the first place :()
    if (tile && card.id.id && card.id.id == 100) {
      attachLandOdds(tile, currentMatch.playerCardsOdds);
    }
  });
  if (settings.sideboard && deckToDraw.sideboard.count() > 0) {
    deckListDiv.append('<div class="card_tile_separator">Sideboard</div>');

    let sideCards = deckToDraw.sideboard;
    sideCards.removeDuplicates();
    sideCards.get().sort(sortFunc);

    sideCards.get().forEach(function(card) {
      var grpId = card.id;
      if (overlayMode == OVERLAY_ODDS) {
        let tile = deckDrawer.cardTile(
          pd.settings.card_tile_style,
          grpId,
          "a",
          "0%"
        );
        deckListDiv.append(tile);
      } else {
        let tile = deckDrawer.cardTile(
          pd.settings.card_tile_style,
          grpId,
          "a",
          card.quantity
        );
        deckListDiv.append(tile);
      }
    });
  }

  if (overlayMode == OVERLAY_ODDS) {
    drawDeckOdds();
  }
}

function attachLandOdds(tile, odds) {
  let landsDiv = createDivision(["lands_div"]);

  let createManaChanceDiv = function(odds, color) {
    let cont = createDivision(["mana_cont"], odds + "%");
    let div = createDivision(["mana_s16", "flex_end", "mana_" + color]);
    cont.appendChild(div);
    landsDiv.appendChild(cont);
  };

  if (odds.landW) createManaChanceDiv(odds.landW, "w");
  if (odds.landU) createManaChanceDiv(odds.landU, "u");
  if (odds.landB) createManaChanceDiv(odds.landB, "b");
  if (odds.landR) createManaChanceDiv(odds.landR, "r");
  if (odds.landG) createManaChanceDiv(odds.landG, "g");

  tile.addEventListener("mouseenter", () => {
    if ($$(".lands_div").length == 0) {
      $$(".overlay_hover_container")[0].appendChild(landsDiv);
    }
  });

  tile.addEventListener("mouseleave", () => {
    $$(".lands_div").forEach(div => {
      if (div) {
        $$(".overlay_hover_container")[0].removeChild(div);
      }
    });
  });
}

function drawDeckOdds() {
  let deckListDiv = $(".overlay_decklist");
  deckListDiv.append(`
          <div class="overlay_samplesize_container">
              <div class="odds_prev click-on"></div>
              <div class="odds_number">Sample size: ${oddsSampleSize}</div>
              <div class="odds_next click-on"></div>
          </div>
       `);

  deckListDiv.append('<div class="chance_title"></div>'); // Add some space

  let cardOdds = currentMatch.playerCardsOdds;

  deckListDiv.append(
    '<div class="chance_title">Creature: ' +
      (cardOdds.chanceCre != undefined ? cardOdds.chanceCre : "0") +
      "%</div>"
  );
  deckListDiv.append(
    '<div class="chance_title">Instant: ' +
      (cardOdds.chanceIns != undefined ? cardOdds.chanceIns : "0") +
      "%</div>"
  );
  deckListDiv.append(
    '<div class="chance_title">Sorcery: ' +
      (cardOdds.chanceSor != undefined ? cardOdds.chanceSor : "0") +
      "%</div>"
  );
  deckListDiv.append(
    '<div class="chance_title">Artifact: ' +
      (cardOdds.chanceArt != undefined ? cardOdds.chanceArt : "0") +
      "%</div>"
  );
  deckListDiv.append(
    '<div class="chance_title">Enchantment: ' +
      (cardOdds.chanceEnc != undefined ? cardOdds.chanceEnc : "0") +
      "%</div>"
  );
  deckListDiv.append(
    '<div class="chance_title">Planeswalker: ' +
      (cardOdds.chancePla != undefined ? cardOdds.chancePla : "0") +
      "%</div>"
  );
  deckListDiv.append(
    '<div class="chance_title">Land: ' +
      (cardOdds.chanceLan != undefined ? cardOdds.chanceLan : "0") +
      "%</div>"
  );

  //
  $(".odds_prev").click(function() {
    let cardsLeft = currentMatch.playerCardsLeft.mainboard.count();
    oddsSampleSize -= 1;
    if (oddsSampleSize < 1) {
      oddsSampleSize = cardsLeft - 1;
    }
    ipc_send("set_odds_samplesize", oddsSampleSize);
  });
  //
  $(".odds_next").click(function() {
    let cardsLeft = currentMatch.playerCardsLeft.mainboard.count();
    oddsSampleSize += 1;
    if (oddsSampleSize > cardsLeft - 1) {
      oddsSampleSize = 1;
    }
    ipc_send("set_odds_samplesize", oddsSampleSize);
  });
}

var currentDraft;
//
ipc.on("set_draft_cards", function(event, draft) {
  clockMode = 1;
  recreateClock();
  $(".overlay_draft_container").show();

  matchBeginTime = Date.now();
  currentDraft = draft;
  //draftPack = pack;
  //draftPick = picks;
  //packN = packn;
  //pickN = pickn;
  setDraft(currentDraft.packNumber, currentDraft.pickNumber);
});

//
ipc.on("set_turn", function(
  event,
  _we,
  _phase,
  _step,
  _number,
  _active,
  _priority,
  _decision
) {
  playerSeat = _we;
  if (
    turnPriority != _priority &&
    _priority == _we &&
    pd.settings.sound_priority
  ) {
    //    playBlip();
    let { Howl, Howler } = require("howler");
    let sound = new Howl({ src: ["../sounds/blip.mp3"] });
    Howler.volume(pd.settings.sound_priority_volume);
    sound.play();
  }
  //turnPhase = _phase;
  //turnStep = _step;
  //turnNumber = _number;
  //turnActive = _active;
  turnPriority = _priority;
  //turnDecision = _decision;
  if (clockMode == 0) {
    recreateClock();
  }
  if (clockMode > 0) {
    if (turnPriority == _we) {
      $(".clock_turn").html("You have priority.");
    } else {
      $(".clock_turn").html("Opponent has priority.");
    }
  }
});

let packN;
let pickN;

function setDraft(_packN = -1, _pickN = -1) {
  if (_packN == -1 || _pickN == -1) {
    packN = currentDraft.packNumber;
    pickN = currentDraft.pickNumber;
  } else {
    packN = _packN;
    pickN = _pickN;
  }
  $(".overlay_decklist").html("");
  $(".overlay_deckcolors").html("");
  let title = "Pack " + (packN + 1) + " - Pick " + (pickN + 1);
  if (packN === currentDraft.packNumber && pickN === currentDraft.pickNumber) {
    title += " - Current";
  }
  $(".overlay_deckname").html(title);

  let colors;
  if (draftMode == 0) {
    colors = get_ids_colors(currentDraft.pickedCards);
    colors.forEach(function(color) {
      $(".overlay_deckcolors").append(
        '<div class="mana_s20 mana_' + MANA[color] + '"></div>'
      );
    });

    currentDraft.pickedCards.sort(compare_draft_cards);

    currentDraft.pickedCards.forEach(function(grpId) {
      let tile = deckDrawer.cardTile(
        pd.settings.card_tile_style,
        grpId,
        "a",
        1
      );
      $(".overlay_decklist").append(tile);
    });
  } else if (draftMode == 1) {
    let key = "pack_" + packN + "pick_" + pickN;
    let draftPack = currentDraft[key];
    let pick = "";
    if (!draftPack) {
      draftPack = currentDraft.currentPack;
    } else {
      pick = draftPack.pick;
      draftPack = draftPack.pack;
    }

    console.log("Key", key, currentDraft);
    colors = get_ids_colors(draftPack);
    colors.forEach(function(color) {
      $(".overlay_deckcolors").append(
        '<div class="mana_s20 mana_' + MANA[color] + '"></div>'
      );
    });

    draftPack.sort(compare_draft_picks);

    draftPack.forEach(grpId => {
      const card = db.card(grpId) || { id: grpId, rank: 0 };
      const rank = card.rank;

      const od = $(".overlay_decklist");
      const cont = $('<div class="overlay_card_quantity"></div>');
      attachOwnerhipStars(card, cont[0]);

      cont.appendTo(od);
      let tile = deckDrawer.cardTile(
        pd.settings.card_tile_style,
        grpId,
        "a",
        DRAFT_RANKS[rank]
      );
      od.append(tile);
      if (grpId == pick) {
        tile.style.backgroundColor = "rgba(250, 229, 210, 0.66)";
      }
    });
  }
}

function compare_logs(a, b) {
  if (a.time < b.time) return -1;
  if (a.time > b.time) return 1;
  return 0;
}

function compare_draft_picks(a, b) {
  var arank = db.card(a).rank;
  var brank = db.card(b).rank;

  if (arank > brank) return -1;
  if (arank < brank) return 1;

  return 0;
}

function hoverCard(grpId) {
  if (grpId == undefined) {
    $(".overlay_hover").css("opacity", 0);
  } else {
    //let dfc = '';
    //if (db.card(grpId).dfc == 'DFC_Back') dfc = 'a';
    //if (db.card(grpId).dfc == 'DFC_Front')  dfc = 'b';
    //if (db.card(grpId).dfc == 'SplitHalf')  dfc = 'a';
    $(".overlay_hover").css("opacity", 1);
    $(".overlay_hover").attr(
      "src",
      "https://img.scryfall.com/cards" + db.card(grpId).images["normal"]
    );
    setTimeout(function() {
      $(".overlay_hover").css("opacity", 0);
    }, 10000);
  }
}

function change_background(arg) {
  if (!arg) return;
  if (arg == "default" || arg == "") {
    $(".overlay_bg_image").css("background-image", "");
  } else if (fs.existsSync(arg)) {
    $(".overlay_bg_image").css("background-image", "url(" + arg + ")");
  } else {
    $.ajax({
      url: arg,
      type: "HEAD",
      error: function() {
        $(".overlay_bg_image").css("background-image", "");
      },
      success: function() {
        $(".overlay_bg_image").css("background-image", "url(" + arg + ")");
      }
    });
  }
}

$(document).ready(function() {
  $(".overlay_draft_container").hide();
  recreateClock();
  //
  $(".clock_prev").click(function() {
    clockMode -= 1;
    if (clockMode < 0) {
      clockMode = 2;
    }
    recreateClock();
  });
  //
  $(".clock_next").click(function() {
    clockMode += 1;
    if (clockMode > 2) {
      clockMode = 0;
    }
    recreateClock();
  });

  //
  $(".draft_prev").click(function() {
    pickN -= 1;
    let packSize = (currentDraft && PACK_SIZES[currentDraft.set]) || 14;

    if (pickN < 0) {
      pickN = packSize;
      packN -= 1;
    }
    if (packN < 0) {
      pickN = currentDraft.pickNumber;
      packN = currentDraft.packNumber;
    }

    setDraft(packN, pickN);
  });
  //
  $(".draft_next").click(function() {
    pickN += 1;
    let packSize = (currentDraft && PACK_SIZES[currentDraft.set]) || 14;

    if (pickN > packSize) {
      pickN = 0;
      packN += 1;
    }

    if (pickN > currentDraft.pickNumber && packN == currentDraft.packNumber) {
      pickN = 0;
      packN = 0;
    }

    if (
      packN > currentDraft.packNumber ||
      (pickN == currentDraft.pickNumber && packN == currentDraft.packNumber)
    ) {
      setDraft();
    } else {
      setDraft(packN, pickN);
    }
  });

  //
  $(".close").click(function() {
    ipc_send("overlay_close", 1);
  });

  //
  $(".minimize").click(function() {
    ipc_send("overlay_minimize", overlayIndex);
  });

  //
  $(".settings").click(function() {
    ipc_send("force_open_overlay_settings", overlayIndex, IPC_MAIN);
  });

  $(".overlay_container").hover(
    function() {
      $(".overlay_container").css("opacity", 1);
    },
    function() {
      let settings = pd.settings.overlays[overlayIndex];
      if (settings.alpha !== 1) {
        $(".overlay_container").css("opacity", settings.alpha);
      }
    }
  );
});
