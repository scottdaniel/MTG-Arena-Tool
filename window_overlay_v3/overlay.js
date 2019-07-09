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

const striptags = require("striptags");

const db = require("../shared/database");
const pd = require("../shared/player-data");
const Deck = require("../shared/deck.js");
const Colors = require("../shared/colors");
const deckDrawer = require("../shared/deck-drawer");
const {
  compare_cards,
  deckManaCurve,
  deckTypesStats,
  get_card_type_sort
} = require("../shared/util");
const {
  addCardHover,
  attachOwnerhipStars,
  setRenderer
} = require("../shared/card-hover");
const { queryElements, createDiv } = require("../shared/dom-fns");

const {
  ARENA_MODE_IDLE,
  ARENA_MODE_MATCH,
  ARENA_MODE_DRAFT,
  DRAFT_RANKS,
  MANA,
  PACK_SIZES,
  IPC_BACKGROUND,
  IPC_OVERLAY,
  OVERLAY_FULL,
  OVERLAY_LEFT,
  OVERLAY_ODDS,
  OVERLAY_MIXED,
  OVERLAY_SEEN,
  OVERLAY_DRAFT,
  OVERLAY_LOG,
  OVERLAY_DRAFT_BREW,
  OVERLAY_DRAFT_MODES
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
  images: {
    art_crop: "../images/type_land.png"
  },
  dfcId: 0
};

let matchBeginTime = Date.now();
let priorityTimers = [];
let clockMode = [0, 0, 0, 0, 0];
setRenderer(1);

let playerSeat = 0;
let oppName = "";
let turnPriority = 0;
let oddsSampleSize = 1;

let actionLog = [];

let currentMatch = null;
let arenaState = ARENA_MODE_IDLE;

function ipcSend(method, arg, to = IPC_BACKGROUND) {
  ipc.send("ipc_switch", method, IPC_OVERLAY, arg, to);
}

ipc.on("set_arena_state", function(event, arg) {
  arenaState = arg;
});

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
  webFrame.setZoomFactor(pd.settings.overlays[0].scale / 100);
  pd.settings.overlays.forEach((_overlay, index) => {
    let overlayDom = document.getElementById("overlay_" + (index + 1));
    //console.log(index, overlay);

    overlayDom.style.height = _overlay.bounds.height + "px";
    overlayDom.style.width = _overlay.bounds.width + "px";
    overlayDom.style.left = _overlay.bounds.x + "px";
    overlayDom.style.top = _overlay.bounds.y + "px";
    overlayDom.style.opacity = getVisible(_overlay);

    let deckNameDom = `#overlay_${index + 1} .overlay_deckname`;
    let deckColorsDom = `#overlay_${index + 1} .overlay_deckcolors`;
    let deckListDom = `#overlay_${index + 1} .overlay_decklist`;
    let clockDom = `#overlay_${index + 1} .overlay_clock_container`;

    queryElements(deckNameDom)[0].innerHTML = "";
    queryElements(deckNameDom)[0].style = "";
    queryElements(deckNameDom)[0].style.display = _overlay.title ? "" : "none";
    queryElements(deckColorsDom)[0].innerHTML = "";
    queryElements(deckColorsDom)[0].style = "";
    queryElements(deckColorsDom)[0].style.display = _overlay.title
      ? ""
      : "none";

    queryElements(deckListDom)[0].innerHTML = "";
    queryElements(deckListDom)[0].style.display = _overlay.deck ? "" : "none";

    const showClock =
      _overlay.clock && !OVERLAY_DRAFT_MODES.includes(_overlay.mode);
    queryElements(clockDom)[0].style.display = showClock ? "" : "none";

    // Only issue with this is when two overlays are on top of eachother
    // But when we allow editing the layour we should not allow that
    overlayDom.removeEventListener("mouseenter", setIgnoreFalse);
    overlayDom.removeEventListener("mouseleave", setIgnoreTrue);
    if (_overlay.show) {
      overlayDom.addEventListener("mouseenter", setIgnoreFalse);
      overlayDom.addEventListener("mouseleave", setIgnoreTrue);
    }
  });
});

