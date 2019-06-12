const autocomplete = require("../shared/autocomplete");
const { MANA, RANKS } = require("../shared/constants");
const db = require("../shared/database");
const pd = require("../shared/player-data");
const { selectAdd } = require("../shared/select");
const { createDivision } = require("../shared/dom-fns");
const {
  get_deck_colors,
  get_rank_index_16,
  getReadableEvent,
  makeId,
  timeSince,
  toMMSS
} = require("../shared/util");

const Aggregator = require("./aggregator");
const DataScroller = require("./data-scroller");
const FilterPanel = require("./filter-panel");
const ListItem = require("./list-item");
const StatsPanel = require("./stats-panel");
const {
  formatPercent,
  getLocalState,
  getTagColor,
  ipcSend,
  makeResizable,
  openDraft,
  openMatch,
  showLoadingBars,
  toggleArchived
} = require("./renderer-util");

const { DEFAULT_DECK, RANKED_CONST, RANKED_DRAFT, DATE_SEASON } = Aggregator;
let filters = Aggregator.getDefaultFilters();
let filteredMatches;
let sortedHistory;
const tagPrompt = "set archetype";

function getNextRank(currentRank) {
  var rankIndex = RANKS.indexOf(currentRank);
  if (rankIndex < RANKS.length - 1) {
    return RANKS[rankIndex + 1];
  } else {
    return undefined;
  }
}

function setFilters(selected = {}) {
  if (selected.eventId || selected.date) {
    // clear all dependent filters
    filters = {
      ...Aggregator.getDefaultFilters(),
      date: filters.date,
      eventId: filters.eventId,
      showArchived: filters.showArchived,
      ...selected
    };
  } else if (selected.tag || selected.colors) {
    // tag or colors filters resets deck filter
    filters = {
      ...filters,
      deckId: DEFAULT_DECK,
      ...selected
    };
  } else {
    // default case
    filters = { ...filters, ...selected };
  }
}

function openHistoryTab(_filters = {}, dataIndex = 25, scrollTop = 0) {
  var mainDiv = document.getElementById("ux_0");
  var div, d;
  mainDiv.classList.add("flex_item");

  sortedHistory = [...pd.history];
  sortedHistory.sort(compare_matches);

  mainDiv.innerHTML = "";

  let wrap_r = createDivision(["wrapper_column", "sidebar_column_l"]);
  wrap_r.style.width = pd.settings.right_panel_width + "px";
  wrap_r.style.flex = `0 0 ${pd.settings.right_panel_width}px`;

  div = createDivision(["ranks_history"]);
  div.style.padding = "0 12px";

  setFilters(_filters);
  filteredMatches = new Aggregator(filters);

  let rankedStats;
  const showingRanked =
    filters.date === DATE_SEASON &&
    (filters.eventId === RANKED_CONST || filters.eventId === RANKED_DRAFT);
  if (showingRanked) {
    const rankStats = createDivision(["ranks_stats"]);
    renderRanksStats(rankStats, filteredMatches);
    rankStats.style.paddingBottom = "16px";
    div.appendChild(rankStats);
    rankedStats =
      filters.eventId === RANKED_CONST
        ? filteredMatches.constructedStats
        : filteredMatches.limitedStats;
  }
  if (filters.eventId === RANKED_CONST) {
    rankedStats = filteredMatches.constructedStats;
  }

  const statsPanel = new StatsPanel(
    "history_top",
    filteredMatches,
    pd.settings.right_panel_width,
    true,
    rankedStats,
    filters.eventId === RANKED_DRAFT
  );
  const historyTopWinrate = statsPanel.render();
  div.appendChild(historyTopWinrate);

  let wrap_l = createDivision(["wrapper_column"]);
  wrap_l.setAttribute("id", "history_column");

  d = createDivision(["list_fill"]);

  let drag = createDivision(["dragger"]);
  wrap_r.appendChild(drag);
  makeResizable(drag, statsPanel.handleResize);

  wrap_r.appendChild(div);
  mainDiv.appendChild(wrap_l);
  mainDiv.appendChild(wrap_r);
  wrap_l.appendChild(d);

  const historyColumn = document.getElementById("history_column");
  const historyTop = createDivision(["history_top"]);

  const eventFilter = { eventId: filters.eventId, date: filters.date };
  const matchesInEvent = new Aggregator(eventFilter);
  const matchesInPartialDeckFilters = new Aggregator({
    ...eventFilter,
    tag: filters.tag,
    colors: filters.colors
  });

  const filterPanel = new FilterPanel(
    "history_top",
    selected => openHistoryTab(selected),
    filters,
    getLocalState().totalAgg.events,
    matchesInEvent.tags,
    matchesInPartialDeckFilters.decks,
    true,
    matchesInEvent.archs,
    true,
    matchesInEvent.archCounts,
    true
  );
  const historyTopFilter = filterPanel.render();
  historyTop.appendChild(historyTopFilter);
  historyColumn.appendChild(historyTop);
  const dataScroller = new DataScroller(
    historyColumn,
    renderData,
    20,
    sortedHistory.length
  );
  dataScroller.render(dataIndex, scrollTop);
}

