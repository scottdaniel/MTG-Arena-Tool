"use strict";
/*
globals
  compare_winrates,
  createDivision,
  formatPercent,
  getWinrateClass,
  getTagColor,
  mana,
  toDDHHMMSS,
  toMMSS
*/

class StatsPanel {
  constructor(prefixId, stats, width) {
    this.prefixId = prefixId;
    this.stats = stats || {};
    this.container = createDivision([this.prefixId + "_winrate"]);
    this.handleResize = this.handleResize.bind(this);
    this.handleResize(width);
    return this;
  }

  handleResize(width) {
    this.width = width || 200;
    this.container.innerHTML = "";
    this.doRender();
  }

  render() {
    return this.container;
  }

  doRender() {
    const {
      playWins,
      playLosses,
      drawWins,
      drawLosses,
      playWinrate,
      drawWinrate,
      winrate,
      wins,
      losses,
      duration,
      colors,
      tags
    } = this.stats;
    const barsToShow = Math.max(3, Math.round(this.width / 40));
    const colClass = getWinrateClass(winrate);

    // Overall winrate
    let winrateContainer = createDivision([]);
    winrateContainer.style.display = "flex";
    winrateContainer.style.justifyContent = "space-between";
    const winrateLabel = createDivision(["list_deck_winrate"], "Overall:");
    winrateLabel.style.margin = "0 auto 0 0";
    winrateContainer.appendChild(winrateLabel);
    const wrSpan = `<span class="${colClass}_bright">${formatPercent(
      winrate
    )}</span>`;
    const winrateDiv = createDivision(
      ["list_deck_winrate"],
      `${wins}:${losses} (${wrSpan})`
    );
    winrateDiv.title = `${wins} matches won : ${losses} matches lost`;
    winrateDiv.style.margin = "0 0 0 auto";
    winrateContainer.appendChild(winrateDiv);
    this.container.appendChild(winrateContainer);

    // On the play Winrate
    winrateContainer = createDivision([]);
    winrateContainer.style.display = "flex";
    winrateContainer.style.justifyContent = "space-between";
    const playWinrateLabel = createDivision(["list_deck_winrate"], "On the play:");
    playWinrateLabel.style.margin = "0 auto 0 0";
    winrateContainer.appendChild(playWinrateLabel);
    const playWrSpan = `<span class="${colClass}_bright">${formatPercent(
      playWinrate
    )}</span>`;
    const playWinrateDiv = createDivision(
      ["list_deck_winrate"],
      `${playWins}:${playLosses} (${playWrSpan})`
    );
    playWinrateDiv.title = `${playWins} matches won : ${playLosses} matches lost`;
    playWinrateDiv.style.margin = "0 0 0 auto";
    winrateContainer.appendChild(playWinrateDiv);
    this.container.appendChild(winrateContainer);

    // On the draw Winrate
    winrateContainer = createDivision([]);
    winrateContainer.style.display = "flex";
    winrateContainer.style.justifyContent = "space-between";
    const drawWinrateLabel = createDivision(["list_deck_winrate"], "On the draw:");
    drawWinrateLabel.style.margin = "0 auto 0 0";
    winrateContainer.appendChild(drawWinrateLabel);
    const drawWrSpan = `<span class="${colClass}_bright">${formatPercent(
      drawWinrate
    )}</span>`;
    const drawWinrateDiv = createDivision(
      ["list_deck_winrate"],
      `${drawWins}:${drawLosses} (${drawWrSpan})`
    );
    drawWinrateDiv.title = `${drawWins} matches won : ${drawLosses} matches lost`;
    drawWinrateDiv.style.margin = "0 0 0 auto";
    winrateContainer.appendChild(drawWinrateDiv);
    this.container.appendChild(winrateContainer);

    const matchTimeContainer = createDivision();
    matchTimeContainer.style.display = "flex";
    matchTimeContainer.style.justifyContent = "space-between";
    const timeLabel = createDivision(["list_match_time"], "Duration:");
    timeLabel.style.margin = "0 auto 0 0";
    matchTimeContainer.appendChild(timeLabel);
    const timeDiv = createDivision(["list_match_time"], toMMSS(duration));
    timeDiv.title = toDDHHMMSS(duration);
    timeDiv.style.margin = "0 0 0 auto";
    matchTimeContainer.appendChild(timeDiv);
    this.container.appendChild(matchTimeContainer);

    // Frequent Matchups
    const frequencySort = (a, b) => b.wins + b.losses - a.wins - a.losses;
    // Archetypes
    let tagsWinrates = [...tags];
    tagsWinrates.sort(frequencySort);
    tagsWinrates = tagsWinrates.slice(0, barsToShow);
    const curveMaxTags = Math.max(
      ...tagsWinrates.map(cwr => Math.max(cwr.wins || 0, cwr.losses || 0)),
      0
    );
    tagsWinrates.sort(compare_winrates);
    // Colors
    let colorsWinrates = [...colors];
    colorsWinrates.sort(frequencySort);
    colorsWinrates = colorsWinrates.slice(0, barsToShow);
    const curveMax = Math.max(
      ...colorsWinrates.map(cwr => Math.max(cwr.wins || 0, cwr.losses || 0)),
      0
    );
    colorsWinrates.sort(compare_winrates);

    if (curveMaxTags || curveMax) {
      const chartTitle = createDivision(["ranks_history_title"]);
      chartTitle.innerHTML = "Frequent Matchups";
      chartTitle.style.marginTop = "24px";
      this.container.appendChild(chartTitle);
    }

    const getStyleHeight = frac => Math.round(frac * 100) + "%";

    const appendChart = (winrates, _curveMax, showTags) => {
      const curve = createDivision(["mana_curve"]);
      const numbers = createDivision(["mana_curve_costs"]);

      winrates.forEach(cwr => {
        const winCol = createDivision(["mana_curve_column", "back_green"]);
        winCol.style.height = getStyleHeight(cwr.wins / _curveMax);
        winCol.title = `${cwr.wins} matches won`;
        curve.appendChild(winCol);

        const lossCol = createDivision(["mana_curve_column", "back_red"]);
        lossCol.style.height = getStyleHeight(cwr.losses / _curveMax);
        lossCol.title = `${cwr.losses} matches lost`;
        curve.appendChild(lossCol);

        const curveNumber = createDivision(["mana_curve_column_number"]);
        let winRate = 0;
        if (cwr.wins) {
          winRate = cwr.wins / (cwr.wins + cwr.losses);
        }
        const colClass = getWinrateClass(winRate);
        curveNumber.innerHTML = `<span class="${colClass}_bright">${formatPercent(
          winRate
        )}</span>`;
        curveNumber.title = `${cwr.wins} matches won : ${
          cwr.losses
        } matches lost`;

        if (showTags) {
          const curveTag = createDivision(["mana_curve_tag"], cwr.tag);
          curveTag.style.backgroundColor = getTagColor(cwr.tag);
          curveNumber.appendChild(curveTag);
        }

        cwr.colors.forEach(color => {
          const tagColor = createDivision(["mana_s16", "mana_" + mana[color]]);
          tagColor.style.margin = "margin: 0 auto !important";
          curveNumber.appendChild(tagColor);
        });
        numbers.append(curveNumber);
      });

      this.container.appendChild(curve);
      this.container.appendChild(numbers);
    };

    // Archetypes
    if (curveMaxTags) {
      appendChart(tagsWinrates, curveMaxTags, true);
    }

    // Colors
    if (curveMax) {
      appendChart(colorsWinrates, curveMax, false);
    }
  }
}

module.exports = StatsPanel;
