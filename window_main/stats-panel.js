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
  constructor(prefixId, aggregation, width, showCharts) {
    this.prefixId = prefixId;
    this.data = aggregation || {};
    this.showCharts = showCharts;
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
    const barsToShow = Math.max(3, Math.round(this.width / 40));

    const getWinrateString = stats => {
      const colClass = getWinrateClass(stats.winrate);
      const title = `${stats.wins} matches won : ${stats.losses} matches lost`;
      return `<span class="${colClass}_bright" title="${title}">${formatPercent(
        stats.winrate
      )}</span>`;
    };

    // Overall winrate
    let winrateContainer = createDivision([]);
    winrateContainer.style.display = "flex";
    winrateContainer.style.justifyContent = "space-between";
    const winrateLabel = createDivision(["list_deck_winrate"], "Overall:");
    winrateLabel.style.margin = "0 auto 0 0";
    winrateContainer.appendChild(winrateLabel);
    const wrString = getWinrateString(this.data.stats);
    const winrateDiv = createDivision(
      ["list_deck_winrate"],
      `${this.data.stats.wins}:${this.data.stats.losses} (${wrString})`
    );
    winrateDiv.style.margin = "0 0 0 auto";
    winrateContainer.appendChild(winrateDiv);
    this.container.appendChild(winrateContainer);

    // On the play Winrate
    const playDrawContainer = createDivision([]);
    playDrawContainer.style.display = "flex";
    playDrawContainer.style.justifyContent = "space-between";
    const playDrawRateLabel = createDivision(
      ["list_deck_winrate"],
      "Play/Draw:"
    );
    playDrawRateLabel.style.margin = "0 auto 0 0";
    playDrawContainer.appendChild(playDrawRateLabel);
    const playWrString = getWinrateString(this.data.playStats);
    const drawWrString = getWinrateString(this.data.drawStats);
    const playDrawRateDiv = createDivision(
      ["list_deck_winrate"],
      `${playWrString}/${drawWrString}`
    );
    playDrawRateDiv.style.margin = "0 0 0 auto";
    playDrawContainer.appendChild(playDrawRateDiv);
    this.container.appendChild(playDrawContainer);

    const matchTimeContainer = createDivision();
    matchTimeContainer.style.display = "flex";
    matchTimeContainer.style.justifyContent = "space-between";
    const timeLabel = createDivision(["list_match_time"], "Duration:");
    timeLabel.style.margin = "0 auto 0 0";
    matchTimeContainer.appendChild(timeLabel);
    const timeDiv = createDivision(
      ["list_match_time"],
      toMMSS(this.data.stats.duration)
    );
    timeDiv.title = toDDHHMMSS(this.data.stats.duration);
    timeDiv.style.margin = "0 0 0 auto";
    matchTimeContainer.appendChild(timeDiv);
    this.container.appendChild(matchTimeContainer);

    if (!this.showCharts) return;

    // Frequent Matchups
    const frequencySort = (a, b) => b.total - a.total;
    // Archetypes
    let tagsWinrates = [...Object.values(this.data.tagStats)];
    tagsWinrates.sort(frequencySort);
    tagsWinrates = tagsWinrates.slice(0, barsToShow);
    const curveMaxTags = Math.max(
      ...tagsWinrates.map(cwr => Math.max(cwr.wins || 0, cwr.losses || 0)),
      0
    );
    tagsWinrates.sort(compare_winrates);
    // Colors
    let colorsWinrates = [...Object.values(this.data.colorStats)];
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
