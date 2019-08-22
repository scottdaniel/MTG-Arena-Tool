const { app } = require("electron");
const manifestParser = require("./manifest-parser");
const path = require("path");

// Set app name so we load the correct config file.
const appName = "MTG-Arena-Tool";
app.setName(appName);
const appData = app.getPath("appData");
app.setPath("userData", path.join(appData, appName));

app.on("ready", () => {
  console.log("Begin Database fetch script.");
  manifestParser.getManifestFiles("1622.721726").then(quit);
});

app.on("closed", function() {
  console.log("closed");
});

function quit() {
  app.quit();
}
