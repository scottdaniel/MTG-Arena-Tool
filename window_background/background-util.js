/*
global
  logLanguage
*/
// Utility functions that belong only to background
const { ipcRenderer: ipc } = require("electron");
const _ = require("lodash");
const parse = require("date-fns").parse;

const {
  IPC_BACKGROUND,
  IPC_MAIN,
  IPC_OVERLAY
} = require("../shared/constants.js");
const pd = require("../shared/player-data.js");

// These were tested briefly , but hey are all taken from actual logs
// At most some format from date-fns could be wrong;
// https://date-fns.org/v2.0.0-alpha.7/docs/parse
let dateLangs = {
  English: "M/dd/yyyy hh:mm:ss aa", //ex 5/28/2019 10:20:35 PM
  German: "dd.MM.yyyy HH:mm:ss", // ex: 19.05.2019 09:59:00
  French: "dd/MM/yyyy HH:mm:ss", //ex: 19/05/2019 10:39:42
  Italian: "dd/MM/yyyy HH:mm:ss", //ex: 19/05/2019 10:43:03
  Japanese: "yyyy/MM/dd HH:mm:ss", //ex: 2019/05/19 10:45:04
  Korean: "yyyy-MM-dd A HH:mm:ss", //ex: 2019-05-19 AM 10:56:27
  "Portugese (Brazil)": "dd/MM/yyyy HH:mm:ss", //ex: 19/05/2019 11:02:32
  Russian: "dd.MM.yyyy HH:mm:ss", //ex: 19.05.2019 11:05:15
  Spanish: "dd/MM/yyyy HH:mm:ss" //ex: 19/05/2019 11:06:37
};

// throws an error if it fails
function parseWotcTime(dateStr) {
  let date = parse(dateStr, dateLangs[logLanguage], new Date());

  // This is to detect language when the one read does not match or logLanguage is not yet set
  // Defaults to current time if none matches
  if (!date || isNaN(date.getTime())) {
    Object.keys(dateLangs).forEach(lang => {
      let test = parse(dateStr, dateLangs[lang], new Date());
      if (test && !isNaN(test.getTime())) {
        //logLanguage = lang;
        console.log(`Log datetime language detected: ${lang}`, dateStr, test);
        date = test;
      }
    });
  }

  if (!date || isNaN(date.getTime())) {
    // console.log(`Invalid date ('${dateStr}') - using current date as backup.`);
    date = new Date();
  }
  return date;
}

function normaliseFields(iterator) {
  if (typeof iterator == "object") {
    return _.transform(iterator, function(result, value, key) {
      let nkey =
        typeof key == "string" ? key.replace(/List$/, "").toLowerCase() : key;
      result[nkey] = normaliseFields(value);
    });
  }
  return iterator;
}

function unleakString(s) {
  return (" " + s).substr(1);
}

// Begin of IPC messages recievers
function ipc_send(method, arg, to = IPC_MAIN) {
  if (method == "ipc_log") {
    //
  }
  //console.log("IPC SEND", method, arg, to);
  ipc.send("ipc_switch", method, IPC_BACKGROUND, arg, to);
}

const dataBlacklist = ["changes", "drafts", "events", "matches"];

const overlayWhitelist = [
  "name",
  "userName",
  "arenaId",
  "arenaVersion",
  "patreon",
  "patreon_tier",
  "rank",
  "cards",
  "cardsNew",
  "settings"
];

// convenience fn to destructively update player data
// singletons in all processes
// (to incrementally add data, use pd_merge instead)
function pd_set(data) {
  const cleanData = _.omit(data, dataBlacklist);
  pd.handleSetData(null, cleanData);
  pd_sync(cleanData, "set_player_data");
}

// convenience fn to additively update player data
// singletons in all processes
// (to remove data, use ps_set instead)
function pd_merge(data) {
  const cleanData = _.omit(data, dataBlacklist);
  pd.handleMergeData(null, cleanData);
  pd_sync(cleanData, "merge_player_data");
}

function pd_sync(cleanData, signal) {
  ipc_send(signal, cleanData, IPC_MAIN);
  const overlayData = _.pick(cleanData, overlayWhitelist);
  ipc_send(signal, overlayData, IPC_OVERLAY);
}

module.exports = {
  ipc_send,
  normaliseFields,
  parseWotcTime,
  pd_merge,
  pd_set,
  unleakString
};
