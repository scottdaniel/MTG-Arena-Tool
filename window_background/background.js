/*
global
	makeId,
	daysPast,
	cardsDb,
	stripTags,
	windowBackground,
	windowRenderer,
	windowOverlay
	onLabelOutLogInfo,
	onLabelGreToClient,
	onLabelClientToMatchServiceMessageTypeClientToGREMessage,
	onLabelInEventGetPlayerCourse,
	onLabelInEventGetCombinedRankInfo,
	onLabelInDeckGetDeckLists,
	onLabelInEventGetPlayerCourses,
	onLabelInDeckUpdateDeck,
	onLabelInventoryUpdated,
	onLabelInPlayerInventoryGetPlayerInventory,
	onLabelInPlayerInventoryGetPlayerCardsV3,
	onLabelInEventDeckSubmit,
	onLabelEventMatchCreated,
	onLabelOutDirectGameChallenge,
	onLabelInDraftDraftStatus,
	onLabelInDraftMakePick,
	onLabelOutDraftMakePick,
	onLabelInEventCompleteDraft,
	onLabelMatchGameRoomStateChangedEvent
*/
var electron = require('electron');

const {app, net, clipboard} = require('electron');
const path  = require('path');
const Store = require('../store.js');
const async = require("async");
const qs	= require('qs');


const rememberCfg = {
	email: '',
	token: ''
}

const settingsCfg = {
	gUri: ''
}

const defaultCfg = {
	windowBounds: { width: 800, height: 600, x: 0, y: 0 },
	overlayBounds: { width: 300, height: 600, x: 0, y: 0 },
	cards: { cards_time: 0, cards_before:[], cards:[] },
	settings: {
		overlay_sideboard: false,
		sound_priority: false,
		cards_quality: 'small',
		show_overlay: true,
		show_overlay_always: false,
		startup: true,
		close_to_tray: true,
		send_data: true,
		anon_explore: false,
		close_on_match: true,
		cards_size: 2,
		overlay_alpha: 1,
		overlay_alpha_back: 1,
		overlay_top: true,
		overlay_title: true,
		overlay_deck: true,
		overlay_clock: true,
		overlay_ontop: true,
		export_format: "$Name,$Count,$Rarity,$SetName,$Collector",
		back_color: "rgba(0,0,0,0.3)",
		back_url: ''
	},
	economy_index:[],
	economy:[],
	deck_changes:{},
	deck_changes_index:[],
	courses_index:[],
	matches_index:[],
	draft_index:[],
	gems_history:[],
	gold_history:[],
	decks_index: [],
	decks_tags: {},
	tags_colors: {},
	decks: {},
	wildcards_history:[]
}

var rstore = new Store({
	configName: "remember",
defaults: rememberCfg
});

var store = new Store({
	configName: 'default',
defaults: defaultCfg
});

var settingsStore = new Store({
	configName: 'settings',
	defaults: settingsCfg
});

const sha1 = require('js-sha1');

const serverAddress = 'mtgatool.com';

const debugLog = false;
const debugNet = true;
var debugLogSpeed = 0.1;
const fs = require("fs");
const ipc = electron.ipcRenderer;

const actionLogDir = path.join((electron.app || electron.remote.app).getPath('userData'), 'actionlogs');
if (!fs.existsSync(actionLogDir)){
	fs.mkdirSync(actionLogDir);
}

var firstPass = true;
var tokenAuth = undefined;

var renderer_state = 0;
var oppDeck = {mainDeck: [], sideboard: []};
var originalDeck = {};
var currentDeck = {};
var currentDeckUpdated = {};
var currentMatchId = null;
var currentMatchTime = 0;
var currentEventId = null;
var duringMatch = false;
var matchBeginTime = 0;

var arenaVersion = '';
var playerUsername = '';
var playerName = null;
var playerConstructedRank = null;
var playerConstructedTier = null;
var playerLimitedRank = null;
var playerLimitedTier = null;
var playerId = null;
var playerSeat = null;
var playerWin = 0;

var oppName = null;
var oppRank = null;
var oppTier = null;
var oppId = null;
var oppSeat = null;
var oppWin = 0;

var prevTurn = -1;
var turnPhase = "";
var turnStep  = "";
var turnNumber = 0;
var turnActive = 0;
var turnPriority = 0;
var turnDecision = 0;
var playerLife = 20;
var opponentLife = 20;

var zones = {};
var gameObjs = {};
var history = {};
var drafts = {};
var events = {};
var economy = {};
var decks = {};
var staticDecks = [];
//var coursesToSubmit = {};

var gold = 0;
var gems = 0;
var vault = 0;
var wcTrack = 0;
var wcCommon = 0;
var wcUncommon = 0;
var wcRare = 0;
var wcMythic = 0;

var currentDraft = undefined;
var currentDraftPack = undefined;
var draftSet = "";
var draftId = undefined;
var overlayDeckMode = 0;
var lastDeckUpdate = new Date();

var deck_changes_index = [];
var deck_changes = {};
var decks_tags = {};
var tags_colors = {};

// Begin of IPC messages recievers
function ipc_send(method, arg, to = windowRenderer) {
	if (method == "ipc_log") {
		//
	}
	//console.log("IPC SEND", method, arg, to);
	ipc.send('ipc_switch', method, windowBackground, arg, to);
}


var rememberMe = false;

//
ipc.on('remember', function (event, arg) {
	rememberMe = arg;
	if (!arg) {
		rstore.set("email", "");
		rstore.set("token", "");
	}
});

function loadSettings() {
	var settings = store.get("settings");
	updateSettings(settings, true);
}

ipc.on('reload_overlay', function () {
	loadSettings();
	var obj = store.get('overlayBounds');
	ipc_send("overlay_set_bounds", obj);
});

//
ipc.on('set_renderer_state', function (event, arg) {
	ipc_send("ipc_log", "Renderer state: "+arg);
	renderer_state = arg;
	loadSettings();

	if (rstore.get("token") !== "" && rstore.get("email") !== "") {
		rememberMe = true;
		tokenAuth = rstore.get("token");
		ipc_send("set_remember", rstore.get("email"));
	}	
});

//
ipc.on('login', function (event, arg) {
	if (arg.password == "********") {
		tokenAuth = rstore.get("token");
		playerUsername = arg.username;
		httpAuth(arg.username, arg.password);
	}
	else if (arg.username == '' && arg.password == '') {
		ipc_send("auth", {ok: true, user:-1});
		loadPlayerConfig(playerId);
		playerUsername = '';
	}
	else {
		playerUsername = arg.username;
		tokenAuth = '';
		httpAuth(arg.username, arg.password);
	}
});

//
ipc.on('request_draft_link', function (event, obj) {
	httpDraftShareLink(obj.id, obj.expire);
});

