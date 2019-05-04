"use strict";
/*
globals
  compare_decks,
  doesDeckStillExist,
  getDeck,
  getRecentDeckName,
  matchesHistory,
  orderedColorCodes,
  orderedColorCodesCommon,
  rankedEvents,
  season_starts,
*/

// Default filter values
const DEFAULT_DECK = "All Decks";
const DEFAULT_EVENT = "All Events";
const DEFAULT_TAG = "All Tags";
const DEFAULT_ARCH = "All Archetypes";
// Ranked constants
const RANKED_CONST = "Ranked Constructed";
const RANKED_DRAFT = "Ranked Limited (Current)";
// Draft-related constants
const ALL_DRAFTS = "All Drafts";
const DRAFT_REPLAYS = "Draft Replays";
// Date constants
const DATE_LAST_30 = "Last 30 Days";
const DATE_SEASON = "Current Season";
const DATE_ALL_TIME = "All Time";

const now = new Date();
const then = new Date();
then.setDate(now.getDate() - 30);
const DAYS_AGO_30 = then.toISOString();

const CONSTRUCTED_EVENTS = ["Ladder", "Traditional_Ladder"];

class Aggregator {
  constructor(filters) {
    this.filterDeck = this.filterDeck.bind(this);
    this.filterMatch = this.filterMatch.bind(this);
    this.updateFilters = this.updateFilters.bind(this);
    this.updateFilters(filters);
  }

  static getDefaultColorFilter() {
    const colorFilters = {};
    orderedColorCodesCommon.forEach(code => (colorFilters[code] = false));
    return {...colorFilters};
  }

