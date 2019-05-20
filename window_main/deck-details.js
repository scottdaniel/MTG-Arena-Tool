/*
global
    add,
    Aggregator,
    cardsDb,
    ConicGradient,
    change_background,
    createDivision,
    drawDeck,
    drawDeckVisual,
    economyHistory,
    get_deck_colors_ammount,
    get_deck_curve,
    get_deck_export,
    get_deck_export_txt,
    get_deck_lands_ammount,
    get_deck_missing,
    get_deck_types_ammount,
    getBoosterCountEstimate,
    ipc_send,
    makeResizable,
    mana,
    orderedCardRarities,
    orderedCardTypes,
    orderedCardTypesDesc,
    orderedColorCodes,
    orderedManaColors,
    pop,
    sidebarSize,
    StatsPanel
*/

// We need to store a sorted list of card types so we create the card counts in the same order.
let currentOpenDeck = null;
let currentFilters = null;

function deckManaCurve(deck) {
  let manaCounts = get_deck_curve(deck);
  let curveMax = Math.max(
    ...manaCounts
      .filter(v => {
        if (v == undefined) return false;
        return true;
      })
      .map(v => v[0] || 0)
  );

  // console.log("deckManaCurve", manaCounts, curveMax);

  let curve = $('<div class="mana_curve"></div>');
  let numbers = $('<div class="mana_curve_numbers"></div>');
  manaCounts.forEach((cost, i) => {
    let total = cost[0];
    let manaTotal = cost.reduce(add, 0) - total;

    let curve_column = $(
      `<div style="height: ${(total / curveMax) *
        100}%;" class="mana_curve_column"><div class="mana_curve_number">${
        total > 0 ? total : ""
      }</div></div>`
    );
    orderedManaColors.forEach((mc, ind) => {
      if (ind < 5 && cost[ind + 1] > 0) {
        let h = Math.round((cost[ind + 1] / manaTotal) * 100);
        let col = $(
          `<div style="height: ${h}%; background-color: ${mc};" class="mana_curve_column_color"></div>`
        );
        col.appendTo(curve_column);
      }
    });

    curve_column.appendTo(curve);

    numbers.append(
      $(
        `<div class="mana_curve_column_number"><div style="margin: 0 auto !important" class="mana_s16 mana_${i}"></div></div>`
      )
    );
  });

  let container = $("<div>").append(curve, numbers);
  return container;
}

function colorPieChart(colorCounts, title) {
  /*
    used for land / card pie charts.
    colorCounts should be object with values for each of the color codes wubrgc and total.
    */
  // console.log("making colorPieChart", colorCounts, title);

  var stops = [];
  var start = 0;
  orderedColorCodes.forEach((colorCode, i) => {
    let currentColor = orderedManaColors[i];
    var stop =
      start + ((colorCounts[colorCode] || 0) / colorCounts.total) * 100;
    stops.push(`${currentColor} 0 ${stop}%`);
    // console.log('\t', start, stop, currentColor);
    start = stop;
  });
  let gradient = new ConicGradient({
    stops: stops.join(", "),
    size: 400
    // Default size: Math.max(innerWidth, innerHeight)
  });
  let chart = $(
    `<div class="pie_container"><span>${title}</span><svg class="pie">${
      gradient.svg
    }</svg></div>`
  );
  return chart;
}

function deckStatsSection(deck) {
  let stats = $('<div class="stats"></div>');

  $(`<div class="button_simple visualView">Visual View</div>
    <div class="button_simple openHistory">History of changes</div>
    <div class="button_simple exportDeck">Export to Arena</div>
    <div class="button_simple exportDeckStandard">Export to .txt</div>`).appendTo(
    stats
  );

  let cardTypes = get_deck_types_ammount(deck);
  let typesContainer = $('<div class="types_container"></div>');
  orderedCardTypes.forEach((cardTypeKey, index) => {
    $(`<div class="type_icon_cont">
            <div title="${
              orderedCardTypesDesc[index]
            }" class="type_icon type_${cardTypeKey}"></div>
            <span>${cardTypes[cardTypeKey]}</span>
        </div>`).appendTo(typesContainer);
  });
  typesContainer.appendTo(stats);

  // Mana Curve
  deckManaCurve(deck).appendTo(stats);

  // Deck colors
  let pieContainer = $('<div class="pie_container_outer"></div>');
  pieContainer.appendTo(stats);
  let colorCounts = get_deck_colors_ammount(deck);
  let pieChart;
  pieChart = colorPieChart(colorCounts, "Mana Symbols");
  pieChart.appendTo(pieContainer);

  // Lands colors
  let landCounts = get_deck_lands_ammount(deck);
  pieChart = colorPieChart(landCounts, "Mana Sources");
  pieChart.appendTo(pieContainer);

  // Deck crafting cost section
  let ownedWildcards = {
    common: economyHistory.wcCommon,
    uncommon: economyHistory.wcUncommon,
    rare: economyHistory.wcRare,
    mythic: economyHistory.wcMythic
  };

  let missingWildcards = get_deck_missing(deck);
  let boosterCost = getBoosterCountEstimate(missingWildcards);
  let costSection = $(
    '<div class="wildcards_cost"><span>Wildcards you have/need</span></div>'
  );
  orderedCardRarities.forEach(cardRarity => {
    $(
      `<div title="${cardRarity}" class="wc_cost wc_${cardRarity}">${
        ownedWildcards[cardRarity] > 0 ? ownedWildcards[cardRarity] + " / " : ""
      }${missingWildcards[cardRarity]}</div>`
    ).appendTo(costSection);
  });
  $(
    `<div title="Aproximate boosters" class="wc_cost wc_booster">${Math.round(
      boosterCost
    )}</div>`
  ).appendTo(costSection);
  costSection.appendTo(stats);
  return stats;
}