function getVisible(settings) {
  if (!settings) return;

  const currentModeApplies =
    (OVERLAY_DRAFT_MODES.includes(settings.mode) &&
      arenaState === ARENA_MODE_DRAFT) ||
    (!OVERLAY_DRAFT_MODES.includes(settings.mode) &&
      arenaState === ARENA_MODE_MATCH);

  const shouldShow =
    settings.show && (currentModeApplies || settings.show_always);

  return shouldShow ? "1" : "0";
}

function setIgnoreTrue() {
  remote.getCurrentWindow().setIgnoreMouseEvents(true, { forward: true });
}

function setIgnoreFalse() {
  remote.getCurrentWindow().setIgnoreMouseEvents(false);
}

ipc.on("set_draft_cards", (event, draft) => {
  recreateClock();
  matchBeginTime = Date.now();
  currentDraft = draft;
  updateDraftView(currentDraft.packNumber, currentDraft.pickNumber);
});

ipc.on("set_turn", (event, arg) => {
  let { playerSeat: _we, turnPriority: _priority } = arg;
  playerSeat = _we;
  if (
    turnPriority != _priority &&
    _priority == playerSeat &&
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

  pd.settings.overlays.forEach((_overlay, index) => {
    let clockTurnDom = `#overlay_${index + 1} .clock_turn`;
    if (clockMode[index] == 0) {
      recreateClock(index);
    }
    if (clockMode > 0) {
      if (turnPriority === playerSeat) {
        queryElements(clockTurnDom)[0].innerHTML = "You have priority.";
      } else {
        queryElements(clockTurnDom)[0].innerHTML = "Opponent has priority.";
      }
    }
  });
});

ipc.on("set_match", (event, arg) => {
  currentMatch = JSON.parse(arg);
  currentMatch.oppCards = new Deck(currentMatch.oppCards);

  let tempMain = currentMatch.playerCardsLeft.mainDeck;
  currentMatch.playerCardsLeft = new Deck(currentMatch.playerCardsLeft);
  currentMatch.playerCardsLeft.mainboard._list = tempMain;

  currentMatch.player.deck = new Deck(currentMatch.player.deck);
  currentMatch.player.originalDeck = new Deck(currentMatch.player.originalDeck);

  pd.settings.overlays.forEach((_overlay, index) => {
    if (_overlay.show || _overlay.show_always) {
      if (OVERLAY_DRAFT_MODES.includes(_overlay.mode)) {
        updateDraftView(index);
      } else {
        updateMatchView(index);
      }
    }
  });
});

function updateMatchView(index) {
  if (!currentMatch) return;
  let settings = pd.settings.overlays[index];

  let deckNameDom = `#overlay_${index + 1} .overlay_deckname`;
  let deckColorsDom = `#overlay_${index + 1} .overlay_deckcolors`;
  let deckListDom = `#overlay_${index + 1} .overlay_decklist`;
  let archDom = `#overlay_${index + 1} .overlay_archetype`;

  let cleanName =
    currentMatch && currentMatch.opponent && currentMatch.opponent.name;
  if (cleanName && cleanName !== "Sparky") {
    cleanName = cleanName.slice(0, -6);
  }
  oppName = cleanName || "Opponent";

  const container = queryElements(deckListDom)[0];
  const doscroll =
    Math.round(
      container.scrollHeight - container.offsetHeight - container.scrollTop
    ) < 32;

  if (queryElements(archDom)[0]) {
    queryElements(archDom)[0].remove();
  }

  queryElements(deckListDom)[0].innerHTML = "";
  queryElements(deckColorsDom)[0].innerHTML = "";
  queryElements(deckNameDom)[0].innerHTML = "";

  let deckListDiv;
  let overlayMode = settings.mode;

  deckListDiv = queryElements(deckListDom)[0];
  if (overlayMode === OVERLAY_LOG) {
    // Action Log Mode
    queryElements(deckNameDom)[0].innerHTML = "Action Log";

    let initalTime = actionLog[0] ? new Date(actionLog[0].time) : new Date();
    actionLog.forEach(log => {
      const _date = new Date(log.time);
      const hh = ("0" + _date.getHours()).slice(-2);
      const mm = ("0" + _date.getMinutes()).slice(-2);
      const ss = ("0" + _date.getSeconds()).slice(-2);
      const secondsPast = Math.round((_date - initalTime) / 1000);

      const box = createDiv(["actionlog", "log_p" + log.seat]);
      const time = createDiv(["actionlog_time"], secondsPast + "s", {
        title: `${hh}:${mm}:${ss}`
      });
      const str = createDiv(["actionlog_text"], log.str);

      box.appendChild(time);
      box.appendChild(str);
      deckListDiv.appendChild(box);
    });

    if (doscroll) {
      deckListDiv.scrollTop = deckListDiv.scrollHeight;
    }

    queryElements("log-card").forEach(obj => {
      const grpId = obj.getAttribute("id");
      addCardHover(obj, db.card(grpId));
    });

    queryElements("log-ability").forEach(obj => {
      const grpId = obj.getAttribute("id");
      const abilityText = db.abilities[grpId] || "";
      obj.title = abilityText;
    });

    return;
  }

  let deckToDraw = false;

  if (overlayMode === OVERLAY_FULL) {
    // Full Deck Mode
    let cardsCount = currentMatch.player.deck.mainboard.count();
    deckListDiv.appendChild(
      createDiv(["decklist_title"], "Full Deck: " + cardsCount + " cards")
    );
    deckToDraw = currentMatch.player.deck;
  } else if (overlayMode === OVERLAY_LEFT) {
    // Library Mode
    let cardsLeft = currentMatch.playerCardsLeft.mainboard.count();
    deckListDiv.appendChild(
      createDiv(["decklist_title"], "Library: " + cardsLeft + " cards")
    );
    deckToDraw = currentMatch.playerCardsLeft;
  } else if (overlayMode === OVERLAY_ODDS || overlayMode === OVERLAY_MIXED) {
    // Next Draw Odds Mode
    let cardsLeft = currentMatch.playerCardsLeft.mainboard.count();
    deckListDiv.appendChild(
      createDiv(
        ["decklist_title"],
        `Next Draw: ${oddsSampleSize}/${cardsLeft} cards`
      )
    );
    deckToDraw = currentMatch.playerCardsLeft;
  } else if (overlayMode === OVERLAY_SEEN) {
    // Opponent Cards Mode
    const deckName = queryElements(deckNameDom)[0];
    deckName.parentNode.insertBefore(
      createDiv(["overlay_archetype"]),
      deckName.nextSibling
    );
    deckName.innerHTML = "Played by " + oppName;
    queryElements(archDom)[0].innerHTML = currentMatch.oppArchetype;

    currentMatch.oppCards.colors
      .get()
      .forEach(color =>
        queryElements(deckColorsDom)[0].appendChild(
          createDiv(["mana_s20", "mana_" + MANA[color]])
        )
      );
    deckToDraw = currentMatch.oppCards;
  }

  if (!deckToDraw) return;

  // Deck colors
  if (
    [OVERLAY_ODDS, OVERLAY_MIXED, OVERLAY_FULL, OVERLAY_LEFT].includes(
      overlayMode
    )
  ) {
    queryElements(deckNameDom)[0].innerHTML = deckToDraw.name;
    deckToDraw.colors
      .get()
      .forEach(color =>
        queryElements(deckColorsDom)[0].appendChild(
          createDiv(["mana_s20", "mana_" + MANA[color]])
        )
      );
  }

  let sortFunc = compare_cards;
  if (overlayMode === OVERLAY_ODDS || overlayMode == OVERLAY_MIXED) {
    sortFunc = compare_chances;
  }

  let mainCards = deckToDraw.mainboard;
  mainCards.removeDuplicates();
  // group lands
  if (
    settings.lands &&
    [OVERLAY_FULL, OVERLAY_LEFT, OVERLAY_ODDS, OVERLAY_MIXED].includes(
      overlayMode
    )
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
    let tile;
    if (overlayMode === OVERLAY_MIXED) {
      let odds = (card.chance !== undefined ? card.chance : "0") + "%";
      let q = card.quantity;

      if (!settings.lands || (settings.lands && odds !== "0%")) {
        tile = deckDrawer.cardTile(pd.settings.card_tile_style, card.id, "a", {
          quantity: q,
          odds: odds
        });
      }
    } else if (overlayMode === OVERLAY_ODDS) {
      let quantity = (card.chance !== undefined ? card.chance : "0") + "%";
      if (!settings.lands || (settings.lands && quantity !== "0%")) {
        tile = deckDrawer.cardTile(
          pd.settings.card_tile_style,
          card.id,
          "a",
          quantity
        );
      }
    } else {
      tile = deckDrawer.cardTile(
        pd.settings.card_tile_style,
        card.id,
        "a",
        card.quantity
      );
    }
    if (tile) deckListDiv.appendChild(tile);

    // This is hackish.. the way we insert our custom elements in the
    // array of cards is wrong in the first place :()
    if (tile && card.id.id && card.id.id == 100) {
      attachLandOdds(tile, currentMatch.playerCardsOdds);
    }
  });
  if (settings.sideboard && deckToDraw.sideboard.count() > 0) {
    deckListDiv.appendChild(createDiv(["card_tile_separator"], "Sideboard"));

    const sideCards = deckToDraw.sideboard;
    sideCards.removeDuplicates();
    sideCards.get().sort(sortFunc);

    sideCards.get().forEach(function(card) {
      if (overlayMode === OVERLAY_ODDS || overlayMode === OVERLAY_MIXED) {
        const tile = deckDrawer.cardTile(
          pd.settings.card_tile_style,
          card.id,
          "a",
          "0%"
        );
        deckListDiv.appendChild(tile);
      } else {
        const tile = deckDrawer.cardTile(
          pd.settings.card_tile_style,
          card.id,
          "a",
          card.quantity
        );
        if (tile) deckListDiv.appendChild(tile);
      }
    });
  }

  if (overlayMode === OVERLAY_ODDS || overlayMode === OVERLAY_MIXED) {
    drawDeckOdds(index);
    return;
  }

  const deck = deckToDraw.getSave();
  if (settings.type_counts) {
    deckListDiv.appendChild(deckTypesStats(deck));
  }
  if (settings.mana_curve) {
    deckListDiv.appendChild(deckManaCurve(deck));
  }
}

