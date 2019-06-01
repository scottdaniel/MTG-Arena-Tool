const electron = require("electron");
const { remote, ipcRenderer: ipc } = require("electron");

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
  require("devtron").install();
}

const _ = require("lodash");
const path = require("path");
const Store = require("electron-store");
const fs = require("fs");
const sha1 = require("js-sha1");

const httpApi = require("./http-api");
const manifestParser = require("./manifest-parser");
const greToClientInterpreter = require("./gre-to-client-interpreter");
const Deck = require("../shared/deck.js");
const db = require("../shared/database");
const pd = require("../shared/player-data.js");
const { hypergeometricRange } = require("../shared/stats-fns");
const { get_rank_index, objectClone } = require("../shared/util");
const { HIDDEN_PW, IPC_OVERLAY } = require("../shared/constants.js");
const { ipc_send, pd_sync, unleakString } = require("./background-util");
const {
  onLabelOutLogInfo,
  onLabelGreToClient,
  onLabelClientToMatchServiceMessageTypeClientToGREMessage,
  onLabelInEventGetPlayerCourse,
  onLabelInEventGetPlayerCourseV2,
  onLabelInEventJoin,
  onLabelInEventGetCombinedRankInfo,
  onLabelInDeckGetDeckLists,
  onLabelInDeckGetDeckListsV3,
  onLabelInEventGetPlayerCourses,
  onLabelInEventGetPlayerCoursesV2,
  onLabelInDeckUpdateDeck,
  onLabelInDeckUpdateDeckV3,
  onLabelInventoryUpdated,
  onLabelInPlayerInventoryGetPlayerInventory,
  onLabelInPlayerInventoryGetPlayerCardsV3,
  onLabelInEventDeckSubmit,
  onLabelInEventDeckSubmitV3,
  onLabelInEventGetActiveEvents,
  onLabelEventMatchCreated,
  onLabelOutDirectGameChallenge,
  onLabelOutEventAIPractice,
  onLabelInDraftDraftStatus,
  onLabelInDraftMakePick,
  onLabelOutDraftMakePick,
  onLabelInEventCompleteDraft,
  onLabelMatchGameRoomStateChangedEvent,
  onLabelInEventGetSeasonAndRankDetail,
  onLabelGetPlayerInventoryGetRewardSchedule,
  onLabelRankUpdated
} = require("./labels");

const rememberCfg = {
  email: "",
  token: "",
  settings: {
    auto_login: false,
    launch_to_tray: false,
    remember_me: true,
    beta_channel: false
  }
};

const settingsCfg = {
  gUri: ""
};

var rstore = new Store({
  name: "remember",
  defaults: rememberCfg
});

var store = new Store({
  name: "default",
  defaults: pd.defaultCfg
});

var settingsStore = new Store({
  name: "settings",
  defaults: settingsCfg
});

const debugLog = false;
const debugNet = true;
var debugLogSpeed = 0.001;

const actionLogDir = path.join(
  (electron.app || electron.remote.app).getPath("userData"),
  "actionlogs"
);
if (!fs.existsSync(actionLogDir)) {
  fs.mkdirSync(actionLogDir);
}

var firstPass = true;
var tokenAuth = undefined;

var currentMatchDefault = {
  eventId: "",
  matchId: "",
  beginTime: 0,
  matchTime: 0,
  currentPriority: 0,
  bestOf: 1,
  game: 0,
  priorityTimers: [0, 0, 0, 0, 0],
  lastPriorityChangeTime: 0,
  results: [],
  playerChances: {},
  playerCardsLeft: {},
  oppCards: {},
  onThePlay: 0,
  GREtoClient: {},
  processedAnnotations: [],
  timers: {},
  zones: [],
  players: {},
  annotations: [],
  gameObjs: {},
  gameInfo: {},
  gameStage: "",
  turnInfo: {},
  playerCardsUsed: [],
  oppCardsUsed: [],
  player: {
    seat: 1,
    deck: { mainDeck: [], sideboard: [] },
    life: 20,
    turn: 0,
    name: "",
    id: "",
    rank: "",
    tier: 1
  },
  opponent: {
    seat: 2,
    deck: { mainDeck: [], sideboard: [] },
    life: 20,
    turn: 0,
    name: "",
    id: "",
    rank: "",
    tier: 1
  }
};

var currentDraftDefault = {
  eventId: "",
  draftId: "",
  set: "",
  owner: ""
};

var currentDraft = null;
/*
var currentDraft = undefined;
var currentDraftPack = undefined;
var draftSet = "";
var draftId = undefined;
*/

var currentMatch = null;

var renderer_state = 0;
var originalDeck = new Deck();

var currentDeck = new Deck();
var duringMatch = false;
var matchBeginTime = 0;
var matchGameStats = [];
var matchCompletedOnGameNumber = 0;
var gameNumberCompleted = 0;
let initialLibraryInstanceIds = [];
let idChanges = {};
let instanceToCardIdMap = {};

var logLanguage = "English";
var lastDeckUpdate = new Date();

//
ipc.on("save_app_settings", function(event, arg) {
  ipc_send("show_loading");
  const rSettings = rstore.get("settings");
  const updated = { ...rSettings, ...arg };

  if (!updated.remember_me) {
    rstore.set("email", "");
    rstore.set("token", "");
  }

  loadSettings(updated);
  rstore.set("settings", updated);
  ipc_send("hide_loading");
});

//
ipc.on("reload_overlay", function() {
  loadSettings();
  var obj = store.get("overlayBounds");
  ipc_send("overlay_set_bounds", obj);
});

//
ipc.on("set_renderer_state", function(event, arg) {
  ipc_send("ipc_log", "Renderer state: " + arg);
  renderer_state = arg;
  loadSettings();

  let username = "";
  let password = "";
  const remember_me = rstore.get("settings").remember_me;

  if (remember_me) {
    username = rstore.get("email");
    const token = rstore.get("token");
    if (username != "" && token != "") {
      password = HIDDEN_PW;
      tokenAuth = token;
    }
  }

  ipc_send("prefill_auth_form", {
    username,
    password,
    remember_me
  });
});