// return val = how many rows it rendered into container
function renderData(container, index) {
  // for performance reasons, we leave matches order mostly alone
  // to display most-recent-first, we use a reverse index
  const revIndex = sortedHistory.length - index - 1;
  const match = sortedHistory[revIndex];

  //console.log("match: ", id, match);
  if (match == undefined) {
    return 0;
  }

  if (match.type == "match") {
    if (match.opponent == undefined) {
      return 0;
    }
    if (match.opponent.userid.indexOf("Familiar") !== -1) {
      return 0;
    }
  }

  if (match.type == "Event") {
    return 0;
  }

  if (!filteredMatches.filterMatch(match)) {
    return 0;
  }

  let tileGrpid, clickCallback;
  if (match.type == "match") {
    tileGrpid = match.playerDeck.deckTileId;
    clickCallback = handleOpenMatch;
  } else {
    tileGrpid = db.sets[match.set].tile;
    clickCallback = handleOpenDraft;
  }
  const deleteCallback = id => {
    toggleArchived(id);
  };

  let listItem = new ListItem(
    tileGrpid,
    match.id,
    clickCallback,
    deleteCallback,
    match.archived
  );
  listItem.divideLeft();
  listItem.divideRight();

  if (match.type == "match") {
    attachMatchData(listItem, match);
  } else {
    attachDraftData(listItem, match);
  }

  container.appendChild(listItem.container);

  if (match.type == "draft") {
    addShare(match);
  }
  //console.log("Load match: ", match_id, match);
  //console.log("Match: ", match.type, match);
  return 1;
}

function handleOpenMatch(id) {
  openMatch(id);
  $(".moving_ux").animate({ left: "-100%" }, 250, "easeInOutCubic");
}

function handleOpenDraft(id) {
  openDraft(id);
  $(".moving_ux").animate({ left: "-100%" }, 250, "easeInOutCubic");
}