//
ipc.on('windowBounds', function (event, obj) {
	store.set('windowBounds', obj);
});

//
ipc.on('overlayBounds', function (event, obj) {
	store.set('overlayBounds', obj);
});

//
ipc.on('save_settings', function (event, settings) {
	store.set('settings', settings);
	updateSettings(settings, false);
});

//
ipc.on('delete_data', function () {
	httpDeleteData();
});

//
ipc.on('delete_course', function (event, arg) {
	var i = events.courses.indexOf(arg);
	if (i > -1) {
		events.courses.splice(i, 1);
		store.set('courses_index', events.courses);
		store.delete(arg);
	}
	//console.log("Delete ", arg);
});

//
ipc.on('delete_deck', function (event, arg) {
	var i = decks.index.indexOf(arg);
	if (i > -1) {
		decks.index.splice(i, 1);
		delete decks[arg];
		store.set('decks_index', decks.index);
		store.delete('decks.'+arg);
	}
	// If we do it imediately it looks awful
	setTimeout(() => {
		ipc_send("set_decks", JSON.stringify(decks));
	}, 200);
});

//
ipc.on('delete_match', function (event, arg) {
	var i = history.matches.indexOf(arg);
	if (i > -1) {
		history.matches.splice(i, 1);
		store.set('matches_index', history.matches);
		store.delete(arg);
	}
	i = drafts.matches.indexOf(arg);
	if (i > -1) {
		drafts.matches.splice(i, 1);
		store.set('draft_index', drafts.matches);
		store.delete(arg);
	}
	//console.log("Delete ", arg);
});

//
ipc.on('request_events', function () {
	ipc_send("set_events", JSON.stringify(events));
});

//
ipc.on('request_history', function (event, state) {
	requestHistorySend(state);
});

window.onerror = (msg, url, line, col, err) => {
	var error = {
		msg: err.msg,
		stack: err.stack,
		line: line,
		col: col
	}
	error.id = sha1(error.msg + playerId);
	httpSendError(error);
}

process.on('uncaughtException', function(err){
	var error = {
		msg: err,
		stack: "uncaughtException",
		line: 0,
		col: 0
	}
	console.log("ERROR: ", error);
	error.id = sha1(error.msg + playerId);
	httpSendError(error);
})

//
ipc.on('error', function (event, err) {
	err.id = sha1(err.msg + playerId);
	httpSendError(err);
});

//
function requestHistorySend(state) {
	if (history.matches != undefined) {
		calculateRankWins(history);
	}
	if (state == 1) {
		// Send the data and open history tab
		ipc_send("background_set_history", JSON.stringify(history));
	}
	else {
		/// Send only the data
		ipc_send("background_set_history_data", JSON.stringify(history));
	}
}

// Calculates winrates for history tabs (set to last 10 dys as default)
function calculateRankWins() {
	var rankwinrates = {beginner: {w:0, l:0, t:0, r:"Beginner"}, bronze: {w:0, l:0, t:0, r:"Bronze"}, silver: {w:0, l:0, t:0, r:"Silver"}, gold: {w:0, l:0, t:0, r:"Gold"}, diamond: {w:0, l:0, t:0, r:"Diamond"}, master: {w:0, l:0, t:0, r:"Master"}};
	for (var i = 0; i < history.matches.length; i++) {
		let match_id = history.matches[i];
		let match = history[match_id];

		if (match == undefined) continue;
		if (match.type != "match") continue;
		if (match.opponent == undefined) continue;

		if (daysPast(match.date) > 10) continue;

		let struct = undefined;
		switch (match.opponent.rank) {
			case "Beginner":
				struct = rankwinrates.beginner;	break;
			case "Bronze":
				struct = rankwinrates.bronze;	break;
			case "Silver":
				struct = rankwinrates.silver;	break;
			case "Gold":
				struct = rankwinrates.gold;		break;
			case "Diamond":
				struct = rankwinrates.diamond;	break;
			case "Master":
				struct = rankwinrates.master;	break;
			default:
				struct = undefined;	break;
		}

		if (struct != undefined) {
			struct.t += 1;
			if (match.opponent.win > match.player.win)
				struct.l += 1;
			else 
				struct.w += 1;
		}
	}

	history.rankwinrates = rankwinrates;
}

ipc.on('request_explore', function (event, arg) {
	if (playerUsername == '') {
		ipc_send("offline", 1);
	}
	else {
		if (arg == "all" || arg == "All" ) {
			httpGetTopDecks("");
		}
		else {
			//arg = arg.replace("_m_", "_m19_");// dirty hack :(
			httpGetTopDecks(arg);
		}
	}
});

ipc.on('request_economy', function () { 
	var ec = economy;
	ec.gold = gold;
	ec.gems = gems;
	ec.vault = vault;
	ec.wcTrack = wcTrack;
	ec.wcCommon = wcCommon;
	ec.wcUncommon = wcUncommon;
	ec.wcRare = wcRare;
	ec.wcMythic = wcMythic;
	ipc_send("set_economy", JSON.stringify(ec));
});

ipc.on('request_course', function (event, arg) {
	httpGetCourse(arg);
});

ipc.on('request_tou_list', function () {
    httpTournamentList();
});

ipc.on('tou_get', function (event, arg) {
    httpTournamentGet(arg);
});

ipc.on('tou_join', function (event, arg) {
    httpTournamentJoin(arg.id, arg.deck);
});

ipc.on('tou_drop', function (event, arg) {
    httpTournamentDrop(arg);
});

ipc.on('edit_tag', function (event, arg) {
	Object.keys(tags_colors).forEach(function(key) {
		if (key == arg.tag) {
			tags_colors[key] = arg.color;
		}
	});

	store.set("tags_colors", tags_colors);
});


ipc.on('delete_tag', function (event, arg) {
	if (decks_tags[arg.deck]) {
		decks_tags[arg.deck].forEach((tag, index) => {
			if (tag == arg.name) {
				decks_tags[arg.deck].splice(index, 1);
			}
		});
	}
	store.set("decks_tags", decks_tags);
});

ipc.on('add_tag', function (event, arg) {
	if (decks_tags[arg.deck]) {
		decks_tags[arg.deck].push(arg.name);
	}
	else {
		decks_tags[arg.deck] = [arg.name];
	}
	store.set("decks_tags", decks_tags);
});

ipc.on('set_deck_mode', function (event, state) {
	overlayDeckMode = state;
	update_deck(true);
});

ipc.on('get_deck_changes', function (event, arg) {
	get_deck_changes(arg);
});

/*
function rememberLogin(bool) {
	if (bool) {
		rstore.set("email", playerUsername);
		rstore.set("token", tokenAuth);
	}
	else {
		rstore.set("email", "");
		rstore.set("token", "");
	}
}
*/