function attachLandOdds(tile, odds) {
  let landsDiv = createDiv(["lands_div"]);

  let createManaChanceDiv = function(odds, color) {
    let cont = createDiv(["mana_cont"], odds + "%");
    let div = createDiv(["mana_s16", "flex_end", "mana_" + color]);
    cont.appendChild(div);
    landsDiv.appendChild(cont);
  };

  if (odds.landW) createManaChanceDiv(odds.landW, "w");
  if (odds.landU) createManaChanceDiv(odds.landU, "u");
  if (odds.landB) createManaChanceDiv(odds.landB, "b");
  if (odds.landR) createManaChanceDiv(odds.landR, "r");
  if (odds.landG) createManaChanceDiv(odds.landG, "g");

  tile.addEventListener("mouseenter", () => {
    if (queryElements(".lands_div").length == 0) {
      queryElements(".overlay_hover_container")[0].appendChild(landsDiv);
    }
  });

  tile.addEventListener("mouseleave", () => {
    queryElements(".lands_div").forEach(div => {
      if (div) {
        queryElements(".overlay_hover_container")[0].removeChild(div);
      }
    });
  });
}

function drawDeckOdds(index) {
  let deckListDom = `#overlay_${index + 1} .overlay_decklist`;
  let deckListDiv = queryElements(deckListDom)[0];

  const navCont = createDiv(["overlay_samplesize_container"]);
  navCont.appendChild(createDiv(["odds_prev", "click-on"]));
  navCont.appendChild(
    createDiv(["odds_number"], "Sample size: " + oddsSampleSize)
  );
  navCont.appendChild(createDiv(["odds_next", "click-on"]));
  deckListDiv.appendChild(navCont);

  deckListDiv.appendChild(createDiv(["chance_title"])); // Add some space

  let cardOdds = currentMatch.playerCardsOdds;

  deckListDiv.appendChild(
    createDiv(
      ["chance_title"],
      "Creature: " +
        (cardOdds.chanceCre != undefined ? cardOdds.chanceCre : "0") +
        "%"
    )
  );
  deckListDiv.appendChild(
    createDiv(
      ["chance_title"],
      "Instant: " +
        (cardOdds.chanceIns != undefined ? cardOdds.chanceIns : "0") +
        "%"
    )
  );
  deckListDiv.appendChild(
    createDiv(
      ["chance_title"],
      "Sorcery: " +
        (cardOdds.chanceSor != undefined ? cardOdds.chanceSor : "0") +
        "%"
    )
  );
  deckListDiv.appendChild(
    createDiv(
      ["chance_title"],
      "Artifact: " +
        (cardOdds.chanceArt != undefined ? cardOdds.chanceArt : "0") +
        "%"
    )
  );
  deckListDiv.appendChild(
    createDiv(
      ["chance_title"],
      "Enchantment: " +
        (cardOdds.chanceEnc != undefined ? cardOdds.chanceEnc : "0") +
        "%"
    )
  );
  deckListDiv.appendChild(
    createDiv(
      ["chance_title"],
      "Planeswalker: " +
        (cardOdds.chancePla != undefined ? cardOdds.chancePla : "0") +
        "%"
    )
  );
  deckListDiv.appendChild(
    createDiv(
      ["chance_title"],
      "Land: " +
        (cardOdds.chanceLan != undefined ? cardOdds.chanceLan : "0") +
        "%"
    )
  );

  let oddNextDom = `#overlay_${index + 1} .odds_prev`;
  let oddPrevDom = `#overlay_${index + 1} .odds_next`;
  //
  queryElements(oddPrevDom)[0].addEventListener("click", function() {
    let cardsLeft = currentMatch.playerCardsLeft.mainboard.count();
    oddsSampleSize -= 1;
    if (oddsSampleSize < 1) {
      oddsSampleSize = cardsLeft - 1;
    }
    ipcSend("set_odds_samplesize", oddsSampleSize);
  });
  //
  queryElements(oddNextDom)[0].addEventListener("click", function() {
    let cardsLeft = currentMatch.playerCardsLeft.mainboard.count();
    oddsSampleSize += 1;
    if (oddsSampleSize > cardsLeft - 1) {
      oddsSampleSize = 1;
    }
    ipcSend("set_odds_samplesize", oddsSampleSize);
  });
}