function attachMatchData(listItem, match) {
  // Deck name
  let deckNameDiv = createDivision(["list_deck_name"], match.playerDeck.name);
  listItem.leftTop.appendChild(deckNameDiv);

  // Event name
  let eventNameDiv = createDivision(
    ["list_deck_name_it"],
    getReadableEvent(match.eventId)
  );
  listItem.leftTop.appendChild(eventNameDiv);

  match.playerDeck.colors.forEach(color => {
    let m = createDivision(["mana_s20", "mana_" + MANA[color]]);
    listItem.leftBottom.appendChild(m);
  });

  // Opp name
  if (match.opponent.name == null) match.opponent.name = "-#000000";
  let oppNameDiv = createDivision(
    ["list_match_title"],
    "vs " + match.opponent.name.slice(0, -6)
  );
  listItem.rightTop.appendChild(oppNameDiv);

  // Opp rank
  let oppRank = createDivision(["ranks_16"]);
  oppRank.style.marginRight = "0px";
  oppRank.style.backgroundPosition =
    get_rank_index_16(match.opponent.rank) * -16 + "px 0px";
  oppRank.title = match.opponent.rank + " " + match.opponent.tier;
  listItem.rightTop.appendChild(oppRank);

  // Match time
  let matchTime = createDivision(
    ["list_match_time"],
    timeSince(new Date(match.date)) + " ago - " + toMMSS(match.duration)
  );
  listItem.rightBottom.appendChild(matchTime);

  // Opp colors
  get_deck_colors(match.oppDeck).forEach(color => {
    var m = createDivision(["mana_s20", "mana_" + MANA[color]]);
    listItem.rightBottom.appendChild(m);
  });

  let tags_div = createDivision(["history_tags"]);
  listItem.rightBottom.appendChild(tags_div);

  // Set tag
  /*
  let t = db.events_format[match.eventId];
  if (t && deck_tags[t]) {
    deck_tags[t].forEach(val => {
      tags.push({ tag: val.tag, q: val.average });
    });
  }
  */
  let tags = [];
  if (match.tags) {
    match.tags.forEach(tag => {
      let t = createTag(tag, tags_div, true);
      jQuery.data(t, "match", match.id);
      jQuery.data(t, "autocomplete", tags);
    });
    if (match.tags.length == 0) {
      let t = createTag(null, tags_div, false);
      jQuery.data(t, "match", match.id);
      jQuery.data(t, "autocomplete", tags);
    }
  } else {
    let t = createTag(null, tags_div, false);
    jQuery.data(t, "match", match.id);
    jQuery.data(t, "autocomplete", tags);
  }

  // Result
  let resultDiv = createDivision(
    [
      "list_match_result",
      match.player.win > match.opponent.win ? "green" : "red"
    ],
    `${match.player.win}:${match.opponent.win}`
  );
  listItem.right.after(resultDiv);

  // On the play/draw
  if (match.onThePlay) {
    let onThePlay = false;
    if (match.player.seat == match.onThePlay) {
      onThePlay = true;
    }
    let div = createDivision([onThePlay ? "ontheplay" : "onthedraw"]);
    div.title = onThePlay ? "On the play" : "On the draw";
    listItem.right.after(div);
  }
}

function attachDraftData(listItem, draft) {
  // console.log("Draft: ", match);

  let draftSetDiv = createDivision(["list_deck_name"], draft.set + " draft");
  listItem.leftTop.appendChild(draftSetDiv);

  let draftTimeDiv = createDivision(
    ["list_match_time"],
    timeSince(new Date(draft.date)) + " ago."
  );
  listItem.rightBottom.appendChild(draftTimeDiv);

  let replayDiv = createDivision(["list_match_replay"], "See replay");
  listItem.rightTop.appendChild(replayDiv);

  let replayShareButton = createDivision(["list_draft_share", draft.id + "dr"]);
  listItem.right.after(replayShareButton);
}

function renderRanksStats(container, aggregator) {
  container.innerHTML = "";
  if (!aggregator || !aggregator.stats.total) return;
  const { winrate } = aggregator.stats;

  const viewingLimitSeason = filters.eventId === RANKED_DRAFT;
  let seasonName = !viewingLimitSeason ? "constructed" : "limited";
  let switchSeasonName = viewingLimitSeason ? "constructed" : "limited";
  let switchSeasonFilters = {
    ...Aggregator.getDefaultFilters(),
    date: DATE_SEASON,
    eventId: viewingLimitSeason ? RANKED_CONST : RANKED_DRAFT
  };

  let seasonToggleButton = createDivision(
    ["button_simple", "button_thin", "season_toggle"],
    `Show ${switchSeasonName}`
  );
  seasonToggleButton.style.margin = "8px auto";

  container.appendChild(seasonToggleButton);

  var title = createDivision(
    ["ranks_history_title"],
    `Current ${seasonName} season:`
  );
  container.appendChild(title);

  let currentRank = viewingLimitSeason
    ? pd.rank.limited.rank
    : pd.rank.constructed.rank;
  let expected = getStepsUntilNextRank(viewingLimitSeason, winrate);
  title = createDivision(
    ["ranks_history_title"],
    `Games until ${getNextRank(currentRank)}: ${expected}`
  );
  title.title = `Using ${formatPercent(winrate)} winrate`;
  container.appendChild(title);

  seasonToggleButton.addEventListener("click", () => {
    openHistoryTab(switchSeasonFilters);
  });
}

