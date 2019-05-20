/*
globals
  _,
  dateLangs
*/
// Utility functions that belong only to background

const parse = require("date-fns").parse;
let logLanguage = "English";

// throws an error if it fails
function parseWotcTime(dateStr) {
  let date = new Date(dateStr);

  // This is to detect language when the one read does not match or logLanguage is not yet set
  // Defaults to current time if none matches
  if (!date || isNaN(date.getTime())) {
    date = new Date();
    Object.keys(dateLangs).forEach(lang => {
      let test = parse(dateStr, dateLangs[lang], new Date());
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

module.exports = {
  parseWotcTime: parseWotcTime,
  normaliseFields: normaliseFields
};
