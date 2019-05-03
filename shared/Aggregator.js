"use strict";
/*
globals
  compare_decks,
  doesDeckStillExist,
  getDeck,
  getRecentDeckName,
  matchesHistory,
  orderedColorCodes,
  orderedColorCodesCommon
*/

// Default filter values
const DEFAULT_DECK = "All Decks";
const DEFAULT_EVENT = "All Events";
const DEFAULT_TAG = "All Tags";
// Draft-related constants
const ALL_DRAFTS = "All Drafts";
const DRAFT_REPLAYS = "Draft Replays";

class Aggregator {
  constructor(filters) {
    this.filterDeck = this.filterDeck.bind(this);
    this.filterMatch = this.filterMatch.bind(this);
    this.updateFilters = this.updateFilters.bind(this);
    this.updateFilters(filters);
  }

  static getDefaultFilters() {
    const colorFilters = {};
    orderedColorCodesCommon.forEach(code => (colorFilters[code] = false));
    return {
      eventId: DEFAULT_EVENT,
      tag: DEFAULT_TAG,
      colors: colorFilters,
      deckId: DEFAULT_DECK,
      onlyCurrentDecks: false
    };
  }

  static isDraftMatch(match) {
    return (
      (match.eventId && match.eventId.includes("Draft")) ||
      (match.type && match.type === "draft")
    );
  }