function createTag(tag, div, showClose = true) {
  let tagCol = getTagColor(tag);
  let iid = makeId(6);
  let t = createDivision(["deck_tag", iid], tag || tagPrompt);
  t.style.backgroundColor = tagCol;

  if (tag) {
    $(t).on("click", function(e) {
      var colorPick = $(t);
      colorPick.spectrum({
        showInitial: true,
        showAlpha: false,
        showButtons: false
      });
      colorPick.spectrum("set", tagCol);
      colorPick.spectrum("show");

      colorPick.on("move.spectrum", (e, color) => {
        const tag = $(this).text();
        const col = color.toRgbString();
        $(".deck_tag").each((index, obj) => {
          if (tag !== $(obj).text()) return;
          $(obj).css("background-color", col);
        });
      });

      colorPick.on("change.spectrum", (e, color) => {
        const tag = $(this).text();
        const col = color.toRgbString();
        ipcSend("edit_tag", { tag, color: col });
      });

      colorPick.on("hide.spectrum", () => {
        colorPick.spectrum("destroy");
      });
      e.stopPropagation();
    });
  } else {
    $(t).on("click", function(e) {
      if ($(this).html() === tagPrompt) {
        t.innerHTML = "";
        let input = $(
          `<input style="min-width: 120px;" id="${iid}" size="1" autocomplete="off" type="text" onFocus="this.select()" class="deck_tag_input"></input>`
        );
        let ac = $('<div class="autocomplete"></div>');
        input.appendTo(ac);
        $(t).prepend(ac);

        input[0].focus();
        input[0].select();
        const matchid = jQuery.data($(this)[0], "match");
        const options = jQuery.data($(this)[0], "autocomplete");
        const masterdiv = $(this).parent()[0];
        const tag = $(this);

        autocomplete(input[0], options, () => {
          input[0].focus();
          input[0].select();
          input[0].dispatchEvent(new KeyboardEvent("keydown", { keyCode: 13 }));
        });
        input.keydown(function(e) {
          setTimeout(() => {
            input.css("width", $(this).val().length * 8);
          }, 10);
          if (e.keyCode === 13) {
            let val = $(this).val();
            tag.remove();
            if (val && val !== tagPrompt) {
              addTag(matchid, val);
            } else {
              const t = createTag(null, masterdiv, false);
              jQuery.data(t, "match", matchid);
              jQuery.data(t, "autocomplete", options);
            }
          }
        });
        input.on("focusout", function() {
          let val = $(this).val();
          tag.remove();
          if (val && val !== tagPrompt) {
            addTag(matchid, val);
          } else {
            const t = createTag(null, masterdiv, false);
            jQuery.data(t, "match", matchid);
            jQuery.data(t, "autocomplete", options);
          }
        });
      }
      e.stopPropagation();
    });
  }

  if (showClose) {
    let tc = createDivision(["deck_tag_close"]);
    t.appendChild(tc);

    $(tc).on("click", function(e) {
      e.stopPropagation();
      let matchid = jQuery.data($(this).parent()[0], "match");
      let options = jQuery.data($(this).parent()[0], "autocomplete");
      let val = $(this)
        .parent()
        .text();

      deleteTag(matchid, val);

      $(this).css("width", "0px");
      $(this).css("margin", "0px");
      $(this)
        .parent()
        .css("opacity", 0);
      $(this)
        .parent()
        .css("font-size", 0);
      $(this)
        .parent()
        .css("margin-right", "0px");
      $(this)
        .parent()
        .css("color", $(this).css("background-color"));

      setTimeout(e => {
        $(this).remove();
      }, 200);

      let t = createTag(
        null,
        $(this)
          .parent()
          .parent()[0],
        false
      );
      jQuery.data(t, "match", matchid);
      jQuery.data(t, "autocomplete", options);
    });
  } else {
    t.style.paddingRight = "12px";
  }
  div.appendChild(t);

  return t;
}

function addTag(matchid, tag) {
  const match = pd.match(matchid);
  if (!match || !tag) return;
  tag = tag.toLowerCase();
  if (tag === tagPrompt) return;
  if (match.tags && match.tags.includes(tag)) return;

  ipcSend("add_history_tag", { matchid, tag });
}

function deleteTag(matchid, tag) {
  const match = pd.match(matchid);
  if (!match || !tag) return;
  tag = tag.toLowerCase();
  if (!match.tags || !match.tags.includes(tag)) return;

  ipcSend("delete_history_tag", { matchid, tag });
}