function offlineLogin() {
  pd_sync({ userName: "" });
  ipc_send("auth", { ok: true, user: -1 });
  ipc_send("set_offline", true);
  loadPlayerConfig(pd.arenaId);
}

//
ipc.on("auto_login", () => {
  const rSettings = rstore.get("settings");
  if (!rSettings.auto_login) return;

  tokenAuth = rstore.get("token");
  ipc_send("popup", {
    text: "Logging in automatically...",
    time: 0,
    progress: 2
  });
  if (rSettings.remember_me) {
    httpApi.httpAuth(rstore.get("email"), HIDDEN_PW);
    httpApi.httpHomeGet();
  } else {
    offlineLogin();
  }
});

//
ipc.on("login", function(event, arg) {
  if (arg.password == HIDDEN_PW) {
    tokenAuth = rstore.get("token");
    httpApi.httpAuth(arg.username, arg.password);
    httpApi.httpHomeGet();
  } else if (arg.username === "" && arg.password === "") {
    offlineLogin();
  } else {
    tokenAuth = "";
    httpApi.httpAuth(arg.username, arg.password);
    httpApi.httpHomeGet();
  }
});

//
ipc.on("request_draft_link", function(event, obj) {
  httpApi.httpDraftShareLink(obj.id, obj.expire);
});

//
ipc.on("windowBounds", function(event, obj) {
  store.set("windowBounds", obj);
});

//
ipc.on("overlayBounds", function(event, obj) {
  store.set("overlayBounds", obj);
});

//
ipc.on("save_user_settings", function(event, settings) {
  ipc_send("show_loading");
  const oldSettings = store.get("settings");
  const updated = { ...oldSettings, ...settings };

  // clean up garbage jQuery data that slipped into some configs
  // TODO remove this after it has a chance to run everywhere
  const jQueryGarbageKeys = [
    "currentTarget",
    "delegateTarget",
    "handleObj",
    "originalEvent",
    "relatedTarget",
    "target",
    "timeStamp",
    "type",
    ...Object.keys(updated).filter(key => key.slice(0, 6) === "jQuery")
  ];
  jQueryGarbageKeys.forEach(key => delete updated[key]);

  loadSettings(updated);
  store.set("settings", updated);
  ipc_send("hide_loading");
});

//
ipc.on("delete_data", function() {
  httpApi.httpDeleteData();
});

//
ipc.on("toggle_deck_archived", function(event, arg) {
  ipc_send("show_loading");
  pd.toggleDeckArchived(arg);
  store.set("decks." + arg, pd.deck(arg));
  ipc_send("hide_loading");
});

//
ipc.on("toggle_archived", function(event, arg) {
  ipc_send("show_loading");
  pd.toggleArchived(arg);
  store.set(arg, pd[arg]);
  ipc_send("hide_loading");
});

//
ipc.on("calculate_rank_wins", () => {
  if (pd.rankwinrates) return;
  ipc_send("show_loading");
  ipc_send("popup", {
    text: "Calculating ranked win rates...",
    time: 0,
    progress: 2
  });
  calculateRankWins();
  ipc_send("popup", {
    text: "Calculation complete.",
    time: 3000,
    progress: -1
  });
  ipc_send("hide_loading");
  ipc_send("rank_wins_updated");
});

// Calculates winrates for history tabs (set to last 10 dys as default)
function calculateRankWins() {
  var rankwinrates = {
    constructed: {
      bronze: { w: 0, l: 0, t: 0, r: "Bronze" },
      silver: { w: 0, l: 0, t: 0, r: "Silver" },
      gold: { w: 0, l: 0, t: 0, r: "Gold" },
      platinum: { w: 0, l: 0, t: 0, r: "Platinum" },
      diamond: { w: 0, l: 0, t: 0, r: "Diamond" },
      mythic: { w: 0, l: 0, t: 0, r: "Mythic" },
      step: pd.rank.constructed.step,
      steps: db.getRankSteps(
        pd.rank.constructed.rank,
        pd.rank.constructed.tier,
        false
      ),
      total: {
        w: pd.rank.constructed.won,
        l: pd.rank.constructed.lost,
        t: pd.rank.constructed.won + pd.rank.constructed.lost
      }
    },
    limited: {
      bronze: { w: 0, l: 0, t: 0, r: "Bronze" },
      silver: { w: 0, l: 0, t: 0, r: "Silver" },
      gold: { w: 0, l: 0, t: 0, r: "Gold" },
      platinum: { w: 0, l: 0, t: 0, r: "Platinum" },
      diamond: { w: 0, l: 0, t: 0, r: "Diamond" },
      mythic: { w: 0, l: 0, t: 0, r: "Mythic" },
      step: pd.rank.limited.step,
      steps: db.getRankSteps(pd.rank.limited.rank, pd.rank.limited.tier, true),
      total: {
        w: pd.rank.limited.won,
        l: pd.rank.limited.lost,
        t: pd.rank.limited.won + pd.rank.limited.lost
      }
    }
  };

  let ss = db.season_starts;
  let se = db.season_ends;

  for (let i = 0; i < pd.matches.length; i++) {
    const match_id = pd.matches[i];
    const match = pd.match(match_id);

    if (match === undefined) continue;
    if (match.type !== "match") continue;
    if (match.opponent === undefined) continue;

    let md = new Date(match.date);

    if (md < ss) continue;
    if (md > se) continue;

    let struct;
    if (match.eventId === "Ladder" || match.eventId === "Traditional_Ladder") {
      struct = rankwinrates.constructed;
    } else if (db.ranked_events.includes(match.eventId)) {
      struct = rankwinrates.limited;
    } else {
      continue;
    }

    struct = struct[match.player.rank.toLowerCase()];

    if (struct) {
      struct.t += match.opponent.win + match.player.win;
      struct.l += match.opponent.win;
      struct.w += match.player.win;
    }
  }

  pd_sync({ rankwinrates });
}

ipc.on("request_explore", function(event, arg) {
  if (pd.userName === "") {
    ipc_send("offline", 1);
  } else {
    let cards = store.get("cards.cards");
    httpApi.httpGetExplore(arg, cards);
  }
});