function openDeck(deck = currentOpenDeck, filters = currentFilters) {
  if (!deck) return;
  currentOpenDeck = deck;
  if (filters && deck.id !== filters.deckId) filters = null;
  currentFilters = filters;

  // #ux_1 is right side, #ux_0 is left side
  const mainDiv = document.getElementById("ux_1");
  mainDiv.classList.remove("flex_item");
  mainDiv.innerHTML = "";

  let container = mainDiv;
  let showStatsPanel = false;
  if (filters) {
    const aggregator = new Aggregator(filters);
    showStatsPanel = aggregator.stats.total > 0;
    if (showStatsPanel) {
      mainDiv.classList.add("flex_item");
      const wrap_r = createDivision(["wrapper_column", "sidebar_column_l"]);
      wrap_r.setAttribute("id", "stats_column");
      wrap_r.style.width = sidebarSize + "px";
      wrap_r.style.flex = `0 0 ${sidebarSize}px`;
      const statsPanel = new StatsPanel(
        "decks_top",
        aggregator,
        sidebarSize,
        true
      );
      const deck_top_winrate = statsPanel.render();
      deck_top_winrate.style.display = "flex";
      deck_top_winrate.style.flexDirection = "column";
      deck_top_winrate.style.marginTop = "16px";
      deck_top_winrate.style.padding = "12px";

      const drag = createDivision(["dragger"]);
      wrap_r.appendChild(drag);
      const finalCallback = width => {
        ipc_send("save_user_settings", { right_panel_width: width });
      };
      makeResizable(drag, statsPanel.handleResize, finalCallback);

      wrap_r.appendChild(deck_top_winrate);

      const wrap_l = createDivision(["wrapper_column"]);
      wrap_l.setAttribute("id", "deck_column");
      mainDiv.appendChild(wrap_l);
      mainDiv.appendChild(wrap_r);
      container = wrap_l;
    }
  }

  const d = document.createElement("div");
  d.classList.add("list_fill");
  container.appendChild(d);

  const top = createDivision(["decklist_top"]);
  top.appendChild(createDivision(["button", "back"]));
  top.appendChild(createDivision(["deck_name"], deck.name));

  const deckColors = createDivision(["deck_top_colors"]);
  deckColors.style.alignSelf = "center";
  deck.colors.forEach(color => {
    const m = createDivision(["mana_s20", "mana_" + mana[color]]);
    deckColors.appendChild(m);
  });
  top.appendChild(deckColors);

  const tileGrpId = deck.deckTileId;
  if (cardsDb.get(tileGrpId)) {
    change_background("", tileGrpId);
  }

  const deckListSection = createDivision(["decklist"]);
  drawDeck($(deckListSection), deck, true);

  const statsSection = deckStatsSection(deck);

  const fld = createDivision(["flex_item"]);
  fld.appendChild(deckListSection);
  fld.appendChild(statsSection[0]);

  container.appendChild(top);
  container.appendChild(fld);

  // Attach event handlers
  $(".visualView").click(() => {
    if (showStatsPanel) {
      $("#stats_column").hide();
    }
    drawDeckVisual(deckListSection, statsSection, deck);
  });

  $(".openHistory").click(() => ipc_send("get_deck_changes", deck.id));

  $(".exportDeck").click(() => {
    const list = get_deck_export(deck);
    pop("Copied to clipboard", 1000);
    ipc_send("set_clipboard", list);
  });

  $(".exportDeckStandard").click(() => {
    const list = get_deck_export_txt(deck);
    ipc_send("export_txt", { str: list, name: deck.name });
  });

  $(".back").click(() => {
    change_background("default");
    $(".moving_ux").animate({ left: "0px" }, 250, "easeInOutCubic");
  });
}

module.exports = {
  openDeck: openDeck
};