var currentDraft;
let packN;
let pickN;

function updateDraftView(index, _packN = -1, _pickN = -1) {
  if (!currentDraft) return;
  const settings = pd.settings.overlays[index];
  if (_packN === -1 || _pickN === -1) {
    packN = currentDraft.packNumber;
    pickN = currentDraft.pickNumber;
  } else {
    packN = _packN;
    pickN = _pickN;
  }
  const key = "pack_" + packN + "pick_" + pickN;

  let deckNameDom = `#overlay_${index + 1} .overlay_deckname`;
  let deckColorsDom = `#overlay_${index + 1} .overlay_deckcolors`;
  let deckListDom = `#overlay_${index + 1} .overlay_decklist`;

  queryElements(deckListDom)[0].innerHTML = "";
  queryElements(deckColorsDom)[0].innerHTML = "";

  let overlayMode = settings.mode;
  if (overlayMode === OVERLAY_DRAFT) {
    const titleDiv = queryElements(deckNameDom)[0];
    titleDiv.style.display = "";
    let title = "Pack " + (packN + 1) + " - Pick " + (pickN + 1);
    if (
      packN === currentDraft.packNumber &&
      pickN === currentDraft.pickNumber
    ) {
      title += " - Current";
    }
    titleDiv.innerHTML = title;

    const controlCont = createDiv(["overlay_draft_container", "click-on"]);
    if (settings.top) controlCont.style.top = "32px";

    const draftPrev = createDiv(["draft_prev"]);
    draftPrev.addEventListener("click", function() {
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

      updateDraftView(index, packN, pickN);
    });
    controlCont.appendChild(draftPrev);

    controlCont.appendChild(createDiv(["draft_title"]));

    const draftNext = createDiv(["draft_next"]);
    draftNext.addEventListener("click", function() {
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
        updateDraftView(index);
      } else {
        updateDraftView(index, packN, pickN);
      }
    });
    controlCont.appendChild(draftNext);

    titleDiv.appendChild(controlCont);

    let draftPack = currentDraft[key];
    let pick = "";
    if (!draftPack) {
      draftPack = currentDraft.currentPack || [];
    } else {
      pick = draftPack.pick;
      draftPack = draftPack.pack;
    }

    const colors = get_ids_colors(draftPack);
    colors.forEach(function(color) {
      $$(".overlay_deckcolors")[0].appendChild(
        createDiv(["mana_s20", "mana_" + MANA[color]])
      );
    });

    draftPack.sort(compare_draft_picks);

    const deckListDiv = queryElements(deckListDom)[0];
    deckListDiv.style.display = "";

    draftPack.forEach(grpId => {
      const card = db.card(grpId) || { id: grpId, rank: 0 };
      const rank = card.rank;

      const cont = createDiv(["overlay_card_quantity"]);
      attachOwnerhipStars(card, cont);
      deckListDiv.appendChild(cont);

      const tile = deckDrawer.cardTile(
        pd.settings.card_tile_style,
        grpId,
        "a",
        DRAFT_RANKS[rank]
      );
      deckListDiv.appendChild(tile);
      if (grpId == pick) {
        tile.style.backgroundColor = "rgba(250, 229, 210, 0.66)";
      }
    });
  } else if (overlayMode === OVERLAY_DRAFT_BREW) {
    const deckListDiv = queryElements(deckListDom)[0];
    const deckToDraw = new Deck(
      { name: "All Picks" },
      currentDraft.pickedCards
    );

    queryElements(deckNameDom)[0].innerHTML = deckToDraw.name;
    deckToDraw.colors
      .get()
      .forEach(color =>
        queryElements(deckColorsDom)[0].appendChild(
          createDiv(["mana_s20", "mana_" + MANA[color]])
        )
      );
    const mainCards = deckToDraw.mainboard;
    mainCards.removeDuplicates();
    mainCards.get().sort(compare_cards);
    mainCards.get().forEach(card => {
      const tile = deckDrawer.cardTile(
        pd.settings.card_tile_style,
        card.id,
        "a",
        card.quantity
      );
      if (tile) deckListDiv.appendChild(tile);
    });

    const deck = deckToDraw.getSave();
    if (settings.type_counts) {
      deckListDiv.appendChild(deckTypesStats(deck));
    }
    if (settings.mana_curve) {
      deckListDiv.appendChild(deckManaCurve(deck));
    }
  }
}