ipc.on("request_course", function(event, arg) {
  httpApi.httpGetCourse(arg);
});

ipc.on("request_home", (event, set) => {
  if (pd.userName === "") {
    ipc_send("offline", 1);
  } else {
    httpApi.httpHomeGet(set);
  }
});

ipc.on("tou_get", function(event, arg) {
  httpApi.httpTournamentGet(arg);
});

ipc.on("tou_join", function(event, arg) {
  httpApi.httpTournamentJoin(arg.id, arg.deck, sha1(arg.pass));
});

ipc.on("tou_drop", function(event, arg) {
  httpApi.httpTournamentDrop(arg);
});

ipc.on("edit_tag", (event, arg) => {
  const { tag, color } = arg;
  const tags_colors = {
    ...pd.tags_colors,
    [tag]: color
  };
  pd.handleSetPlayerData(null, { tags_colors });

  store.set("tags_colors", tags_colors);
});

ipc.on("delete_tag", (event, arg) => {
  const { deckid, tag } = arg;
  const deck = pd.deck(deckid);
  if (!deck || !deck.tags || !deck.tags.includes(tag)) return;

  const tags = [...deck.tags];
  tags.splice(tags.indexOf(tag), 1);

  const decks_tags = {
    ...pd.decks_tags,
    [deckid]: tags
  };
  pd.handleSetPlayerData(null, { decks_tags });

  store.set("decks_tags", decks_tags);
});

ipc.on("add_tag", (event, arg) => {
  const { deckid, tag } = arg;
  const deck = pd.deck(deckid);
  if (!deck || deck.format === tag) return;
  if (deck.tags && deck.tags.includes(tag)) return;

  const decks_tags = {
    ...pd.decks_tags,
    [deckid]: [...deck.tags, tag]
  };
  pd.handleSetPlayerData(null, { decks_tags });

  store.set("decks_tags", decks_tags);
});

ipc.on("delete_history_tag", (event, arg) => {
  const { matchid, tag } = arg;
  const match = pd.match(matchid);
  if (!match || !match.tags || !match.tags.includes(tag)) return;

  match.tags.splice(match.tags.indexOf(tag), 1);
  pd.handleSetPlayerData(null, { [matchid]: match });

  store.set(matchid, match);
});

ipc.on("add_history_tag", (event, arg) => {
  const { matchid, tag } = arg;
  const match = pd.match(matchid);
  if (!match) return;
  if (match.tags && match.tags.includes(tag)) return;

  if (match.tags) {
    match.tags.push(tag);
  } else {
    match.tags = [tag];
  }
  pd.handleSetPlayerData(null, { [matchid]: match });

  httpApi.httpSetDeckTag(tag, match.oppDeck.mainDeck, match.eventId);
  store.set(matchid, match);
});

let odds_sample_size = 1;
ipc.on("set_odds_samplesize", function(event, state) {
  odds_sample_size = state;
  forceDeckUpdate(false);
  update_deck(true);
});

// Loads this player's configuration file
function loadPlayerConfig(playerId, serverData = undefined) {
  ipc_send("ipc_log", "Load player ID: " + playerId);
  ipc_send("popup", {
    text: "Loading player history...",
    time: 0,
    progress: 2
  });
  store = new Store({
    name: playerId,
    defaults: pd.defaultCfg
  });
  const playerData = store.get();
  pd_sync(playerData);

  ipc_send("popup", {
    text: "Player history loaded.",
    time: 3000,
    progress: -1
  });

  if (serverData) {
    const requestSync = {};
    requestSync.courses = serverData.courses.filter(id => !(id in playerData));
    requestSync.matches = serverData.matches.filter(id => !(id in playerData));
    requestSync.drafts = serverData.drafts.filter(id => !(id in playerData));
    requestSync.economy = serverData.economy.filter(id => !(id in playerData));

    const itemCount =
      requestSync.courses.length +
      requestSync.matches.length +
      requestSync.drafts.length +
      requestSync.economy.length;

    if (itemCount) {
      ipc_send("ipc_log", "Fetch remote player items: " + itemCount);
      httpApi.httpSyncRequest(requestSync);
      // console.log("requestSync", requestSync);
    } else {
      ipc_send("ipc_log", "No need to fetch remote player items.");
    }
  }

  ipc_send("popup", {
    text: "Loading settings...",
    time: 0,
    progress: 2
  });

  // TODO move this into main?
  const obj = store.get("overlayBounds");
  ipc_send("overlay_set_bounds", obj);
  loadSettings();

  watchingLog = true;
  stopWatchingLog = startWatchingLog();
  ipc_send("popup", {
    text: "Settings loaded.",
    time: 3000,
    progress: -1
  });
}

function syncUserData(data) {
  // Sync Events
  const courses_index = [...pd.courses_index];
  data.courses
    .filter(doc => !pd.eventExists(doc._id))
    .forEach(doc => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      courses_index.push(id);
      store.set(id, doc);
      pd_sync({ [id]: doc });
    });
  store.set("courses_index", courses_index);
  pd_sync({ courses_index });

  // Sync Matches
  const matches_index = [...pd.matches_index];
  data.matches
    .filter(doc => !pd.matchExists(doc._id))
    .forEach(doc => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      matches_index.push(id);
      store.set(id, doc);
      pd_sync({ [id]: doc });
    });
  store.set("matches_index", matches_index);
  pd_sync({ matches_index });

  // Sync Economy
  const economy_index = [...pd.economy_index];
  data.economy
    .filter(doc => !pd.changeExists(doc._id))
    .forEach(doc => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      economy_index.push(id);
      store.set(id, doc);
      pd_sync({ [id]: doc });
    });
  store.set("economy_index", economy_index);
  pd_sync({ economy_index });

  // Sync Drafts
  const draft_index = [...pd.draft_index];
  data.drafts
    .filter(doc => !pd.draftExists(doc._id))
    .forEach(doc => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      draft_index.push(id);
      store.set(id, doc);
      pd_sync({ [id]: doc });
    });
  store.set("draft_index", draft_index);
  pd_sync({ draft_index });
}