// Loads this player's configuration file
function loadPlayerConfig(playerId) {
	ipc_send("ipc_log", "Load player ID: "+playerId);
	store = new Store({
		configName: playerId,
		defaults: defaultCfg
	});

	// Preload config, if we use store.get turned out to be SLOOOW
	var entireConfig = store.get();
	var id, item;
	history.matches = entireConfig['matches_index'];
	
	for (let i=0; i<history.matches.length; i++) {
		ipc_send("popup", {"text": "Reading history: "+i+" / "+history.matches.length, "time": 0});
		id = history.matches[i];
		if (id != null) {
			item = entireConfig[id];
			if (item != undefined) {
				history[id] = item;
				history[id].type = "match";
			}
		}
	}
	
	drafts.matches = store.get('draft_index');
	for (let i=0; i<drafts.matches.length; i++) {
		ipc_send("popup", {"text": "Reading drafts: "+i+" / "+drafts.matches.length, "time": 0});
		id = drafts.matches[i];

		if (id != null) {
			item = entireConfig[id];
			if (item != undefined) {
				if (history.matches.indexOf(id) == -1) {
					history.matches.push(id);
				}
				history[id] = item;
				history[id].type = "draft";
			}
		}
	}

	events.courses = store.get('courses_index');
	for (let i=0; i<events.courses.length; i++) {
		ipc_send("popup", {"text": "Reading events: "+i+" / "+events.courses.length, "time": 0});
		id = events.courses[i];

		if (id != null) {
			item = entireConfig[id];
			if (item != undefined) {
				events[id] = item;
				events[id].type = "Event";
			}
		}
	}

	economy.changes = store.get('economy_index');
	for (let i=0; i<economy.changes.length; i++) {
		ipc_send("popup", {"text": "Reading economy: "+i+" / "+economy.changes.length, "time": 0});
		id = economy.changes[i];

		if (id != null) {
			item = entireConfig[id];
			if (item != undefined) {
				economy[id] = item;
			}
		}
	}

	decks.index = store.get('decks_index');
	for (let i=0; i<decks.index.length; i++) {
		ipc_send("popup", {"text": "Reading decks: "+i+" / "+decks.index.length, "time": 0});
		id = decks.index[i];

		if (id != null) {
			let deck = entireConfig.decks[id];
			let tags = entireConfig.decks_tags[id];
			if (deck != undefined) {
				deck.tags = tags;
				decks[id] = deck;
			}
		}
	}

	// Remove duplicates, sorry :(
	let length = history.matches.length;
    history.matches = history.matches.sort().filter(function(item, pos, ary) {
        return !pos || item != ary[pos - 1];
    });
    if (length !== history.matches.length) {
		store.set('matches_index', history.matches);
    }

	deck_changes_index = entireConfig["deck_changes_index"];
	deck_changes = entireConfig["deck_changes"];
	decks_tags = entireConfig["decks_tags"];
	tags_colors = entireConfig["tags_colors"];

	var obj = store.get('overlayBounds');

	ipc_send("set_tags_colors", tags_colors);
	ipc_send("overlay_set_bounds", obj);

	loadSettings();
	requestHistorySend(0);

	watchingLog = true;
	stopWatchingLog = startWatchingLog();
}


// Updates the settings variables , sends to overlay if 'relay' is set
function updateSettings(_settings, relay) {
	//console.log(_settings);
	//const exeName = path.basename(process.execPath);

	if (_settings.overlay_top   == undefined) _settings.overlay_top   = true;
	if (_settings.overlay_title == undefined) _settings.overlay_title = true;
	if (_settings.overlay_deck  == undefined) _settings.overlay_deck  = true;
	if (_settings.overlay_clock == undefined) _settings.overlay_clock = true;
	if (_settings.overlay_ontop == undefined) _settings.overlay_ontop = true;

	ipc_send("overlay_set_ontop", _settings.overlay_ontop);

	if (_settings.export_format == undefined) {
		_settings.export_format = "$Name,$Count,$Rarity,$SetName,$Collector";
	}

	if (_settings.show_overlay == false) {
		ipc_send("overlay_close", 1);
	}
	else if (duringMatch || _settings.show_overlay_always) {
		ipc_send("overlay_show", 1);
	}
	
	if (relay) {
		ipc_send("set_settings", _settings);
	}
}

//
function get_deck_changes(deckId) {
	// sends to renderer the selected deck's data
	var changes = [];
	deck_changes_index.forEach(function(changeId) {
		var change = deck_changes[changeId];
		if (change.deckId == deckId) {
			changes.push(change);
		}
	});
	
	ipc_send("set_deck_changes", JSON.stringify(changes));
}

// Set a new log URI
ipc.on('set_log', function (event, arg) {
    if (watchingLog) {
		stopWatchingLog();
		stopWatchingLog = startWatchingLog();
    }
	logUri = arg;
	settingsStore.set('logUri', arg);
});


// Read the log
// Set variables to default first
const mtgaLog = require('./mtga-log');
let prevLogSize = 0;
let watchingLog = false;
let stopWatchingLog;

let logUri = mtgaLog.defaultLogUri();
let settingsLogUri = settingsStore.get('logUri');
if (settingsLogUri) {
	logUri = settingsLogUri;
}
console.log(logUri);
const ArenaLogWatcher = require('./arena-log-watcher');

function startWatchingLog() {
    return ArenaLogWatcher.start({
        path: logUri,
        chunkSize: 268435440,
        onLogEntry: onLogEntryFound,
        onError: err => console.error(err),
        onFinish: finishLoading
    });
}