window.setInterval(() => {
  pd.settings.overlays.forEach((_overlay, index) => {
    updateClock(index);
  });
}, 250);

function updateClock(index) {
  let hh, mm, ss;
  let clockPriority1Dom = `#overlay_${index + 1} .clock_priority_1`;
  let clockPriority2Dom = `#overlay_${index + 1} .clock_priority_1`;
  let clockElapsedDom = `#overlay_${index + 1} .clock_elapsed`;

  if (matchBeginTime === 0) {
    hh = 0;
    mm = 0;
    ss = 0;
  } else if (clockMode === 0) {
    let time = priorityTimers[1] / 1000;
    const now = new Date();
    if (turnPriority === 1 && time > 0) {
      time += (now - new Date(priorityTimers[0])) / 1000;
    }

    mm = Math.floor((time % 3600) / 60);
    mm = ("0" + mm).slice(-2);
    ss = Math.floor(time % 60);
    ss = ("0" + ss).slice(-2);
    queryElements(clockPriority1Dom)[0].innerHTML = mm + ":" + ss;

    time = priorityTimers[2] / 1000;
    if (turnPriority === 2 && time > 0) {
      time += (now - new Date(priorityTimers[0])) / 1000;
    }

    mm = Math.floor((time % 3600) / 60);
    mm = ("0" + mm).slice(-2);
    ss = Math.floor(time % 60);
    ss = ("0" + ss).slice(-2);
    queryElements(clockPriority2Dom)[0].innerHTML = mm + ":" + ss;
  } else if (clockMode === 1) {
    const diff = Math.floor((Date.now() - matchBeginTime) / 1000);
    hh = Math.floor(diff / 3600);
    mm = Math.floor((diff % 3600) / 60);
    ss = Math.floor(diff % 60);
    hh = ("0" + hh).slice(-2);
    mm = ("0" + mm).slice(-2);
    ss = ("0" + ss).slice(-2);
    queryElements(clockElapsedDom)[0].innerHTML = hh + ":" + mm + ":" + ss;
  } else if (clockMode === 2) {
    queryElements(
      clockElapsedDom
    )[0].innerHTML = new Date().toLocaleTimeString();
  }
}