  static gatherTags(_decks) {
    const tagSet = new Set();
    const formatSet = new Set();
    const counts = {};
    _decks.forEach(deck => {
      if (deck.tags) {
        deck.tags.forEach(tag => {
          tagSet.add(tag);
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
      if (deck.format) {
        formatSet.add(deck.format);
        counts[deck.format] = (counts[deck.format] || 0) + 1;
      }
    });
    let tagList = [...tagSet].filter(tag => tag && !formatSet.has(tag));
    tagList.sort(); // alpha sort instead of counts for now
    tagList = [DEFAULT_TAG, ...tagList];
    let formatList = [...formatSet];
    formatList.sort((a, b) => counts[b] - counts[a]);

    return [...tagList, ...formatList];
  }

  filterDeck(deck) {
    const { tag, colors, deckId, onlyCurrentDecks } = this.filters;
    if (!deck) return deckId === DEFAULT_DECK;
    const passesDeckFilter = deckId === DEFAULT_DECK || deckId === deck.id;
    if (!passesDeckFilter) return false;

    const deckTags = [deck.format];
    if (deck.tags) {
      deckTags.push(...deck.tags);
    }
    const currentDeck = getDeck(deck.id);
    if (currentDeck) {
      deckTags.push(currentDeck.format);
      if (currentDeck.tags) {
        deckTags.push(...currentDeck.tags);
      }
    }
    const passesTagFilter =
      tag === DEFAULT_TAG || deckTags.indexOf(tag) > -1;
    if (!passesTagFilter) return false;

    if (deck.colors instanceof Array) {
      const deckColorCodes = deck.colors.map(i => orderedColorCodes[i - 1]);
      for (const code in colors) {
        if (colors[code]) {
          if (deckColorCodes.indexOf(code) === -1) return false;
        }
      }
    } else if (deck.colors instanceof Object) {
      for (const code in colors) {
        if (colors[code] && code in deck.colors) {
          if (!(deck.colors[code] > 0)) return false;
        }
      }
    }

    if (onlyCurrentDecks) {
      return doesDeckStillExist(deck.id);
    }

    return true;
  }

  filterMatch(match) {
    if (!match) return false;
    const { eventId } = this.filters;

    const passesEventFilter =
      (eventId === DEFAULT_EVENT && match.eventId !== "AIBotMatch") ||
      eventId === match.eventId ||
      (eventId === ALL_DRAFTS && Aggregator.isDraftMatch(match)) ||
      (eventId === DRAFT_REPLAYS && match.type === "draft");
    if (!passesEventFilter) return false;

    return this.filterDeck(match.playerDeck);
  }

  updateFilters(filters = {}) {
    this.filters = {
      ...Aggregator.getDefaultFilters(),
      ...this.filters,
      ...filters
    };
    this._matches = matchesHistory.matches
      .map(matchId => matchesHistory[matchId])
      .filter(this.filterMatch);

    this._eventIds = [];
    const eventSet = new Set();
    this._decks = [];
    const deckMap = {};
    let wins = 0;
    let loss = 0;
    let winrate = 0;
    let duration = 0;
    const colorsWinrates = [];
    const tagsWinrates = [];
    this._matches.forEach(match => {
      if (match.eventId && !eventSet.has(match.eventId)) {
        this._eventIds.push(match.eventId);
        eventSet.add(match.eventId);
      }
      if (match.playerDeck && !(match.playerDeck.id in deckMap)) {
        deckMap[match.playerDeck.id] = match.playerDeck;
      }
      // some of the data is wierd. Games which last years or have no data.
      if (match.duration && match.duration < 3600) {
        duration += match.duration;
      }
      if (match.player && match.opponent) {
        if (match.player.win > match.opponent.win) {
          wins++;
        }
        if (match.player.win < match.opponent.win) {
          loss++;
        }
      }
      // color win/loss
      if (match.oppDeck) {
        const oppDeckColors = get_deck_colors(match.oppDeck);
        if (oppDeckColors && oppDeckColors.length > 0) {
          let added = -1;
          colorsWinrates.forEach((wr, index) => {
            if (compare_colors(wr.colors, oppDeckColors)) {
              added = index;
            }
          });
          if (added === -1) {
            added =
              colorsWinrates.push({
                colors: oppDeckColors,
                wins: 0,
                losses: 0
              }) - 1;
          }
          if (match.player.win > match.opponent.win) {
            colorsWinrates[added].wins++;
          }
          if (match.player.win < match.opponent.win) {
            colorsWinrates[added].losses++;
          }
        }
        // tag win/loss
        if (match.tags !== undefined && match.tags.length > 0) {
          const tag = match.tags[0] || "Unknown";
          let added = -1;
          tagsWinrates.forEach((wr, index) => {
            if (wr.tag === tag) {
              added = index;
            }
          });
          if (added === -1) {
            added = tagsWinrates.push({ tag: tag, wins: 0, losses: 0 }) - 1;
          }
          tagsWinrates[added].colors = oppDeckColors;
          if (match.player.win > match.opponent.win) {
            tagsWinrates[added].wins += 1;
          }
          if (match.player.win < match.opponent.win) {
            tagsWinrates[added].losses += 1;
          }
        }
      }
    });
    if (wins + loss) {
      winrate = Math.round((1 / (wins + loss)) * wins * 100) / 100;
    }
    colorsWinrates.sort(compare_winrates);
    tagsWinrates.sort(compare_winrates);
    this._stats = {
      total: winrate,
      wins,
      losses: loss,
      duration,
      colors: colorsWinrates,
      tags: tagsWinrates
    };

    for (const deckId in deckMap) {
      const deck = getDeck(deckId) || deckMap[deckId];
      if (deck) {
        this._decks.push(deck);
      }
    }
    this._decks.sort((a, b) => {
      const aName = getRecentDeckName(a.id);
      const aExists = doesDeckStillExist(a.id) ? 1 : 0;
      const bName = getRecentDeckName(b.id);
      const bExists = doesDeckStillExist(b.id) ? 1 : 0;
      // sort by existence, then name
      return bExists - aExists || aName.localeCompare(bName);
    });
  }

  get matches() {
    return this._matches;
  }

  get events() {
    return [
      DEFAULT_EVENT,
      ALL_DRAFTS,
      DRAFT_REPLAYS,
      ...this._eventIds
    ];
  }

  get decks() {
    return [{ id: DEFAULT_DECK, name: DEFAULT_DECK }, ...this._decks];
  }

  get stats() {
    return this._stats;
  }

  get tags() {
    return Aggregator.gatherTags(this.decks);
  }
}

Aggregator.DEFAULT_DECK = DEFAULT_DECK;
Aggregator.DEFAULT_EVENT = DEFAULT_EVENT;
Aggregator.DEFAULT_TAG = DEFAULT_TAG;
Aggregator.ALL_DRAFTS = ALL_DRAFTS;
Aggregator.DRAFT_REPLAYS = DRAFT_REPLAYS;

module.exports = Aggregator;