  static getDefaultFilters() {
    return {
      eventId: DEFAULT_EVENT,
      tag: DEFAULT_TAG,
      colors: Aggregator.getDefaultColorFilter(),
      deckId: DEFAULT_DECK,
      onlyCurrentDecks: false,
      arch: DEFAULT_ARCH,
      oppColors: Aggregator.getDefaultColorFilter(),
      date: DATE_ALL_TIME
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
    const tagList = [...tagSet].filter(tag => tag && !formatSet.has(tag));
    tagList.sort(); // alpha sort instead of counts for now
    const formatList = [...formatSet];
    formatList.sort((a, b) => counts[b] - counts[a]);

    return [DEFAULT_TAG, ...tagList, ...formatList];
  }

  _filterDeckByColors(deck, _colors) {
    if (!deck) return true;

    if (deck.colors instanceof Array) {
      const deckColorCodes = deck.colors.map(i => orderedColorCodes[i - 1]);
      for (const code in _colors) {
        if (_colors[code]) {
          if (!deckColorCodes.includes(code)) return false;
        }
      }
    } else if (deck.colors instanceof Object) {
      for (const code in _colors) {
        if (_colors[code] && code in deck.colors) {
          if (!deckColorCodes.includes(code)) return false;
        }
      }
    }

    return true;
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
      tag === DEFAULT_TAG || deckTags.includes(tag);
    if (!passesTagFilter) return false;

    const passesColorFilter = this._filterDeckByColors(deck, colors);
    if (!passesColorFilter) return false;

    if (onlyCurrentDecks) {
      return doesDeckStillExist(deck.id);
    }

    return true;
  }

  filterMatch(match) {
    if (!match) return false;
    const { eventId, oppColors, arch, date } = this.filters;

    const passesEventFilter =
      (eventId === DEFAULT_EVENT && match.eventId !== "AIBotMatch") ||
      (eventId === RANKED_CONST && CONSTRUCTED_EVENTS.includes(match.eventId)) ||
      (eventId === RANKED_DRAFT && rankedEvents.includes(match.eventId)) ||
      (eventId === ALL_DRAFTS && Aggregator.isDraftMatch(match)) ||
      (eventId === DRAFT_REPLAYS && match.type === "draft") ||
      eventId === match.eventId;
    if (!passesEventFilter) return false;

    const passesPlayerDeckFilter = this.filterDeck(match.playerDeck);
    if (!passesPlayerDeckFilter) return false;

    const passesOppDeckFilter = this._filterDeckByColors(match.oppDeck, oppColors);
    if (!passesOppDeckFilter) return false;

    const matchTags = match.tags || ["Unknown"];
    const passesArchFilter =
      arch === DEFAULT_ARCH || (matchTags.length && arch === matchTags[0]);
    if (!passesArchFilter) return false;

    let dateFilter = null;
    if (date === DATE_SEASON) {
      dateFilter = season_starts;
    } else if (date === DATE_LAST_30) {
      dateFilter = DAYS_AGO_30;
    } else {
      dateFilter = date;
    }
    const passesDateFilter =
      date === DATE_ALL_TIME ||
      dateFilter === null ||
      new Date (match.date) >= new Date(dateFilter);

    return passesDateFilter;
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
    const deckWinrates = {};
    const deckRecentWinrates = {};
    const archSet = new Set();
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
      if (match.playerDeck) {
        deckMap[match.playerDeck.id] = match.playerDeck;
      }
      // some of the data is wierd. Games which last years or have no data.
      if (match.duration && match.duration < 3600) {
        duration += match.duration;
      }
      if (match.player && match.opponent) {
        const computeDeckWinrate = match.playerDeck && doesDeckStillExist(match.playerDeck.id);
        let lastEdit, dId;
        if (computeDeckWinrate) {
          const currentDeck = getDeck(match.playerDeck.id);
          lastEdit = currentDeck.lastUpdated;
          dId = match.playerDeck.id
          if (!(dId in deckWinrates)) {
            deckWinrates[dId] = { wins: 0, losses: 0, winrate: 0 };
          }
          if (!(dId in deckRecentWinrates)) {
            deckRecentWinrates[dId] = { wins: 0, losses: 0, winrate: 0 };
          }
        }
        if (match.player.win > match.opponent.win) {
          wins++;
          if (computeDeckWinrate) {
            deckWinrates[dId].wins++;
            if (lastEdit && match.date > lastEdit) {
              deckRecentWinrates[dId].wins++;
            }
          }
        }
        if (match.player.win < match.opponent.win) {
          loss++;
          if (computeDeckWinrate) {
            deckWinrates[dId].losses++;
            if (lastEdit && match.date > lastEdit) {
              deckRecentWinrates[dId].losses++;
            }
          }
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
          archSet.add(tag);
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
    this._stats = {
      wins,
      losses: loss,
      duration,
      colors: colorsWinrates,
      tags: tagsWinrates
    };
    const finishStats = stats => {
      const wins = stats.wins;
      const loss = stats.losses;
      const total = wins + loss;
      let winrate = 0;
      if (total) {
        winrate = winrate = Math.round((wins / total) * 100) / 100;
      }
      stats.winrate = winrate;
      stats.total = total;
    };
    finishStats(this._stats);
    Object.values(deckWinrates).forEach(finishStats);
    this.deckWinrates = deckWinrates;
    Object.values(deckRecentWinrates).forEach(finishStats);
    this.deckRecentWinrates = deckRecentWinrates;

    colorsWinrates.sort(compare_winrates);
    tagsWinrates.sort(compare_winrates);

    const tagList = [...archSet];
    tagList.sort();
    this.archs = [DEFAULT_ARCH, ...tagList];

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
      RANKED_CONST,
      RANKED_DRAFT,
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
Aggregator.DEFAULT_ARCH = DEFAULT_ARCH;
Aggregator.RANKED_CONST = RANKED_CONST;
Aggregator.RANKED_DRAFT = RANKED_DRAFT;
Aggregator.ALL_DRAFTS = ALL_DRAFTS;
Aggregator.DRAFT_REPLAYS = DRAFT_REPLAYS;
Aggregator.DATE_LAST_30 = DATE_LAST_30;
Aggregator.DATE_SEASON = DATE_SEASON;
Aggregator.DATE_ALL_TIME = DATE_ALL_TIME;

module.exports = Aggregator;
