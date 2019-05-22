const electron = require("electron");
const fs = require("fs");
const ipc = electron.ipcRenderer;

const otherKeys = [
  "sets",
  "events",
  "events_format",
  "ranked_events",
  "abilities",
  "ok"
];

let singleton = null;
// Some other things should go here later, like updating from MTGA Servers themselves.
class Database {
  constructor() {
    this.handleSetDb = this.handleSetDb.bind(this);
    if (ipc) ipc.on("set_db", this.handleSetDb);
    const dbUri = `${__dirname}/../resources/database.json`;
    const defaultDb = fs.readFileSync(dbUri, "utf8");
    this.handleSetDb(null, defaultDb);
  }

  static getDb() {
    if (!singleton) {
      singleton = new Database();
    }
    return singleton;
  }

  handleSetDb(_event, arg) {
    try {
      this.data = JSON.parse(arg);
    } catch (e) {
      console.log("Error parsing metadata", e);
    }
  }

  get cardIds() {
    return Object.keys(this.data).filter(key => !otherKeys.includes(key));
  }

  get cardList() {
    return this.cardIds.map(id => this.data[id]);
  }

  get cardMap() {
    const clone = { ...this.data };
    otherKeys.forEach(key => delete clone[key]);
    return clone;
  }

  setCard(grpId, obj) {
    this.data[grpId] = obj;
  }

  get(key) {
    return this.data[key] || false;
  }

  getByArt(artId) {
    const matches = this.cardList.filter(card => card.artid === artId);
    return matches.length ? matches[0] : false;
  }

  getAbility(abId) {
    return this.data["abilities"][abId] || "";
  }
}

module.exports = Database;
