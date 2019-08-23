const { app, clipboard } = require("electron");
const path = require("path");
const fs = require("fs");
var http = require("https");

const manifestParser = require("./manifest-parser");
const generateMetadata = require("./metadata-generator").generate;

const { APPDATA, RANKS_SHEETS, SETS_DATA } = require("./metadata-constants");

let ranksData = {};
let metagameData = {};

let ScryfallDefaultCards = {};

app.on("ready", () => {
  console.log("Begin Metadata fetch.");
  // It would be nice if we could suppy the version manually or
  // obtain it from somewhere automatically, like a settings
  // file or the output log itself.
  //getScryfallCards().then(quit);

  manifestParser
    .getManifestFiles("1622.721726")
    .then(getRanksData)
    .then(getScryfallCards)
    .then(getMetagameData)
    .then(generateMetadata)
    .then(quit);
});

app.on("closed", function() {
  console.log("closed");
});

function quit() {
  app.quit();
}

function getRanksData() {
  return new Promise(resolve => {
    let requests = RANKS_SHEETS.map(rank => {
      return new Promise(resolve => {
        console.log(`Get ${rank.setCode.toUpperCase()} ranks data.`);
        httpGetFile(
          `https://docs.google.com/spreadsheets/d/${
            rank.sheet
          }/gviz/tq?headers=2&range=B1:B,F1:F,G1:G&sheet=${rank.page}`,
          rank.setCode + "_ranks"
        ).then(file => {
          let str = fs.readFileSync(file).toString();
          str = str
            .replace(
              `/*O_o*/
`,
              ""
            )
            .replace(`google.visualization.Query.setResponse(`, "")
            .replace(`);`, "");

          console.log(`${rank.setCode.toUpperCase()} ok.`);
          ranksData[rank.setCode] = JSON.parse(str);
          resolve();
        });
      });
    });

    return Promise.all(requests);
  });
}

function getMetagameData() {
  return new Promise(resolve => {
    resolve();
  });
}

function getScryfallCards() {
  return new Promise(resolve => {
    let file = path.join(APPDATA, "external", "scryfall-default-cards.json");
    if (!fs.existsSync(file)) {
      console.log("Downloading Scryfall cards data.");
      httpGetFile(
        "https://archive.scryfall.com/json/scryfall-default-cards.json",
        "scryfall-default-cards.json"
      ).then(file => {
        let outFile = path.join(APPDATA, "external", file);
        ScryfallDefaultCards = JSON.parse(fs.readFileSync(outFile));
        resolve();
      });
    } else {
      console.log("Skipping Scryfall cards data.");
      resolve();
    }
  });
}

function httpGetFile(url, file) {
  return new Promise(resolve => {
    file = path.join(APPDATA, "external", file);

    let dir = path.join(APPDATA, "external");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    let stream = fs.createWriteStream(file);
    http.get(url, response => {
      response.pipe(stream);
      response.on("end", function() {
        resolve(file);
      });
    });
  });
}
