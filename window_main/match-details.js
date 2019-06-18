const fs = require("fs");
const path = require("path");

const { MANA } = require("../shared/constants");
const db = require("../shared/database");
const pd = require("../shared/player-data");
const {
  createDiv,
  createImg,
  createInput,
  createLabel,
  createSpan,
  queryElements: $$
} = require("../shared/dom-fns");
const deckDrawer = require("../shared/deck-drawer");
const {
  compare_cards,
  get_deck_export,
  get_deck_export_txt,
  get_rank_index,
  makeId
} = require("../shared/util");
const {
  hypergeometricSignificance,
  hypergeometricRange
} = require("../shared/stats-fns");

const {
  actionLogDir,
  changeBackground,
  drawCardList,
  drawDeck,
  ipcSend,
  openActionLog
} = require("./renderer-util");

const byId = id => document.getElementById(id);

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

  drawDeck(dl[0], match.playerDeck);

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
  drawDeck(odl[0], match.oppDeck);

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
          drawCardList(additionsDiv[0], game.sideboardChanges.added);
          additionsDiv.appendTo(sideboardDiv);
          let removalsDiv = $('<div class="cardlist"></div>');
          let separator4 = deckDrawer.cardSeparator("Sideboarded Out");
          removalsDiv.append(separator4);
          drawCardList(removalsDiv[0], game.sideboardChanges.removed);
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
          drawCardList(handDiv[0], hand);
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
