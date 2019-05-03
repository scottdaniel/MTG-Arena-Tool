"use strict";
/*
globals
  compare_winrates,
  createDivision,
  getWinrateClass,
  getTagColor,
  mana,
  toMMSS,
  $
*/

class StatsPanel {
  constructor(prefixId, stats) {
    this.prefixId = prefixId;
    this.stats = stats || {};
    return this;
  }

  render() {
    const { total, wins, losses, duration, colors, tags } = this.stats;
    const wrTotal = total;
    const colClass = getWinrateClass(wrTotal);

    const container = createDivision([this.prefixId + "_winrate"]);
    const winrateContainer = createDivision(
      ["list_deck_winrate"],
      `${wins}:${losses} (<span class="${colClass}_bright">${Math.round(
        wrTotal * 100
      )}%</span>)`
    );
    container.appendChild(winrateContainer);

    const matchTimeContainer = createDivision(
      ["list_match_time", "list_match_time_top"],
      toMMSS(duration)
    );
    container.appendChild(matchTimeContainer);

    let curveMax;

    // Archetypes
    const jCont = $(container);

    let tagsWinrates = [...tags];
    tagsWinrates.sort((a, b) => b.wins + b.losses - a.wins - a.losses);
    tagsWinrates = tagsWinrates.slice(0, 5);
    curveMax = 0;
    tagsWinrates.forEach(wr => {
      curveMax = Math.max(curveMax, wr.wins || 0, wr.losses || 0);
    });
    tagsWinrates.sort(compare_winrates);

    let curveTags = $('<div class="mana_curve"></div>');
    let numbersTags = $('<div class="mana_curve_costs"></div>');

    tagsWinrates.forEach(cwr => {
      if (
        tagsWinrates.length < 15 ||
        (cwr.wins + cwr.losses > 1 && tagsWinrates.length > 15)
      ) {
        curveTags.append(
          $(
            `<div class="mana_curve_column back_green" style="height: ${(cwr.wins /
              curveMax) *
              100}%"></div>`
          )
        );
        curveTags.append(
          $(
            `<div class="mana_curve_column back_red" style="height: ${(cwr.losses /
              curveMax) *
              100}%"></div>`
          )
        );

        let curveNumber = $(`<div class="mana_curve_column_number">
                  ${cwr.wins}/${cwr.losses}
                  <div style="margin: 0 auto !important" class=""></div>
              </div>`);

        let colors = cwr.colors;
        curveNumber.append(
          $(
            `<div class="mana_curve_tag" style="background-color: ${getTagColor(
              cwr.tag
            )};">${cwr.tag}</div>`
          )
        );
        colors.forEach(function(color) {
          curveNumber.append(
            $(
              `<div style="margin: 0 auto !important" class="mana_s16 mana_${
                mana[color]
              }"></div>`
            )
          );
        });
        numbersTags.append(curveNumber);
      }
    });

    jCont.append(curveTags, numbersTags);

    // Colors
    let colorsWinrates = [...colors];
    colorsWinrates.sort((a, b) => b.wins + b.losses - a.wins - a.losses);
    colorsWinrates = colorsWinrates.slice(0, 5);
    curveMax = 0;
    colorsWinrates.forEach(wr => {
      curveMax = Math.max(curveMax, wr.wins || 0, wr.losses || 0);
    });
    colorsWinrates.sort(compare_winrates);

    let curve = $('<div class="mana_curve"></div>');
    let numbers = $('<div class="mana_curve_costs"></div>');

    colorsWinrates.forEach(cwr => {
      if (
        colorsWinrates.length < 15 ||
        (cwr.wins + cwr.losses > 1 && colorsWinrates.length > 15)
      ) {
        curve.append(
          $(
            `<div class="mana_curve_column back_green" style="height: ${(cwr.wins /
              curveMax) *
              100}%"></div>`
          )
        );
        curve.append(
          $(
            `<div class="mana_curve_column back_red" style="height: ${(cwr.losses /
              curveMax) *
              100}%"></div>`
          )
        );

        let curveNumber = $(`<div class="mana_curve_column_number">
                  ${cwr.wins}/${cwr.losses}
                  <div style="margin: 0 auto !important" class=""></div>
              </div>`);

        let colors = cwr.colors;
        colors.forEach(function(color) {
          curveNumber.append(
            $(
              `<div style="margin: 0 auto !important" class="mana_s16 mana_${
                mana[color]
              }"></div>`
            )
          );
        });
        numbers.append(curveNumber);
      }
    });

    jCont.append(curve, numbers);

    return container;
  }
}

module.exports = StatsPanel;