// Loads and combines settings variables, sends result to display
function loadSettings(dirtySettings = {}) {
  // Blends together default, user, app, and optional dirty config
  // "dirty" config may be a subset, which allows early UI updates
  //  to make UI responsive without waiting for slow store IO
  // Since settings have migrated between areas, collisions happen
  // Order of precedence is: dirty > app > user > defaults
  const settings = store.get("settings");
  const rSettings = rstore.get("settings");
  const _settings = {
    ...pd.defaultCfg.settings,
    ...settings,
    ...rSettings,
    ...dirtySettings
  };

  //console.log(_settings);
  //const exeName = path.basename(process.execPath);

  skipFirstPass = _settings.skip_firstpass;

  ipc_send("overlay_set_ontop", _settings.overlay_ontop);

  if (_settings.show_overlay == false) {
    ipc_send("overlay_close", 1);
  } else if (duringMatch || _settings.show_overlay_always) {
    ipc_send("overlay_show", 1);
  }

  pd.handleSetSettings(null, _settings);
  ipc_send("set_settings", _settings);
  ipc_send("settings_updated");
}

// Set a new log URI
ipc.on("set_log", function(event, arg) {
  if (watchingLog) {
    stopWatchingLog();
    stopWatchingLog = startWatchingLog();
  }
  logUri = arg;
  settingsStore.set("logUri", arg);
});

// Read the log
// Set variables to default first
const mtgaLog = require("./mtga-log");
let prevLogSize = 0;
let watchingLog = false;
let stopWatchingLog;

let logUri = mtgaLog.defaultLogUri();
let settingsLogUri = settingsStore.get("logUri");
if (settingsLogUri) {
  logUri = settingsLogUri;
}

if (typeof process.env.LOGFILE !== "undefined") {
  logUri = process.env.LOGFILE;
}

console.log(logUri);
const ArenaLogWatcher = require("./arena-log-watcher");

let logReadStart = null;
let logReadEnd = null;

function startWatchingLog() {
  logReadStart = new Date();
  return ArenaLogWatcher.start({
    path: logUri,
    chunkSize: 268435440,
    onLogEntry: onLogEntryFound,
    onError: err => console.error(err),
    onFinish: finishLoading
  });
}

let skipMatch = false;
let skipFirstPass = false;

function onLogEntryFound(entry) {
  if (debugLog) {
    let currentTime = new Date().getTime();
    while (currentTime + debugLogSpeed >= new Date().getTime()) {
      // sleep
    }
  }
  let json;
  if (entry.type == "connection") {
    const data = {
      arenaId: entry.socket.PlayerId,
      arenaVersion: entry.socket.ClientVersion,
      name: entry.socket.PlayerScreenName
    };
    pd_sync(data);
    ipc_send("player_data_updated");
  } else if (entry.playerId && entry.playerId !== pd.arenaId) {
    return;
  } else {
    //console.log("Entry:", entry.label, entry, entry.json());
    if (firstPass) {
      updateLoading(entry);
    }
    if ((firstPass && !skipFirstPass) || !firstPass) {
      try {
        switch (entry.label) {
          case "Log.Info":
            if (entry.arrow == "==>") {
              json = entry.json();
              onLabelOutLogInfo(entry, json);
            }
            break;

          case "GreToClientEvent":
            json = entry.json();
            onLabelGreToClient(entry, json);
            break;

          case "ClientToMatchServiceMessageType_ClientToGREMessage":
            json = entry.json();
            onLabelClientToMatchServiceMessageTypeClientToGREMessage(
              entry,
              json
            );
            break;

          case "Event.GetPlayerCourse":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventGetPlayerCourse(entry, json);
            }
            break;

          case "Event.GetPlayerCourseV2":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventGetPlayerCourseV2(entry, json);
            }
            break;

          case "Event.Join":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventJoin(entry, json);
            }
            break;

          case "Event.GetCombinedRankInfo":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventGetCombinedRankInfo(entry, json);
            }
            break;

          case "Rank.Updated":
            {
              json = entry.json();
              onLabelRankUpdated(entry, json);
            }
            break;

          case "Event.GetPlayerCourses":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventGetPlayerCourses(entry, json);
            }
            break;

          case "Event.GetPlayerCoursesV2":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventGetPlayerCoursesV2(entry, json);
            }
            break;

          case "Deck.GetDeckLists":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInDeckGetDeckLists(entry, json);
            }
            break;

          case "Deck.GetDeckListsV3":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInDeckGetDeckListsV3(entry, json);
            }
            break;

          case "Deck.UpdateDeck":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInDeckUpdateDeck(entry, json);
            }
            break;

          case "Deck.UpdateDeckV3":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInDeckUpdateDeckV3(entry, json);
            }
            break;

          case "Inventory.Updated":
            json = entry.json();
            onLabelInventoryUpdated(entry, json);
            break;

          case "PlayerInventory.GetPlayerInventory":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInPlayerInventoryGetPlayerInventory(entry, json);
            }
            break;

          case "PlayerInventory.GetPlayerCardsV3":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInPlayerInventoryGetPlayerCardsV3(entry, json);
            }
            break;

          case "Event.DeckSubmit":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventDeckSubmit(entry, json);
            }
            break;

          case "Event.DeckSubmitV3":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventDeckSubmitV3(entry, json);
            }
            break;

          case "Event.MatchCreated":
            json = entry.json();
            onLabelEventMatchCreated(entry, json);
            break;

          case "Event.AIPractice":
            if (entry.arrow == "==>") {
              json = entry.json();
              onLabelOutEventAIPractice(entry, json);
            }
            break;

          case "DirectGame.Challenge":
            if (entry.arrow == "==>") {
              json = entry.json();
              onLabelOutDirectGameChallenge(entry, json);
            }
            break;

          case "Draft.DraftStatus":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInDraftDraftStatus(entry, json);
            }
            break;

          case "Draft.MakePick":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInDraftMakePick(entry, json);
            } else {
              json = entry.json();
              onLabelOutDraftMakePick(entry, json);
            }
            break;

          case "Event.CompleteDraft":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventCompleteDraft(entry, json);
            }
            break;

          case "Event.GetActiveEventsV2":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventGetActiveEvents(entry, json);
            }
            break;

          case "MatchGameRoomStateChangedEvent":
            json = entry.json();
            onLabelMatchGameRoomStateChangedEvent(entry, json);
            break;

          case "Event.GetSeasonAndRankDetail":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelInEventGetSeasonAndRankDetail(entry, json);
            }
            break;

          case "PlayerInventory.GetRewardSchedule":
            if (entry.arrow == "<==") {
              json = entry.json();
              onLabelGetPlayerInventoryGetRewardSchedule(entry, json);
            }
            break;

          default:
            break;
        }
      } catch (err) {
        console.log(entry.label, entry.position, entry.json());
        console.error(err);
      }
    }
  }
}

