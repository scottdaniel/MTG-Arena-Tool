"use strict";
/*
globals
  Aggregator,
  createDivision,
  createSelect,
  doesDeckStillExist,
  getReadableEvent,
  getReadableFormat,
  getRecentDeckName,
  getTagColor,
  orderedColorCodes,
  orderedColorCodesCommon
*/

const { DEFAULT_DECK, DEFAULT_TAG } = Aggregator;

class FilterPanel {
  constructor(
    prefixId,
    onFilterChange,
    filters,
    events,
    tags,
    decks,
    showManaFilter
  ) {
    this.prefixId = prefixId;
    this.onFilterChange = onFilterChange;
    const colorFilters = {};
    orderedColorCodesCommon.forEach(code => (colorFilters[code] = false));
    this.filters = {
      ...Aggregator.getDefaultFilters(),
      ...filters
    };
    this.events = events || [];
    this.tags = tags || [];
    this.decks = decks || [];
    this.showManaFilter = showManaFilter || false;
    this.getTagString = this.getTagString.bind(this);
    this.getDeckString = this.getDeckString.bind(this);
    return this;
  }

  getTagString(tag) {
    if (tag === DEFAULT_TAG) return tag;
    const color = getTagColor(tag);
    const margins = "margin: 5px; margin-right: 30px;";
    const style = `background-color:${color}; color: black; padding-right: 12px; ${margins}`;
    return `<div class="deck_tag" style="${style}">${getReadableFormat(tag)}</div>`;
  }

  getDeckString(deckId) {
    if (deckId === DEFAULT_DECK) return deckId;
    const matches = this.decks.filter(_deck => _deck.id === deckId);
    if (matches.length === 0) return deckId;
    const deck = matches[0];

    let deckName = deck.name;
    if (doesDeckStillExist(deckId)) {
      deckName = getRecentDeckName(deckId);
    } else {
      deckName += "<small><i> (deleted)</i></small>";
    }

    let colorsString = "";
    if (deck.colors) {
      deck.colors.forEach(color => {
        colorsString += `<div class="mana_s16 mana_${
          orderedColorCodes[color - 1]
        }"></div>`;
      });
    }

    return `${deckName}<div class="flex_item">${colorsString}</div>`;
  }

  render() {
    const container = createDivision([this.prefixId + "_filter"]);
    container.style.display = "flex";
    container.style.alignItems = "center";
    // container.style.justifyContent = "space-between";

    if (this.events.length) {
      const eventSelect = createSelect(
        container,
        this.events,
        this.filters.eventId,
        filter => {
          this.filters.eventId = filter;
          this.onFilterChange({ eventId: filter }, this.filters);
        },
        this.prefixId + "_query_event",
        getReadableEvent
      );
    }

    if (this.tags.length) {
      const tagSelect = createSelect(
        container,
        this.tags,
        this.filters.tag,
        filter => {
          this.filters.tag = filter;
          this.onFilterChange({ tag: filter }, this.filters);
        },
        this.prefixId + "_query_tag",
        this.getTagString
      );
      tagSelect.style.width = "180px";
    }

    if (this.showManaFilter) {
      const manas = createDivision([this.prefixId + "_query_mana"]);
      manas.style.display = "flex";
      manas.style.margin = "auto 8px";
      orderedColorCodesCommon.forEach(code => {
        const filterClasses = ["mana_filter"];
        if (!this.filters.colors[code]) {
          filterClasses.push("mana_filter_on");
        }
        var manabutton = createDivision(filterClasses);
        manabutton.style.backgroundImage = `url(../images/${code}20.png)`;
        manabutton.style.width = "30px";
        manabutton.addEventListener("click", () => {
          if (manabutton.classList.contains("mana_filter_on")) {
            manabutton.classList.remove("mana_filter_on");
            this.filters.colors[code] = true;
          } else {
            manabutton.classList.add("mana_filter_on");
            this.filters.colors[code] = false;
          }
          const colors = this.filters.colors;
          this.onFilterChange({ colors }, this.filters);
        });
        manas.appendChild(manabutton);
      });
      container.appendChild(manas);
    }

    if (this.decks.length) {
      const deckSelect = createSelect(
        container,
        this.decks.map(deck => deck.id),
        this.filters.deckId,
        filter => {
          this.filters.deckId = filter;
          this.onFilterChange({ deckId: filter }, this.filters);
        },
        this.prefixId + "_query_deck",
        this.getDeckString
      );
      deckSelect.style.width = "300px";
    }

    return container;
  }
}

module.exports = FilterPanel;