function onLogEntryFound(entry) {
	let json;
	if (entry.type == "connection") {
		playerId = entry.socket.PlayerId;
		arenaVersion = entry.socket.ClientVersion;
		playerName = entry.socket.PlayerScreenName;
		ipc_send("set_username", playerName);
	}
	else {
		console.log("Entry:", entry.label, entry, entry.json());
		if (firstPass) {
			updateLoading(entry);
		}
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
				onLabelClientToMatchServiceMessageTypeClientToGREMessage(entry, json);
			break;

			case "Event.GetPlayerCourse":
				if (entry.arrow == "<==") {
					json = entry.json();
					onLabelInEventGetPlayerCourse(entry, json);
				}
			break;

			case "Event.GetCombinedRankInfo":
				if (entry.arrow == "<==") {
					json = entry.json();
					onLabelInEventGetCombinedRankInfo(entry, json);
				}
			break;

			case "Event.GetPlayerCourses":
				if (entry.arrow == "<==") {
					json = entry.json();
					onLabelInEventGetPlayerCourses(entry, json);
				}
			break;
			
			case "Deck.GetDeckLists":
				if (entry.arrow == "<==") {
					json = entry.json();
					onLabelInDeckGetDeckLists(entry, json);
				}
			break;

			case "Deck.UpdateDeck":
				if (entry.arrow == "<==") {
					json = entry.json();
					onLabelInDeckUpdateDeck(entry, json);
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

			case "Event.MatchCreated":
				json = entry.json();
				onLabelEventMatchCreated(entry, json);
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
				}
				else {
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

			case "MatchGameRoomStateChangedEvent":
				json = entry.json();
				onLabelMatchGameRoomStateChangedEvent(entry, json);
			break;

			default:
			break;
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
	if (! await mtgaLog.exists(logUri)) {
		ipc_send("no_log", logUri);
		ipc_send("popup", {"text": "No log file found.", "time": 1000});
		return;
	}

	if (!firstPass)  {
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

	const logSegment = delta > 0
		? await mtgaLog.readSegment(logUri, prevLogSize, delta)
		: await mtgaLog.readSegment(logUri, 0, size);

	// We are looping only to get user data (processLogUser)
	processLogUser(logSegment);

	if (playerId) {
		clearInterval(logLoopInterval);
	}
	prevLogSize = size;
}


// Process only the user data for initial loading (prior to log in)
// Same logic as processLog() but without the processLogData() function
function processLogUser(rawString) {
	var splitString = rawString.split('[UnityCrossThread');

	splitString.forEach(value => {
		//ipc_send("ipc_log", "Async: ("+index+")");

		// Get player Id
		let strCheck = '"PlayerId":"';
		if (value.indexOf(strCheck) > -1) {
			playerId = dataChop(value, strCheck, '"');
		}

		// Get User name
		strCheck = '"PlayerScreenName":"';
		if (value.indexOf(strCheck) > -1) {
			playerName = dataChop(value, strCheck, '"');
			ipc_send("init_login", playerName);
			ipc_send("ipc_log", 'Arena screen name: '+playerName);
		}

		// Get Client Version
		strCheck = '"ClientVersion":"';
		if (value.indexOf(strCheck) > -1) {
			arenaVersion = dataChop(value, strCheck, '"');
			ipc_send("ipc_log", 'Arena version: '+arenaVersion);
		}
		/*
		if (firstPass) {
			ipc_send("popup", {"text": "Reading: "+Math.round(100/splitString.length*index)+"%", "time": 1000});
		}
		*/
	});

	if (firstPass && playerName == null) {
		ipc_send("popup", {"text": "output_log contains no player data", "time": 0});
	}
}

// Cuts the string "data" between first ocurrences of the two selected words "startStr" and "endStr";
function dataChop(data, startStr, endStr) {
	var start = data.indexOf(startStr)+startStr.length;
	var end = data.length;
	data = data.substring(start, end);

	if (endStr != '') {
		start = 0;
		end = data.indexOf(endStr);
		data = data.substring(start, end);
	}

	return data;
}

function setDraftCards(json) {
	ipc.send("set_draft_cards", json.draftPack, json.pickedCards, json.packNumber+1, json.pickNumber);
}

function actionLogGenerateLink(grpId) {
	var card = cardsDb.get(grpId);
	return '<a class="card_link click-on" href="'+grpId+'">'+card.name+'</a>';
}

var currentActionLog = "";

// Send action log data to overlay
function actionLog(seat, time, str, grpId = 0) {
	if (seat == -99) {
		currentActionLog = "";
	}
	else {
		var hh = ("0"+time.getHours()).slice(-2);
		var mm = ("0"+time.getMinutes()).slice(-2);
		var ss = ("0"+time.getSeconds()).slice(-2);
		currentActionLog += hh+':'+mm+':'+ss+' '+stripTags(str)+'\r\n';

		try { fs.writeFileSync(path.join(actionLogDir, currentMatchId+'.txt'), currentActionLog, 'utf-8'); }
		catch(e) {
			//
		}
	}

	//console.log("action_log", str, {seat: seat, time:time, grpId: grpId});
	ipc_send("action_log", {seat: seat, time:time, str: str, grpId: grpId}, windowOverlay);

}

var attackersDetected = [];
var zoneTransfers = [];


// Process zone transfers
// Sometimes GreToClient sends data about transfers when they havent been reported elsewhere
// Here we check if the object ID the transfer refers to exists in the main objects array and process it if it does
function tryZoneTransfers() {
	zoneTransfers.forEach(function(obj) {
		var _dest, _cat = undefined;
		var cname = "";
		var grpid = 0;
		var removeFromListAnyway = false;
		var removeFromList = true;

		var owner = -1;
		try {
			owner = gameObjs[obj.affectorId].controllerSeatId;
		} catch (e) {
			try {
				owner = gameObjs[obj.aff].controllerSeatId;
			} catch (e) {
				owner = oppSeat;
			}
		}

		obj.details.forEach(function(detail) {
			if (detail.key == "zone_src") {
				_src = detail.valueInt32[0];
			}
			if (detail.key == "zone_dest") {
				_dest = detail.valueInt32[0];
			}
			if (detail.key == "category") {
				_cat = detail.valueString[0];
			}
		});

		// If the transfer is already in the gameObjs array..
		try {
			cname = gameObjs[obj.aff].name;
			grpid = gameObjs[obj.aff].grpId;
		} catch (e) {
			removeFromList = false;
		}

		// Try processing it
		try {
			var affectorGrpid;
			//console.log("AnnotationType_ZoneTransfer", obj, obj.aff, gameObjs, _src, _dest, _cat);
			if (_cat == "CastSpell") {
				actionLog(owner, obj.time, getNameBySeat(owner)+" casted "+actionLogGenerateLink(grpid));
			}
			else if (_cat == "Resolve") {
				actionLog(owner, obj.time, getNameBySeat(owner)+" resolved "+actionLogGenerateLink(grpid));
			}
			else if (_cat == "PlayLand") {
				actionLog(owner, obj.time, getNameBySeat(owner)+" played "+actionLogGenerateLink(grpid));
			}
			else if (_cat == "Countered") {
				affectorGrpid = gameObjs[obj.affectorId].grpId;
				if (affectorGrpid == undefined) {
					removeFromList = false;
				}
				else {
					actionLog(owner, obj.time, actionLogGenerateLink(affectorGrpid)+" countered "+actionLogGenerateLink(grpid));
				}
			}
			else if (_cat == "Destroy") {
				affectorGrpid = gameObjs[obj.affectorId].grpId;
				if (affectorGrpid == undefined) {
					removeFromList = false;
				}
				else {
					actionLog(owner, obj.time, actionLogGenerateLink(affectorGrpid)+" destroyed "+actionLogGenerateLink(grpid));
				}
			}
			else if (_cat == "Draw") {
				actionLog(owner, obj.time, getNameBySeat(owner)+" drew a card");
				removeFromListAnyway = true;
			}
			else if (cname != "") {
				actionLog(owner, obj.time, actionLogGenerateLink(grpid)+" moved to "+zones[_dest].type);
			}
			gameObjs[obj.aff].zoneId = _dest;
			gameObjs[obj.aff].zoneName = zones[_dest].type;
		}
		catch (e) {
			removeFromList = false;
		}

		if (removeFromList || removeFromListAnyway) {
			obj.remove = true;
		}
	})
	if (zoneTransfers.length > 0) {
		zoneTransfers = zoneTransfers.filter(obj => obj.remove == false);
	}
}

// Get player name by seat in the game
function getNameBySeat(seat) {
	try {
		if (seat == playerSeat) {
			return playerName.slice(0, -6);
		}
		else {
			return oppName.slice(0, -6);
		}
	}
	catch (e) {
		return "???";
	}
}

//
function updateCustomDecks() {
	decks.index.forEach((_deckid) => {
		let _deck = decks[_deckid];
		try {
			//console.log(_deck.id, _deck);
			decks[_deck.id].custom = false;
			if (staticDecks.indexOf(_deck.id) == -1) {
				//console.error("CUSTOM!");
				decks[_deck.id].custom = true;
			}				
		}
		catch (e) {
			//
		}
	});
}

//
function createMatch(arg) {
	actionLog(-99, new Date(), "");
	var obj = store.get('overlayBounds');

	zones = {};
	gameObjs = {};
	attackersDetected = [];
	zoneTransfers = [];
	
	oppDeck = {mainDeck: [], sideboard: []};

	if (!firstPass && store.get("settings").show_overlay == true) {
		if (store.get("settings").close_on_match) {
			ipc_send("renderer_hide", 1);
		}
		ipc_send("overlay_show", 1);
		ipc_send("overlay_set_bounds", obj);
	}
	playerLife = 20;
	opponentLife = 20;
	oppName = arg.opponentScreenName;
	oppRank = arg.opponentRankingClass;
	oppTier = arg.opponentRankingTier;
	currentEventId = arg.eventId;
	currentMatchId = null;
	currentMatchTime = 0;
	playerWin = 0;
	oppWin = 0;

	ipc_send("ipc_log", "vs "+oppName);
	ipc_send("set_timer", matchBeginTime, windowOverlay);
	ipc_send("set_opponent", oppName, windowOverlay);
	ipc_send("set_opponent_rank", get_rank_index(oppRank, oppTier), oppRank+" "+oppTier, windowOverlay);
}

//
function createDraft() {
	actionLog(-99, new Date(), "");
	var obj = store.get('overlayBounds');

	zones = {};
	gameObjs = {};

	if (!firstPass && store.get("settings").show_overlay == true) {
		if (store.get("settings").close_on_match) {
			ipc_send("renderer_hide", 1);
		}

		ipc_send("overlay_show", 1);
		ipc_send("overlay_set_bounds", obj);
	}

	currentDraft = {};

	oppName = "";
	oppRank = "";
	oppTier = -1;
	currentMatchId = null;
	playerWin = 0;
	oppWin = 0;

	ipc_send("set_draft", true, windowOverlay);
	ipc_send("set_timer", -1, windowOverlay);
	ipc_send("set_opponent", oppName, windowOverlay);
	ipc_send("set_opponent_rank", get_rank_index(oppRank, oppTier), oppRank+" "+oppTier, windowOverlay);
}

//
function select_deck(arg) {
	if (arg.CourseDeck !== undefined) {
		currentDeck = arg.CourseDeck;
	}
	else {
		currentDeck = arg;
	}
	originalDeck = currentDeck;
	var str = JSON.stringify(currentDeck);
	currentDeckUpdated = JSON.parse(str);
	//console.log(currentDeck, arg);
	ipc_send("set_deck", currentDeck, windowOverlay);
}

//
function clear_deck() {
	var deck = {mainDeck: [], sideboard : [], name: ""};
	ipc_send("set_deck", deck, windowOverlay);
}

//
function update_deck(force) {
	var nd = new Date()
	if (nd - lastDeckUpdate > 1000 || debugLog || !firstPass || force) {
		if (overlayDeckMode == 0) {
			ipc_send("set_deck", currentDeckUpdated, windowOverlay);
		}
		if (overlayDeckMode == 1) {
			ipc_send("set_deck", originalDeck, windowOverlay);
		}
		if (overlayDeckMode == 2) {
			ipc_send("set_deck", currentDeckUpdated, windowOverlay);
		}
		if (overlayDeckMode == 3) {
			var currentOppDeck = getOppDeck();
			ipc_send("set_deck", currentOppDeck, windowOverlay);
		}
		if (overlayDeckMode == 4) {
			ipc_send("set_deck", currentDeckUpdated, windowOverlay);
		}
		lastDeckUpdate = nd;
	}
}

//
function forceDeckUpdate() {
	var decksize = 0;
	var cardsleft = 0;
	var typeCre = 0;
	var typeIns = 0;
	var typeSor = 0;
	var typePla = 0;
	var typeArt = 0;
	var typeEnc = 0;
	var typeLan = 0;
	if ((debugLog || !firstPass) && currentDeckUpdated.mainDeck != undefined) {
		/*
		// DEBUG
		currentDeckUpdated.mainDeck = [];
		decksize = 0;
		cardsleft = 0;
		*/
		currentDeckUpdated.mainDeck.forEach(function(card) {
			card.total = card.quantity;
			decksize += card.quantity;
			cardsleft += card.quantity;
		});
	}
	Object.keys(gameObjs).forEach(function(key) {
		if (gameObjs[key] != undefined) {
			if (zones[gameObjs[key].zoneId]) {
				if (zones[gameObjs[key].zoneId].type != "ZoneType_Limbo" && zones[gameObjs[key].zoneId].type != "ZoneType_Library") {
					if (gameObjs[key].ownerSeatId == playerSeat && gameObjs[key].type != "GameObjectType_Token" && gameObjs[key].type != "GameObjectType_Ability") {
						/*
						// DEBUG
						if (gameObjs[key].grpId != 3) {
							decksize += 1;
							cardsleft += 1;
							currentDeckUpdated.mainDeck.push({id: gameObjs[key].grpId, quantity: gameObjs[key].zoneId})
						}
						*/
						
						cardsleft -= 1;
						if (currentDeckUpdated.mainDeck != undefined) {
							currentDeckUpdated.mainDeck.forEach(function(card) {
								if (card.id == gameObjs[key].grpId) {
									//console.log(gameObjs[key].instanceId, cardsDb.get(gameObjs[key].grpId).name, zones[gameObjs[key].zoneId].type);
									card.quantity -= 1;
								}
							});
						}
					}
				}
			}
		}
	});

	if ((debugLog || !firstPass) && currentDeckUpdated.mainDeck != undefined) {
		currentDeckUpdated.mainDeck.forEach(function(card) {
			var c = cardsDb.get(card.id);
			if (c) {
				if (c.type.includes("Land", 0))				 typeLan += card.quantity;
				else if (c.type.includes("Creature", 0))		typeCre += card.quantity;
				else if (c.type.includes("Artifact", 0))		typeArt += card.quantity;
				else if (c.type.includes("Enchantment", 0))	 typeEnc += card.quantity;
				else if (c.type.includes("Instant", 0))		 typeIns += card.quantity;
				else if (c.type.includes("Sorcery", 0))		 typeSor += card.quantity;
				else if (c.type.includes("Planeswalker", 0))	typePla += card.quantity;
			}
			card.chance = Math.round(hypergeometric(1, cardsleft, 1, card.quantity)*100);
		});

		currentDeckUpdated.chanceCre = Math.round(hypergeometric(1, cardsleft, 1, typeCre) * 1000)/10;
		currentDeckUpdated.chanceIns = Math.round(hypergeometric(1, cardsleft, 1, typeIns) * 1000)/10;
		currentDeckUpdated.chanceSor = Math.round(hypergeometric(1, cardsleft, 1, typeSor) * 1000)/10;
		currentDeckUpdated.chancePla = Math.round(hypergeometric(1, cardsleft, 1, typePla) * 1000)/10;
		currentDeckUpdated.chanceArt = Math.round(hypergeometric(1, cardsleft, 1, typeArt) * 1000)/10;
		currentDeckUpdated.chanceEnc = Math.round(hypergeometric(1, cardsleft, 1, typeEnc) * 1000)/10;
		currentDeckUpdated.chanceLan = Math.round(hypergeometric(1, cardsleft, 1, typeLan) * 1000)/10;
		currentDeckUpdated.deckSize  = decksize;
		currentDeckUpdated.cardsLeft = cardsleft;
	}
}

//
function getOppDeck() {
	//var oppDeck = {mainDeck: [], sideboard : []};
	var doAdd = true;
	oppDeck.name = oppName;
	console.log("Deck "+oppName);
	Object.keys(gameObjs).forEach(function(key) {
		if (gameObjs[key] != undefined) {
			if (zones[gameObjs[key].zoneId].type != "ZoneType_Limbo") {
				//console.log(cardsDb.get(gameObjs[key].grpId), cardsDb.get(gameObjs[key].grpId).name, zones[gameObjs[key].zoneId].type, gameObjs[key]);
				if (gameObjs[key].ownerSeatId == oppSeat && gameObjs[key].type != "GameObjectType_SplitLeft" && gameObjs[key].type != "GameObjectType_SplitRight" && gameObjs[key].type != "GameObjectType_Token" && gameObjs[key].type != "GameObjectType_Ability") {
					
					doAdd = true;
					oppDeck.mainDeck.forEach(function(card) {
						if (card.id == gameObjs[key].grpId) {
							doAdd = false;
							//card.quantity += 1;
						}
					});
					if (doAdd) {
						if (cardsDb.get(gameObjs[key].grpId) != false) {
							oppDeck.mainDeck.push( {id: gameObjs[key].grpId, quantity: 9999} );
						}
					}
				}
			}
		}
	}); 
	
	return oppDeck;
}

//
function saveEconomy(json) {
	var ctx = json.context;
	json.id = sha1(json.date.getTime()+ctx);
	
	if (ctx.indexOf("Quest.Completed") !== -1) {
		json.context = "Quest Completed";
	}
	if (ctx.indexOf("Booster.Open") !== -1) {
		json.context = "Booster Open";
	}
	if (ctx.indexOf("PlayerReward") !== -1) {
		json.context = "Player Rewards";
	}
	if (ctx.indexOf("WildCard.Redeem") !== -1) {
		json.context = "Redeem Wildcard";
	}
	if (ctx.indexOf("Store.Fulfillment") !== -1) {
		json.context = "Store";
	}
	if (ctx.indexOf("Event.Prize") !== -1) {
		json.context = "Event Prize";
	}
	if (ctx.indexOf("Event.PayEntry") !== -1) {
		json.context = "Pay Event Entry";
	}
	if (ctx.indexOf("Event.GrantCardPool") !== -1) {
		json.context = "Event Card Pool";
	}

	var economy_index = store.get('economy_index');

	if (!economy_index.includes(json.id)) {
		economy_index.push(json.id);
	}

	httpSetEconomy(json);
	
	economy[json.id] = json;
	economy.changes = economy_index;
	store.set('economy_index', economy_index);
	store.set(json.id, json);
}

//
function saveCourse(json) {
	json.id = json._id;
	json.date = new Date();
	delete json._id;
	
	var courses_index = store.get('courses_index');

	if (!courses_index.includes(json.id)) {
		courses_index.push(json.id);
	}
	else {
		json.date = store.get(json.id).date;
	}

	// add locally
	if (!events.courses.includes(json.id)) {
		events.courses.push(json.id);
	}

	json.type = "Event";
	events[json.id] = json;
	store.set('courses_index', courses_index);
	store.set(json.id, json);
}

//
function saveMatch() {
	if (currentMatchTime == 0) {
		return;
	}
	var match = {};
	match.id = currentMatchId;
	match.duration = currentMatchTime;
	match.opponent = {
		name: oppName,
		rank: oppRank,
		tier: oppTier,
		userid: oppId,
		seat: oppSeat,
		win: oppWin
	}
	match.player = {
		name: playerName,
		rank: playerConstructedRank,
		tier: playerConstructedTier,
		userid: playerId,
		seat: playerSeat, 
		win: playerWin
	}

	match.eventId = currentEventId;
	match.playerDeck = originalDeck;
	match.oppDeck = getOppDeck();
	match.date = new Date();

	console.log("Save match:", match);
	var matches_index = store.get('matches_index');

	if (!matches_index.includes(currentMatchId)) {
		matches_index.push(currentMatchId);
	}
	else {
		match.date = store.get(currentMatchId).date;
	}

	// add locally
	if (!history.matches.includes(currentMatchId)) {
		history.matches.push(currentMatchId);
	}

	store.set('matches_index', matches_index);
	store.set(currentMatchId, match);

	history[currentMatchId] = match;
	history[currentMatchId].type = "match";
	httpSetMatch(match);
	requestHistorySend(0);
	ipc_send("set_timer", 0, windowOverlay);
	ipc_send("popup", {"text": "Match saved!", "time": 3000});
}

//
function saveDraft() {
	if (draftId != undefined) {
		var draft = currentDraft;
		draft.id = draftId;
		draft.date = new Date();
		draft.set = draftSet; 
		draft.owner = playerName; 

		console.log("Save draft:", draft);

		var draft_index = store.get('draft_index');
		// add to config
		if (!draft_index.includes(draftId)) {
			draft_index.push(draftId);
		}
		else {
			draft.date = store.get(draftId).date;
		}

		// add locally
		if (!history.matches.includes(draftId)) {
			history.matches.push(draftId);
		}

		store.set('draft_index', draft_index);
		store.set(draftId, draft);
		history[draftId] = draft;
		history[draftId].type = "draft";
		httpSetDraft(draft);
		requestHistorySend(0);
		ipc_send("popup", {"text": "Draft saved!", "time": 3000});		
	}
	else {
		console.log("Couldnt save draft with undefined ID:", draft);
	}
}

//
function updateLoading(entry) {
	if (firstPass) {
		ipc_send("popup", {"text": `Reading log: ${Math.round(100/entry.size*entry.position)}%`, "time": 0});
	}
}

///
function finishLoading() {
	if (firstPass) {
		firstPass = false;

		if (duringMatch) {
			ipc_send("renderer_hide", 1);
			ipc_send("overlay_show", 1);
			update_deck(false);
		}
		var obj = store.get('overlayBounds');
		ipc_send("overlay_set_bounds", obj);

		requestHistorySend(0);
		ipc_send("initialize", 1);

		obj = store.get('windowBounds');
		ipc_send("renderer_set_bounds", obj);

		if (playerName != null) {
			httpSetPlayer(playerName, playerConstructedRank, playerConstructedTier, playerLimitedRank, playerLimitedTier);
		}
		ipc_send("popup", {"text": `Reading log: 100%`, "time": 1000});
	}
}

// HTTP stuff starts here
var httpAsync = [];
httpBasic();
httpGetDatabase();
htttpGetStatus();

// 
function httpBasic() {
    var httpAsyncNew = httpAsync.slice(0);
    //var str = ""; httpAsync.forEach( function(h) {str += h.reqId+", "; }); console.log("httpAsync: ", str);
    async.forEachOfSeries(httpAsyncNew, function (value, index, callback) {
        var _headers = value;

        if (store.get("settings").send_data == false && _headers.method != 'auth' && _headers.method != 'delete_data' && _headers.method != 'get_database' && _headers.method != 'get_status' && debugLog == false) {
            callback({message: "Settings dont allow sending data! > "+_headers.method});
            removeFromHttp(_headers.reqId);
        }
        
        _headers.token = tokenAuth;

        var http = require('https');
        var options;
        if (_headers.method == 'get_database') {
            options = { protocol: 'https:', port: 443, hostname: serverAddress, path: '/database/database.json', method: 'GET'};
        }
        else if (_headers.method == 'get_status') {
            http = require('https');
            options = { protocol: 'https:', port: 443, hostname: 'magicthegatheringarena.statuspage.io', path: '/index.json', method: 'GET'};
        }
        else if (_headers.method_path !== undefined) {
            options = { protocol: 'https:', port: 443, hostname: serverAddress, path: _headers.method_path, method: 'POST'};
        }
        else {
            options = { protocol: 'https:', port: 443, hostname: serverAddress, path: '/api.php', method: 'POST'};
        }

        if (debugNet) {
            console.log("SEND >> "+index+", "+_headers.method, _headers, options);
            ipc_send("ipc_log", "SEND >> "+index+", "+_headers.method+", "+_headers.reqId+", "+_headers.token);
        }

        console.log("POST", _headers);
        var post_data = qs.stringify(_headers);
        options.headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': post_data.length};

        var results = ''; 
        var req = http.request(options, function(res) {
            res.on('data', function (chunk) {
                results = results + chunk;
            }); 
            res.on('end', function () {
                if (debugNet) {
					ipc_send("ipc_log", "RECV << "+index+", "+_headers.method+", "+_headers.reqId+", "+_headers.token);
                    ipc_send("ipc_log", "RECV << "+index+", "+_headers.method+", "+results.slice(0, 100));
                    console.log("RECV << "+index, _headers.method, results.slice(0, 500));
                }
                try {
                    var parsedResult = JSON.parse(results);
                    if (_headers.method == 'get_status') {
                        delete parsedResult.page; delete parsedResult.incidents;
                        parsedResult.components.forEach(function(ob) {
                            delete ob.id; delete ob.page_id; delete ob.group_id; delete ob.showcase; delete ob.description; delete ob.position; delete ob.created_at;
                        });
                        ipc_send("set_status", parsedResult);
                    }
                    if (parsedResult.ok) {
                        if (_headers.method == 'auth') {
                            tokenAuth = parsedResult.token;

                            //ipc_send("auth", parsedResult.arenaids);

                            if (rememberMe) {
                                rstore.set("token", tokenAuth);
                                rstore.set("email", playerUsername);
                            }

                            ipc_send("auth", parsedResult);
                            loadPlayerConfig(playerId);
                        }
                        if (_headers.method == 'tou_join' || _headers.method == 'tou_drop') {
                        	httpTournamentGet(parsedResult.id);
                        }
                        if (_headers.method == 'get_top_decks') {
                            ipc_send("set_explore", parsedResult.result);
                        }
                        if (_headers.method == 'get_course') {
                            ipc_send("open_course_deck", parsedResult.result);
                        }
                        if (_headers.method == 'share_draft') {
                            ipc_send("set_draft_link", parsedResult.url);
                        }
                        if (_headers.method == 'tou_list') {
                            ipc_send("set_tou_list", parsedResult.result);
                        }
                        if (_headers.method == 'tou_get') {
                            ipc_send("tou_set", parsedResult.result);
                        }
                        
                        if (_headers.method == 'get_database') {
                            //resetLogLoop(100);
                            delete parsedResult.ok;
                            setsList = parsedResult.sets;
                            eventsList = parsedResult.events;
                            ipc_send("set_db", parsedResult);
                            cardsDb.set(parsedResult);
                            ipc_send("popup", {"text": "Metadata: Ok", "time": 1000});
                        }
                    }
                    else if (parsedResult.ok == false && parsedResult.error != undefined) {
                        if (_headers.method == 'share_draft') {
                            ipc_send("popup", {"text": parsedResult.error, "time": 3000});
                        }
                        if (_headers.method == 'auth') {
                            if (parsedResult.error == "Invalid credentials.") {
                                tokenAuth = undefined;
                                rstore.set("email", "");
                                rstore.set("token", "");
                                ipc_send("clear_pwd", 1);
                                ipc_send("set_remember", false);
                            }
                        }
                        // errors here 
                    }
                    if (_headers.method == 'auth') {
                        ipc_send("auth", parsedResult);
                    }
                } catch (e) {
                    console.error(e.message);
                }
                /*
                if (_headers.token != "") {
                }
                */
                try {
                    callback();
                }
                catch (e) {
                	//
                }
                

                removeFromHttp(_headers.reqId);
                if (debugNet) {
                    var str = ""; httpAsync.forEach( function(h) { str += h.reqId+", "; });
                    ipc_send("ipc_log", "httpAsync: "+str);
                }
            }); 
        });
        req.on('error', function(e) {
            callback(e);
            removeFromHttp(_headers.reqId);
            ipc_send("ipc_log", e.message);
        });
        req.write(post_data);
        console.log(req);
        req.end();

    }, function (err) {
        if (err) {
            ipc_send("ipc_log", "httpBasic() Error: "+err.message);
        }
        // do it again
        setTimeout( function() {
            httpBasic();
        }, 250);
    });
}

function removeFromHttp(req) {
	httpAsync.forEach( function(h, i) {
		if (h.reqId == req) {
			httpAsync.splice(i, 1);
		}
	});
}

function httpAuth(user, pass) {
	var _id = makeId(6);
	playerUsername = user;
	httpAsync.push({'reqId': _id, 'method': 'auth', 'method_path': '/login.php', 'email': user, 'password': pass, 'playerid': playerId, 'playername': playerName, 'mtgaversion': arenaVersion, 'version': window.electron.remote.app.getVersion()});
}

function httpSubmitCourse(course) {
	var _id = makeId(6);
	if (store.get("settings").anon_explore == true) {
		course.PlayerId = "000000000000000";
		course.PlayerName = "Anonymous";
	}
	course = JSON.stringify(course);
	httpAsync.push({'reqId': _id, 'method': 'submit_course', 'method_path': '/send_course.php', 'course': course});
}

function httpSetPlayer() {
	// useless I think
	//var _id = makeId(6);
	//httpAsync.push({'reqId': _id, 'method': 'set_player', 'name': name, 'rank': rank, 'tier': tier});
}

function httpGetTopDecks(query) {
	var _id = makeId(6);
	httpAsync.push({'reqId': _id, 'method': 'get_top_decks', 'method_path': '/get_courses_list.php', 'query': query});
}

function httpGetCourse(courseId) {
	var _id = makeId(6);
	httpAsync.push({'reqId': _id, 'method': 'get_course', 'method_path': '/get_course.php', 'courseid': courseId});
}

function httpSetMatch(match) {
	var _id = makeId(6);
	match = JSON.stringify(match);
	httpAsync.push({'reqId': _id, 'method': 'set_match', 'method_path': '/send_match.php', 'match': match});
}

function httpSetDraft(draft) {
	var _id = makeId(6);
	draft = JSON.stringify(draft);
	httpAsync.push({'reqId': _id, 'method': 'set_draft', 'method_path': '/send_draft.php', 'draft': draft});
}

function httpSetEconomy(change) {
	var _id = makeId(6);
	change = JSON.stringify(change);
	httpAsync.push({'reqId': _id, 'method': 'set_economy', 'method_path': '/send_economy.php', 'change': change});
}

function httpSendError(error) {
	var _id = makeId(6);
	error = JSON.stringify(error);
	httpAsync.push({'reqId': _id, 'method': 'send_error', 'method_path': '/send_error.php', 'error': error});
}

function httpDeleteData() {
	var _id = makeId(6);
	httpAsync.push({'reqId': _id, 'method': 'delete_data', 'method_path': '/delete_data.php'});
}

function httpGetDatabase() {
	var _id = makeId(6);
	ipc_send("popup", {"text": "Downloading metadata", "time": 0});
	httpAsync.push({'reqId': _id, 'method': 'get_database'});
}

function htttpGetStatus() {
	var _id = makeId(6);
	httpAsync.push({'reqId': _id, 'method': 'get_status'});
}

function httpDraftShareLink(did, exp) {
	var _id = makeId(6);
	httpAsync.push({'reqId': _id, 'method': 'share_draft', 'method_path': '/get_share_draft.php', 'id': did, 'expire': exp});
}

function httpTournamentList() {
    var _id = makeId(6);
    httpAsync.push({'reqId': _id, 'method': 'tou_list', 'method_path': '/tournament_list.php'});
}

function httpTournamentGet(tid) {
    var _id = makeId(6);
    httpAsync.push({'reqId': _id, 'method': 'tou_get', 'method_path': '/tournament_get.php', 'id': tid});
}

function httpTournamentJoin(tid, _deck) {
    let _id = makeId(6);
    let deck = JSON.stringify(decks[_deck]);
    httpAsync.push({'reqId': _id, 'method': 'tou_join', 'method_path': '/tournament_join.php', 'id': tid, 'deck': deck});
}

function httpTournamentDrop(tid) {
    var _id = makeId(6);
    httpAsync.push({'reqId': _id, 'method': 'tou_drop', 'method_path': '/tournament_drop.php', 'id': tid});
}

// Utility functions that belong only to background

//
function parseWotcTime(str) {
	try {
		let datePart = str.split(" ")[0];
		let timePart = str.split(" ")[1];
		let midnight = str.split(" ")[2];

		datePart = datePart.split("/");
		timePart = timePart.split(":");

		timePart.forEach(function(s, index) {timePart[index] = parseInt(s)});
		datePart.forEach(function(s, index) {datePart[index] = parseInt(s)});

		if (midnight == "PM" && timePart[0] != 12) {
			timePart[0] += 12;
		}
		if (midnight == "AM" && timePart[0] == 12) {
			timePart[0] = 0;
		}

		var date = new Date(datePart[2], datePart[0]-1, datePart[1], timePart[0], timePart[1], timePart[2]);
		return date;
	}
	catch (e) {
		return new Date();
	}

}

//
function fact(arg0) {
	let _f = 1;
	let _i = 1;
	for (_i=1; _i<=arg0; _i++) {
		_f = _f * _i;
	}

	return _f;
}

//
function comb(arg0, arg1) {
	let ret = fact(arg0) / fact(arg0-arg1) / fact(arg1);
	
	return ret;
}

//
function hypergeometric(arg0, arg1, arg2, arg3) {
	if (arg0 > arg3) {
		return 0;
	}

	let _x, _N, _n, _k;

	_x = arg0;// Number of successes in sample (x) <= 
	_N = arg1;// Population size
	_n = arg2;// Sample size
	_k = arg3;// Number of successes in population  

	let _a = comb(_k, _x)
	let _b = comb(_N-_k, _n-_x);
	let _c = comb(_N, _n);

	return _a * _b / _c;
}