// Old parser
let logLoopInterval = window.setInterval(attemptLogLoop, 250);
async function attemptLogLoop() {
  try {
    await logLoop();
  } catch (err) {
    console.error(err);
  }
}

// Basic logic for reading the log file
async function logLoop() {
  //console.log("logLoop() start");
  //ipc_send("ipc_log", "logLoop() start");
  if (fs.existsSync(logUri)) {
    if (fs.lstatSync(logUri).isDirectory()) {
      ipc_send("no_log", logUri);
      ipc_send("popup", {
        text: "No log file found. Please include the file name too.",
        time: 1000
      });
      return;
    }
  } else {
    ipc_send("no_log", logUri);
    ipc_send("popup", { text: "No log file found.", time: 1000 });
    return;
  }

  if (!firstPass) {
    ipc_send("log_read", 1);
  }

  if (debugLog) {
    firstPass = false;
  }

  if (renderer_state != 1) {
    // The renderer process is not ready, postpose reading the log
    //ipc_send("ipc_log", "readLog logloopmode: "+logLoopMode+", renderer state:"+renderer_state+", logSize: "+logSize+", prevLogSize: "+prevLogSize);
    return;
  }

  const { size } = await mtgaLog.stat(logUri);

  if (size == undefined) {
    // Something went wrong obtaining the file size, try again later
    return;
  }

  const delta = Math.min(268435440, size - prevLogSize);

  if (delta === 0) {
    // The log has not changed since we last checked
    return;
  }

  const logSegment =
    delta > 0
      ? await mtgaLog.readSegment(logUri, prevLogSize, delta)
      : await mtgaLog.readSegment(logUri, 0, size);

  // We are looping only to get user data (processLogUser)
  // Process only the user data for initial loading (prior to log in)
  // Same logic as processLog() but without the processLogData() function
  const rawString = logSegment;
  var splitString = rawString.split("[UnityCrossThread");
  const parsedData = {};

  splitString.forEach(value => {
    //ipc_send("ipc_log", "Async: ("+index+")");

    // Get player Id
    let strCheck = '"playerId": "';
    if (value.includes(strCheck)) {
      parsedData.arenaId = unleakString(dataChop(value, strCheck, '"'));
    }

    // Get User name
    strCheck = '"screenName": "';
    if (value.includes(strCheck)) {
      parsedData.name = unleakString(dataChop(value, strCheck, '"'));
    }

    // Get Client Version
    strCheck = '"clientVersion": "';
    if (value.includes(strCheck)) {
      parsedData.arenaVersion = unleakString(dataChop(value, strCheck, '"'));
      // We request manifest data here
      //manifestParser.requestManifestData(pd.arenaVersion);
    }
    /*
    if (firstPass) {
      ipc_send("popup", {"text": "Reading: "+Math.round(100/splitString.length*index)+"%", "time": 1000});
    }
    */
  });

  for (let key in parsedData) {
    ipc_send("ipc_log", `Initial log parse: ${key}=${parsedData[key]}`);
  }
  pd_sync(parsedData);
  ipc_send("player_data_updated");

  if (pd.arenaId) {
    clearInterval(logLoopInterval);
  }
  prevLogSize = size;

  if (firstPass && pd.name === null) {
    ipc_send("popup", { text: "output_log contains no player data", time: 0 });
  }
}

function decodePayload(json) {
  const messages = require("./messages_pb");

  const msgType = json.clientToMatchServiceMessageType.split("_")[1],
    binaryMsg = new Buffer.from(json.payload, "base64");

  try {
    let msgDeserialiser;
    if (
      msgType === "ClientToGREMessage" ||
      msgType === "ClientToGREUIMessage"
    ) {
      msgDeserialiser = messages.ClientToGREMessage;
    } else if (msgType === "ClientToMatchDoorConnectRequest") {
      msgDeserialiser = messages.ClientToMatchDoorConnectRequest;
    } else if (msgType === "AuthenticateRequest") {
      msgDeserialiser = messages.AuthenticateRequest;
    } else if (msgType === "CreateMatchGameRoomRequest") {
      msgDeserialiser = messages.CreateMatchGameRoomRequest;
    } else if (msgType === "EchoRequest") {
      msgDeserialiser = messages.EchoRequest;
    } else {
      console.warn(`${msgType} - unknown message type`);
      return;
    }
    const msg = msgDeserialiser.deserializeBinary(binaryMsg);
    //console.log(json.msgType);
    //console.log(msg.toObject());
    return msg.toObject();
  } catch (e) {
    console.log(e.message);
  }

  return;
}

// Cuts the string "data" between first ocurrences of the two selected words "startStr" and "endStr";
function dataChop(data, startStr, endStr) {
  var start = data.indexOf(startStr) + startStr.length;
  var end = data.length;
  data = data.substring(start, end);

  if (endStr != "") {
    start = 0;
    end = data.indexOf(endStr);
    data = data.substring(start, end);
  }

  return data;
}

function setDraftCards(json) {
  ipc.send("set_draft_cards", currentDraft);
}

function actionLogGenerateLink(grpId) {
  var card = db.card(grpId);
  return '<log-card id="' + grpId + '">' + card.name + "</log-card>";
}

function actionLogGenerateAbilityLink(abId) {
  return `<log-ability id="${abId}">ability</log-ability>`;
}

var currentActionLog = "";

