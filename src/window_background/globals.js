import Deck from '../shared/deck';
import mtgaLog from './mtga-log';

// Hey! If you're here, you might be thinking of adding stuff to this file.
// Don't. This is a shadowy place. You must never go here.
// Hopefully we'll be able to get rid of all of the ones that can change,
// and put them into stores or better structures than a giant export list.

let actionLogDir = "";

let logUri = mtgaLog.defaultLogUri();

var currentDeck = new Deck();

var currentMatch = null;

const debugLog = false;

const debugNet = true;

let duringDraft = false;

var duringMatch = false;

var firstPass = true;

var gameNumberCompleted = 0;

let idChanges = {};

let initialLibraryInstanceIds = [];

let instanceToCardIdMap = {};

let logReadStart = null;

let logTime = false;

var matchCompletedOnGameNumber = 0;

var matchGameStats = [];

var originalDeck = null;

let odds_sample_size = 1;

let toolVersion = null;

const rememberCfg = {
  email: "",
  token: "",
  settings: {
    toolVersion: toolVersion,
    auto_login: false,
    launch_to_tray: false,
    remember_me: true,
    beta_channel: false,
    metadata_lang: "en",
    log_locale_format: ""
  }
};

var rStore = null;

var store = null;

var tokenAuth = undefined;

let watchingLog = false;

let stopWatchingLog;

export default {
  actionLogDir,
  currentDeck,
  currentMatch,
  debugLog,
  debugNet,
  duringDraft,
  duringMatch,
  firstPass,
  gameNumberCompleted,
  idChanges,
  initialLibraryInstanceIds,
  instanceToCardIdMap,
  logReadStart,
  logTime,
  logUri,
  matchCompletedOnGameNumber,
  matchGameStats,
  odds_sample_size,
  originalDeck,
  rememberCfg,
  rStore,
  stopWatchingLog,
  store,
  tokenAuth,
  toolVersion,
  watchingLog
};
