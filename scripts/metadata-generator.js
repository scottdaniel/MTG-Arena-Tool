const path = require("path");
const fs = require("fs");
const { APPDATA } = require("./metadata-constants");

function generate() {
  return new Promise(resolve => {
    console.log("Reading JSON files");
    let cards = readExternalJson("cards.json");
    let abilities = readExternalJson("abilities.json");
    let loc = readExternalJson("loc.json");
    let enums = readExternalJson("enums.json");

    resolve();
  });
}

function readExternalJson(filename) {
  let file = path.join(APPDATA, "external", filename);
  return JSON.parse(fs.readFileSync(file));
}

module.exports = {
  generate: generate
};