// Send action log data to overlay
function actionLog(seat, time, str, grpId = 0) {
  if (!time) time = new Date();
  if (seat == -99) {
    currentActionLog = "version: 1\r\n";
  } else {
    var hh = ("0" + time.getHours()).slice(-2);
    var mm = ("0" + time.getMinutes()).slice(-2);
    var ss = ("0" + time.getSeconds()).slice(-2);
    /*
    str = str.replace(/(<([^>]+)>)/gi, "");
    */

    currentActionLog += `${seat}\r\n`;
    currentActionLog += `${hh}:${mm}:${ss}\r\n`;
    currentActionLog += `${str}\r\n`;

    try {
      fs.writeFileSync(
        path.join(actionLogDir, currentMatch.matchId + ".txt"),
        currentActionLog,
        "utf-8"
      );
    } catch (e) {
      //
    }
  }

  //console.log("action_log", { seat: seat, time: time }, str);
  ipc_send(
    "action_log",
    { seat: seat, time: time, str: str, grpId: grpId },
    IPC_OVERLAY
  );
}

//
function changePriority(previous, current, time) {
  currentMatch.priorityTimers[previous] +=
    time - currentMatch.lastPriorityChangeTime;

  currentMatch.lastPriorityChangeTime = time;
  currentMatch.priorityTimers[0] = currentMatch.lastPriorityChangeTime;

  currentMatch.currentPriority = current;
  //console.log(priorityTimers);
  //console.log("since match begin:", time - matchBeginTime);
  ipc_send("set_priority_timer", currentMatch.priorityTimers, IPC_OVERLAY);
}

// Get player name by seat in the game
function getNameBySeat(seat) {
  try {
    if (seat == currentMatch.player.seat) {
      return pd.name.slice(0, -6);
    } else {
      let oppName = currentMatch.opponent.name;
      if (oppName && oppName !== "Sparky") {
        oppName = oppName.slice(0, -6);
      }
      return oppName || "Opponent";
    }
  } catch (e) {
    return "???";
  }
}

//
function addCustomDeck(customDeck) {
  const id = customDeck.id;
  const deckData = {
    // preserve custom fields if possible
    ...(pd.deck(id) || {}),
    ...customDeck
  };

  store.set("decks." + id, deckData);
  const decks = { ...pd.decks, [customDeck.id]: deckData };
  const decks_index = [...pd.decks_index];
  if (!decks_index.includes(id)) {
    decks_index.push(id);
  }
  store.set("decks_index", decks_index);

  pd_sync({ decks, decks_index });
}

//
function createMatch(arg) {
  actionLog(-99, new Date(), "");
  var obj = store.get("overlayBounds");

  currentMatch = _.cloneDeep(currentMatchDefault);

  if (!firstPass && store.get("settings").show_overlay == true) {
    if (store.get("settings").close_on_match) {
      ipc_send("renderer_hide", 1);
    }
    ipc_send("overlay_show", 1);
    ipc_send("overlay_set_bounds", obj);
  }

  currentMatch.player.originalDeck = originalDeck;
  currentMatch.player.deck = originalDeck.clone();
  currentMatch.playerCardsLeft = originalDeck.clone();

  currentMatch.opponent.name = arg.opponentScreenName;
  currentMatch.opponent.rank = arg.opponentRankingClass;
  currentMatch.opponent.tier = arg.opponentRankingTier;
  currentMatch.opponent.cards = [];
  currentMatch.eventId = arg.eventId;
  currentMatch.matchId = arg.matchId + "-" + pd.arenaId;
  currentMatch.gameStage = "";

  currentMatch.beginTime = matchBeginTime;

  currentMatch.lastPriorityChangeTime = matchBeginTime;
  matchGameStats = [];
  matchCompletedOnGameNumber = 0;
  gameNumberCompleted = 0;
  initialLibraryInstanceIds = [];
  idChanges = {};
  instanceToCardIdMap = {};

  ipc_send("ipc_log", "vs " + currentMatch.opponent.name);
  ipc_send("set_timer", currentMatch.beginTime, IPC_OVERLAY);
  ipc_send("set_opponent", currentMatch.opponent.name, IPC_OVERLAY);
  ipc_send(
    "set_opponent_rank",
    get_rank_index(currentMatch.opponent.rank, currentMatch.opponent.tier),
    currentMatch.opponent.rank + " " + currentMatch.opponent.tier,
    IPC_OVERLAY
  );

  if (currentMatch.eventId == "DirectGame" && currentDeck) {
    let str = currentDeck.getSave();
    httpApi.httpTournamentCheck(str, currentMatch.opponent.name, true);
  }

  ipc_send("set_priority_timer", currentMatch.priorityTimers, IPC_OVERLAY);
}

//
function createDraft() {
  actionLog(-99, new Date(), "");
  var obj = store.get("overlayBounds");

  currentDraft = _.cloneDeep(currentDraftDefault);
  currentMatch = _.cloneDeep(currentMatchDefault);

  if (!firstPass && store.get("settings").show_overlay == true) {
    if (store.get("settings").close_on_match) {
      ipc_send("renderer_hide", 1);
    }

    ipc_send("overlay_show", 1);
    ipc_send("overlay_set_bounds", obj);
  }

  ipc_send("set_draft", true, IPC_OVERLAY);
  ipc_send("set_timer", -1, IPC_OVERLAY);
  ipc_send("set_opponent", "", IPC_OVERLAY);
}

//
function select_deck(arg) {
  if (arg.CourseDeck) {
    currentDeck = new Deck(arg.CourseDeck);
  } else {
    currentDeck = new Deck(arg);
  }
  console.log("Select deck: ", currentDeck, arg);
  originalDeck = currentDeck.clone();
  ipc_send("set_deck", currentDeck.getSave(), IPC_OVERLAY);
}

//
function clear_deck() {
  var deck = { mainDeck: [], sideboard: [], name: "" };
  ipc_send("set_deck", deck, IPC_OVERLAY);
}

