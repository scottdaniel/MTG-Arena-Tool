/*
globals
  _,
  logLanguage
*/
// Utility functions that belong only to background

const parse = require("date-fns").parse;

//
function parseWotcTime(str) {
  return parseWotcTime2(str);
}

// These were tested briefly , but hey are all taken from actual logs
// At most some format from date-fns could be wrong;
// https://date-fns.org/v2.0.0-alpha.7/docs/parse
let dateLangs = {
  English: "M/d/YYYY h:MM:SS A", // ex: 5/19/2019 11:08:01 AM
  German: "DD.MM.YYYY HH:MM:SS", // ex: 19.05.2019 09:59:00
  French: "DD/MM/YYYY HH:MM:SS", //ex: 19/05/2019 10:39:42
  Italian: "DD/MM/YYYY HH:MM:SS", //ex: 19/05/2019 10:43:03
  Japanese: "YYYY/MM/DD HH:MM:SS", //ex: 2019/05/19 10:45:04
  Korean: "YYYY-MM-DD A HH:MM:SS", //ex: 2019-05-19 AM 10:56:27
  "Portugese (Brazil)": "DD/MM/YYYY HH:MM:SS", //ex: 19/05/2019 11:02:32
  Russian: "DD.MM.YYYY HH:MM:SS", //ex: 19.05.2019 11:05:15
  Spanish: "DD/MM/YYYY HH:MM:SS" //ex:19/05/2019 11:06:37
};

// throws an error if it fails
function parseWotcTime2(dateStr) {
  let date = parse(dateStr, dateLangs[logLanguage], new Date());

  // This is to detect language when the one read does not match or logLanguage is not yet set
  // Defaults to current time if none matches
  if (!date || isNaN(date.getTime())) {
    date = new Date();
    Object.keys(dateLangs).forEach(lang => {
      let test = parse(dateStr, dateLangs[logLanguage], new Date());
      if (test && !isNaN(test.getTime())) {
        logLanguage = lang;
        console.log(`Log datetime language detected: ${lang}`);
        date = test;
      }
    });
  }

  if (!date || isNaN(date.getTime())) {
    console.log(`Invalid date ('${dateStr}') - using current date as backup.`);
  }
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

module.exports = {
  parseWotcTime: parseWotcTime,
  parseWotcTime2: parseWotcTime2,
  normaliseFields: normaliseFields
};