function getStepsUntilNextRank(mode, winrate) {
  let rr = mode ? pd.rank.limited : pd.rank.constructed;

  let cr = rr.rank;
  let cs = rr.step;
  let ct = rr.tier;

  let st = 1;
  let stw = 1;
  let stl = 0;
  if (cr == "Bronze") {
    st = 4;
    stw = 2;
    stl = 0;
  }
  if (cr == "Silver") {
    st = 5;
    stw = 2;
    stl = 1;
  }
  if (cr == "Gold") {
    st = 6;
    stw = 1;
    stl = 1;
  }
  if (cr == "Platinum") {
    st = 7;
    stw = 1;
    stl = 1;
  }
  if (cr == "Diamond") {
    st = 7;
    stw = 1;
    stl = 1;
  }

  const expectedValue = winrate * stw - (1 - winrate) * stl;
  if (expectedValue <= 0) return "&#x221e";

  let stepsNeeded = st * ct - cs;
  let expected = 0;
  let n = 0;
  // console.log("stepsNeeded", stepsNeeded);
  while (expected <= stepsNeeded) {
    expected = n * expectedValue;
    // console.log("stepsNeeded:", stepsNeeded, "expected:", expected, "N:", n);
    n++;
  }

  return "~" + n;
}

function addShare(_match) {
  $("." + _match.id + "dr").on("click", e => {
    e.stopPropagation();
    $(".dialog_wrapper").css("opacity", 1);
    $(".dialog_wrapper").css("pointer-events", "all");
    $(".dialog_wrapper").show();
    $(".dialog").css("width", "500px");
    $(".dialog").css("height", "200px");
    $(".dialog").css("top", "calc(50% - 100px)");

    $(".dialog_wrapper").on("click", function() {
      console.log(".dialog_wrapper on click");
      //e.stopPropagation();
      $(".dialog_wrapper").css("opacity", 0);
      $(".dialog_wrapper").css("pointer-events", "none");
      setTimeout(function() {
        $(".dialog_wrapper").hide();
        $(".dialog").css("width", "400px");
        $(".dialog").css("height", "160px");
        $(".dialog").css("top", "calc(50% - 80px)");
      }, 250);
    });

    $(".dialog").on("click", function(e) {
      e.stopPropagation();
      console.log(".dialog on click");
    });

    var dialog = $(".dialog");
    dialog.html("");
    var cont = $('<div class="dialog_container"></div>');

    cont.append('<div class="share_title">Link For sharing:</div>');
    var icd = $('<div class="share_input_container"></div>');
    var but = $('<div class="button_simple">Copy</div>');
    var sin = $(
      '<input id="share_input" onClick="this.setSelectionRange(0, this.value.length)" autofocus autocomplete="off" value="" />'
    );

    sin.appendTo(icd);
    but.appendTo(icd);
    icd.appendTo(cont);

    cont.append('<div class="share_subtitle"><i>Expires in: </i></div>');
    cont.appendTo(dialog);

    var select = $('<select id="expire_select"></select>');
    var sortby = ["One day", "One week", "One month", "Never"];
    for (var i = 0; i < sortby.length; i++) {
      select.append(
        '<option value="' + sortby[i] + '">' + sortby[i] + "</option>"
      );
    }
    select.appendTo(cont);
    selectAdd(select, () => draftShareLink(_match.id));

    but.click(function() {
      ipcSend("set_clipboard", document.getElementById("share_input").value);
    });
  });
}

function draftShareLink(id) {
  const shareExpire = document.getElementById("expire_select").value;
  let expire = 0;
  switch (shareExpire) {
    case "One day":
      expire = 0;
      break;
    case "One week":
      expire = 1;
      break;
    case "One month":
      expire = 2;
      break;
    case "Never":
      expire = -1;
      break;
    default:
      expire = 0;
      break;
  }
  showLoadingBars();
  ipcSend("request_draft_link", { expire, id });
}

function compare_matches(a, b) {
  if (a === undefined) return 0;
  if (b === undefined) return 0;

  return Date.parse(a.date) - Date.parse(b.date);
}

module.exports = { openHistoryTab, setFilters };