//
function update_deck(force) {
  var nd = new Date();
  if (nd - lastDeckUpdate > 1000 || debugLog || !firstPass || force) {
    forceDeckUpdate();

    let currentMatchCopy = objectClone(currentMatch);
    currentMatchCopy.oppCards = getOppDeck();
    currentMatchCopy.playerCardsLeft = currentMatch.playerCardsLeft.getSave();
    currentMatchCopy.playerCardsOdds = currentMatch.playerChances;
    currentMatchCopy.player.deck = currentMatch.player.deck.getSave();
    currentMatchCopy.player.originalDeck = currentMatch.player.originalDeck.getSave();
    delete currentMatchCopy.GREtoClient;
    delete currentMatchCopy.oppCardsUsed;
    delete currentMatchCopy.playerChances;
    delete currentMatchCopy.annotations;
    delete currentMatchCopy.gameObjs;
    delete currentMatchCopy.latestMessage;
    delete currentMatchCopy.processedAnnotations;
    delete currentMatchCopy.zones;
    currentMatchCopy = JSON.stringify(currentMatchCopy);
    ipc_send("set_match", currentMatchCopy, IPC_OVERLAY);
  }
}

function getBestArchetype(deck) {
  let bestMatch = "-";

  // Calculate worst possible deviation for this deck
  let mainDeviations = [];
  if (deck.mainDeck.length == 0) return bestMatch;
  deck.mainDeck.forEach(card => {
    let deviation = card.quantity;
    mainDeviations.push(deviation * deviation);
  });
  let lowestDeviation = Math.sqrt(
    mainDeviations.reduce((a, b) => a + b) / (mainDeviations.length - 1)
  );
  let highest = lowestDeviation; //err..

  // Test for each archetype
  db.archetypes.forEach(arch => {
    //console.log(arch.name);
    mainDeviations = [];
    deck.mainDeck.forEach(card => {
      //let q = card.quantity;
      let name = db.card(card.id).name;
      let archMain = arch.average.mainDeck;

      let deviation = 1 - (archMain[name] ? 1 : 0); // archMain[name] ? archMain[name] : 0 // for full data
      mainDeviations.push(deviation * deviation);
      //console.log(name, deviation, q, archMain[name]);
    });
    let averageDeviation =
      mainDeviations.reduce((a, b) => a + b) / (mainDeviations.length - 1);
    let finalDeviation = Math.sqrt(averageDeviation);

    if (finalDeviation < lowestDeviation) {
      lowestDeviation = finalDeviation;
      bestMatch = arch;
    }
    //console.log(">>", averageDeviation, Math.sqrt(averageDeviation));
  });

  if (lowestDeviation > highest * 0.5) {
    return "Unknown";
  }

  return bestMatch.name;
}

//
function getOppDeck() {
  let _deck = new Deck({}, currentMatch.oppCardsUsed, false);
  _deck.mainboard.removeDuplicates(true);
  _deck.getColors();

  let format = db.events_format[currentMatch.eventId];
  currentMatch.opponent.deck.archetype = "-";
  let bestMatch = "-";

  _deck = _deck.getSave();
  _deck.archetype = getBestArchetype(_deck);

  return _deck;
}

//
function forceDeckUpdate(removeUsed = true) {
  var decksize = 0;
  var cardsleft = 0;
  var typeCre = 0;
  var typeIns = 0;
  var typeSor = 0;
  var typePla = 0;
  var typeArt = 0;
  var typeEnc = 0;
  var typeLan = 0;

  currentMatch.playerCardsLeft = currentMatch.player.deck.clone();

  if (debugLog || !firstPass) {
    currentMatch.playerCardsLeft.mainboard.get().forEach(card => {
      card.total = card.quantity;
      decksize += card.quantity;
      cardsleft += card.quantity;
    });
  }

  if (debugLog || !firstPass) {
    if (removeUsed) {
      cardsleft -= currentMatch.playerCardsUsed.length;
      currentMatch.playerCardsUsed.forEach(grpId => {
        currentMatch.playerCardsLeft.mainboard.remove(grpId, 1);
      });
    }
    let main = currentMatch.playerCardsLeft.mainboard;
    main.addProperty("chance", card =>
      Math.round(
        hypergeometricRange(
          1,
          Math.min(odds_sample_size, card.quantity),
          cardsleft,
          odds_sample_size,
          card.quantity
        ) * 100
      )
    );

    typeLan = main.countType("Land");
    typeCre = main.countType("Creature");
    typeArt = main.countType("Artifact");
    typeEnc = main.countType("Enchantment");
    typeIns = main.countType("Instant");
    typeSor = main.countType("Sorcery");
    typePla = main.countType("Planeswalker");

    let chancesObj = {};
    chancesObj.chanceCre = chanceType(typeCre, cardsleft, odds_sample_size);
    chancesObj.chanceIns = chanceType(typeIns, cardsleft, odds_sample_size);
    chancesObj.chanceSor = chanceType(typeSor, cardsleft, odds_sample_size);
    chancesObj.chancePla = chanceType(typePla, cardsleft, odds_sample_size);
    chancesObj.chanceArt = chanceType(typeArt, cardsleft, odds_sample_size);
    chancesObj.chanceEnc = chanceType(typeEnc, cardsleft, odds_sample_size);
    chancesObj.chanceLan = chanceType(typeLan, cardsleft, odds_sample_size);

    chancesObj.deckSize = decksize;
    chancesObj.cardsLeft = cardsleft;
    currentMatch.playerChances = chancesObj;
  } else {
    let main = currentMatch.playerCardsLeft.mainboard;
    main.addProperty("chance", () => 1);

    let chancesObj = {};
    chancesObj.chanceCre = 0;
    chancesObj.chanceIns = 0;
    chancesObj.chanceSor = 0;
    chancesObj.chancePla = 0;
    chancesObj.chanceArt = 0;
    chancesObj.chanceEnc = 0;
    chancesObj.chanceLan = 0;
    currentMatch.playerChances = chancesObj;
  }
}

function chanceType(quantity, cardsleft, odds_sample_size) {
  return (
    Math.round(
      hypergeometricRange(
        1,
        Math.min(odds_sample_size, quantity),
        cardsleft,
        odds_sample_size,
        quantity
      ) * 1000
    ) / 10
  );
}

