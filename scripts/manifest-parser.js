const electron = require("electron");
const path = require("path");
const fs = require("fs");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var http = require("https");
const gunzip = require("gunzip-file");

/**
 * This is meant to replace our current implementation of card data
 * to alleviate the dependency of manual updates from the server.
 * It downloads all cards data, including abilities and oracle.
 **/

const appData = (electron.app || electron.remote.app).getPath("userData");

function requestManifestData(version) {
  return new Promise(resolve => {
    version = version.replace(".", "_");
    let externalURL = `https://assets.mtgarena.wizards.com/External_${version}.mtga`;
    console.log("Manifest external URL:", externalURL);

    let req = httpGetText(externalURL);
    req.addEventListener("load", function() {
      let manifestId = req.responseText;
      console.log("Manifest ID:", manifestId);
      let manifestUrl = `https://assets.mtgarena.wizards.com/Manifest_${manifestId}.mtga`;

      let manifestFile = `Manifest_${manifestId}.mtga`;
      resolve({ url: manifestUrl, file: manifestFile });
    });
  });
}

function downloadManifest(manifestData) {
  return new Promise(resolve => {
    httpGetFile(manifestData.url, manifestData.file).then(file => {
      let outFile = path.join(appData, "external", "manifest.json");
      gunzip(file, outFile, () => {
        fs.unlink(file, () => {});
        let manifestData = JSON.parse(fs.readFileSync(outFile));
        resolve(manifestData);
      });
    });
  });
}

function getManifestFiles(version) {
  return requestManifestData(version)
    .then(manifestData => downloadManifest(manifestData))
    .then(data => processManifest(data));
}

function processManifest(data) {
  let requests = data.Assets.filter(asset => {
    return asset.AssetType == "Data";
  }).map(asset => {
    let assetUrl = `https://assets.mtgarena.wizards.com/${asset.Name}`;

    let regex = new RegExp("_(.*)_", "g");
    let assetName = regex.exec(asset.Name)[1];

    return new Promise(resolve => {
      let assetUri = path.join(appData, "external", assetName + ".json");

      let dir = path.join(appData, "external");
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      let stream = fs.createWriteStream(assetUri);
      http.get(assetUrl, response => {
        console.log("Downloaded " + assetUri);
        response.pipe(stream);

        resolve(assetName);
        /*
        // These used to be gzipped.. ¯\_(ツ)_/¯
        let outFile = assetUri + ".json";
        gunzip(assetName, outFile, () => {
          fs.unlink(assetName, () => {});
        });
        */
      });
    });
  });

  return Promise.all(requests);
}

function httpGetText(url) {
  let xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", url);
  xmlHttp.send();
  return xmlHttp;
}

function httpGetFile(url, file) {
  return new Promise(resolve => {
    file = path.join(appData, "external", file);

    let dir = path.join(appData, "external");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    let stream = fs.createWriteStream(file);
    http.get(url, response => {
      response.pipe(stream);
      resolve(file);
    });
  });
}

module.exports = {
  getManifestFiles: getManifestFiles
};