function recreateClock(index) {
  let clockTurnDom = `#overlay_${index + 1} .clock_turn`;
  let clockElapsedDom = `#overlay_${index + 1} .clock_elapsed`;

  const clockTurn = queryElements(clockTurnDom)[0];
  const clockElapsed = queryElements(clockElapsedDom)[0];

  if (clockMode === 0) {
    const p1 = createDiv(["clock_priority_1"]);
    const p2 = createDiv(["clock_priority_2"]);
    let p1name = oppName;
    let p2name = "You";
    if (playerSeat == 1) {
      p1name = "You";
      p2name = oppName;
    }
    clockTurn.innerHTML = `<div class="clock_pname1 ${
      turnPriority == 1 ? "pname_priority" : ""
    }">${p1name}</div><div class="clock_pname2 ${
      turnPriority == 2 ? "pname_priority" : ""
    }">${p2name}</div>`;

    clockElapsed.innerHTML = "";
    clockElapsed.appendChild(p1);
    clockElapsed.appendChild(p2);
  } else {
    clockTurn.innerHTML = "";
    clockElapsed.innerHTML = "";

    if (turnPriority == playerSeat) {
      clockTurn.innerHTML = "You have priority.";
    } else {
      clockTurn.innerHTML = "Opponent has priority.";
    }
  }

  if (OVERLAY_DRAFT_MODES.includes(pd.settings.overlays[index].mode)) {
    clockTurn.innerHTML = "";
  }

  updateClock();
}

function ready(fn) {
  if (
    document.attachEvent
      ? document.readyState === "complete"
      : document.readyState !== "loading"
  ) {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

ready(function() {
  //
  queryElements(".overlay_container").forEach(node => {
    node.innerHTML = `
      <div class="overlay_deckname"></div>
      <div class="overlay_deckcolors"></div>
      <div class="overlay_decklist"></div>
      <div class="overlay_clock_container">
          <div class="clock_prev"></div>
          <div class="clock_turn"></div>
          <div class="clock_elapsed"></div>
          <div class="clock_next"></div>
      </div>`;
  });
});

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