//
function saveEconomyTransaction(transaction) {
  const id = transaction.id;
  const txnData = {
    // preserve custom fields if possible
    ...(pd.change(id) || {}),
    ...transaction
  };

  store.set(id, txnData);
  pd_sync({ [id]: txnData });

  if (!pd.economy_index.includes(id)) {
    const economy_index = [...pd.economy_index, id];
    store.set("economy_index", economy_index);
    pd_sync({ economy_index });
  }

  httpApi.httpSetEconomy(txnData);
}

//
function saveCourse(json) {
  const id = json._id;
  delete json._id;
  json.id = id;

  const eventData = {
    date: new Date(),
    // preserve custom fields if possible
    ...(pd.event(id) || {}),
    ...json
  };

  store.set(id, eventData);
  pd_sync({ [id]: eventData });

  if (!pd.courses_index.includes(id)) {
    const courses_index = [...pd.courses_index, id];
    store.set("courses_index", courses_index);
    pd_sync({ courses_index });
  }
}

//
function saveMatch(id) {
  //console.log(currentMatch.matchId, matchId);
  if (!currentMatch || !currentMatch.matchTime || currentMatch.matchId !== id) {
    return;
  }

  let pw = 0;
  let ow = 0;
  let dr = 0;
  currentMatch.results.forEach(function(res) {
    if (res.scope == "MatchScope_Game") {
      if (res.result == "ResultType_Draw") {
        dr += 1;
      } else if (res.winningTeamId == currentMatch.player.seat) {
        pw += 1;
      }
      if (res.winningTeamId == currentMatch.opponent.seat) {
        ow += 1;
      }
    }
  });

  const match = pd.match(id) || {};
  match.onThePlay = currentMatch.onThePlay;
  match.id = currentMatch.matchId;
  match.duration = currentMatch.matchTime;
  match.opponent = {
    name: currentMatch.opponent.name,
    rank: currentMatch.opponent.rank,
    tier: currentMatch.opponent.tier,
    userid: currentMatch.opponent.id,
    seat: currentMatch.opponent.seat,
    win: ow
  };
  let rank, tier;
  if (db.ranked_events.includes(currentMatch.eventId)) {
    rank = pd.rank.limited.rank;
    tier = pd.rank.limited.tier;
  } else {
    rank = pd.rank.constructed.rank;
    tier = pd.rank.constructed.tier;
  }
  match.player = {
    name: pd.name,
    rank,
    tier,
    userid: pd.arenaId,
    seat: currentMatch.player.seat,
    win: pw
  };
  match.draws = dr;

  match.eventId = currentMatch.eventId;
  match.playerDeck = currentMatch.player.originalDeck.getSave();
  match.oppDeck = getOppDeck();

  if (match.oppDeck.archetype && match.oppDeck.archetype !== "-") {
    match.tags = [match.oppDeck.archetype];
  }

  match.date = new Date();
  match.bestOf = currentMatch.bestOf;

  match.gameStats = matchGameStats;

  // Convert string "2.2.19" into number for easy comparison, 1 byte per part, allowing for versions up to 255.255.255
  match.toolVersion = electron.remote.app
    .getVersion()
    .split(".")
    .reduce((acc, cur) => +acc * 256 + +cur);
  match.toolRunFromSource = !electron.remote.app.isPackaged;

  // console.log("Save match:", match);

  store.set(id, match);
  pd_sync({ [id]: match });

  if (!pd.matches_index.includes(id)) {
    const matches_index = [...pd.matches_index, id];
    store.set("matches_index", matches_index);
    pd_sync({ matches_index });
  }

  if (matchCompletedOnGameNumber === gameNumberCompleted) {
    httpApi.httpSetMatch(match);
  }
  ipc_send("set_timer", 0, IPC_OVERLAY);
  ipc_send("popup", { text: "Match saved!", time: 3000 });
}

//
function saveDraft() {
  if (!currentDraft || !currentDraft.draftId) {
    console.log("Couldnt save undefined draft:", currentDraft);
    return;
  }

  const id = currentDraft.draftId + "-draft";
  const draftData = {
    date: new Date(),
    // preserve custom fields if possible
    ...(pd.draft(id) || {}),
    draftId: id,
    id,
    owner: pd.name
  };
  // console.log("Save draft:", currentDraft);

  store.set(id, draftData);
  pd_sync({ [id]: draftData });

  if (!pd.draft_index.includes(id)) {
    const draft_index = [...pd.draft_index, id];
    store.set("draft_index", draft_index);
    pd_sync({ draft_index });
  }

  httpApi.httpSetDraft(draftData);
  ipc_send("popup", { text: "Draft saved!", time: 3000 });
}

//
function updateLoading(entry) {
  if (firstPass) {
    const completion = entry.position / entry.size;
    ipc_send("popup", {
      text: `Reading log: ${Math.round(100 * completion)}%`,
      time: 0,
      progress: completion
    });
  }
}

///
function finishLoading() {
  if (firstPass) {
    firstPass = false;
    logReadEnd = new Date();
    let logReadElapsed = (logReadEnd - logReadStart) / 1000;
    ipc_send("ipc_log", `Log read in ${logReadElapsed}s`);

    ipc_send("popup", {
      text: "Initializing...",
      time: 0,
      progress: 2
    });

    if (duringMatch) {
      ipc_send("renderer_hide", 1);
      ipc_send("overlay_show", 1);
      update_deck(false);
    }

    let obj = store.get("overlayBounds");
    ipc_send("overlay_set_bounds", obj);

    obj = store.get("windowBounds");
    ipc_send("renderer_set_bounds", obj);

    ipc_send("initialize", 1);

    if (pd.name) {
      httpApi.httpSetPlayer(
        pd.name,
        pd.rank.constructed.rank,
        pd.rank.constructed.tier,
        pd.rank.limited.rank,
        pd.rank.limited.tier
      );
    }

    ipc_send("popup", {
      text: "Initialized successfully!",
      time: 3000,
      progress: -1
    });
  }
}

// start
httpApi.httpBasic();
httpApi.httpGetDatabase();
httpApi.htttpGetStatus();
