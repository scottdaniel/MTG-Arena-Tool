/*
global
	async,
	qs,
	tokenAuth,
	playerId,
	decks,
	rememberMe,
	rstore,
	loadPlayerConfig,
	cardsDb,
	ipc_send,
	debugNet,
	playerUsername,
	store,
	makeId,
	debugLog
*/
const async = require("async");
const qs	= require('qs');
let metadataState = false;

var httpAsync = [];
httpBasic();
httpGetDatabase();
htttpGetStatus();

const serverAddress = 'mtgatool.com';

// 
function httpBasic() {
	var httpAsyncNew = httpAsync.slice(0);
	//var str = ""; httpAsync.forEach( function(h) {str += h.reqId+", "; }); console.log("httpAsync: ", str);
	async.forEachOfSeries(httpAsyncNew, function (value, index, callback) {
		var _headers = value;

		if (store.get("settings").send_data == false && _headers.method != 'auth' && _headers.method != 'delete_data' && _headers.method != 'get_database' && _headers.method != 'get_status' && debugLog == false) {
			callback({message: "Settings dont allow sending data! > "+_headers.method});
			removeFromHttp(_headers.reqId);
			return;
		}
		
		_headers.token = tokenAuth;

		var http = require('https');
		var options;
		if (_headers.method == 'get_database') {
			options = { protocol: 'https:', port: 443, hostname: serverAddress, path: '/database/database.json', method: 'GET'};
		}
		else if (_headers.method == 'get_ladder_decks') {
			options = { protocol: 'https:', port: 443, hostname: serverAddress, path: '/top_ladder.json', method: 'GET'};
		}
		else if (_headers.method == 'get_ladder_traditional_decks') {
			options = { protocol: 'https:', port: 443, hostname: serverAddress, path: '/top_ladder_traditional.json', method: 'GET'};
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
					var parsedResult = null;
					try {		
						parsedResult = JSON.parse(results);
					}
					catch (e) {
						//
					}

					if (_headers.method == 'get_status') {
						delete parsedResult.page; delete parsedResult.incidents;
						parsedResult.components.forEach(function(ob) {
							delete ob.id; delete ob.page_id; delete ob.group_id; delete ob.showcase; delete ob.description; delete ob.position; delete ob.created_at;
						});
						ipc_send("set_status", parsedResult);
					}
					if (_headers.method == 'get_ladder_decks') {
						ipc_send("set_ladder_decks", parsedResult);
					}
					if (_headers.method == 'get_ladder_traditional_decks') {
						ipc_send("set_ladder_traditional_decks", parsedResult);
					}
					if (parsedResult && parsedResult.ok) {
						if (_headers.method == 'auth') {
							tokenAuth = parsedResult.token;

							ipc_send("auth", parsedResult);
							ipc_send('set_discord_tag', parsedResult.discord_tag);
							//ipc_send("auth", parsedResult.arenaids);
							if (rememberMe) {
								rstore.set("token", tokenAuth);
								rstore.set("email", playerUsername);
							}

							loadPlayerConfig(playerId);

							window.setInterval(() => {
								httpHeartbeat();
							}, 5000);

						}
						if (_headers.method == 'heartbeat') {
							parsedResult.notifications.forEach((str) => {
								console.log("typeof:", typeof str);
								if (typeof str == "string") {
									console.log("Notification string:", str);
									let notif = new Notification('MTG Arena Tool', {
										body: str
									})									
								}
								else if (typeof str == "object") {
									console.log("Notification object:", str);
									if (str.task) {
										ipc_send(str.task, str.value);
									}
								}
							});
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
						if (_headers.method == 'home_get') {
							ipc_send("set_home", parsedResult);
						}
						if (_headers.method == 'tou_get') {
							ipc_send("tou_set", parsedResult.result);
						}
						if (_headers.method == 'tou_check') {
							//ipc_send("tou_set_game", parsedResult.result);
						}
						
						if (_headers.method == 'get_database') {
							//resetLogLoop(100);
							metadataState = true;
							delete parsedResult.ok;
							setsList = parsedResult.sets;
							eventsList = parsedResult.events;
							ranked_events = parsedResult.ranked_events;
							ipc_send("set_db", parsedResult);
							cardsDb.set(parsedResult);
							ipc_send("popup", {"text": "Metadata: Ok", "time": 1000});
						}
					}
					else if (_headers.method == 'tou_join' ) {
						ipc_send("popup", {"text": parsedResult.error, "time": 10000});
					}
					else if (_headers.method == 'tou_check') {
						let notif = new Notification('MTG Arena Tool', {
							body: parsedResult.state
						})
						//ipc_send("popup", {"text": parsedResult.state, "time": 10000});
					}
					else if (parsedResult && parsedResult.ok == false && parsedResult.error != undefined) {
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
					else if (!parsedResult && _headers.method == 'auth') {
						ipc_send("auth", {});
					}
				} catch (e) {
					console.error(e.message);
				}
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
			console.error(`problem with request: ${e.message}`);
			if (!metadataState) {
				ipc_send("popup", {"text": "Server unreachable, try offline mode.", "time": 0});
			}

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

function heartbeatClear() {
	httpAsync.forEach( function(h, i) {
		if (h.method == "heartbeat") {
			httpAsync.splice(i, 1);
		}
	});
}

function httpAuth(user, pass) {
	heartbeatClear();
	var _id = makeId(6);
	playerUsername = user;
	httpAsync.push({'reqId': _id, 'method': 'auth', 'method_path': '/login.php', 'email': user, 'password': pass, 'playerid': playerId, 'playername': playerName, 'mtgaversion': arenaVersion, 'version': window.electron.remote.app.getVersion()});
}

function httpSubmitCourse(course) {
	heartbeatClear();
	var _id = makeId(6);
	if (store.get("settings").anon_explore == true) {
		course.PlayerId = "000000000000000";
		course.PlayerName = "Anonymous";
	}
	course = JSON.stringify(course);
	httpAsync.push({'reqId': _id, 'method': 'submit_course', 'method_path': '/send_course.php', 'course': course});
}

function httpSetPlayer() {
	//heartbeatClear();
	// useless I think
	//var _id = makeId(6);
	//httpAsync.push({'reqId': _id, 'method': 'set_player', 'name': name, 'rank': rank, 'tier': tier});
}

function httpGetTopDecks(query, collection) {
	heartbeatClear();
	var _id = makeId(6);
	collection = JSON.stringify(collection);
	httpAsync.unshift({'reqId': _id, 'method': 'get_top_decks', 'method_path': '/get_courses_list_short.php', 'query': query, 'collection': collection});
}

function httpGetTopLadderDecks() {
	heartbeatClear();
	var _id = makeId(6);
	httpAsync.unshift({'reqId': _id, 'method': 'get_ladder_decks', 'method_path': '/top_ladder.json'});
}

function httpGetTopLadderTraditionalDecks() {
	heartbeatClear();
	var _id = makeId(6);
	httpAsync.push({'reqId': _id, 'method': 'get_ladder_traditional_decks', 'method_path': '/top_ladder_traditional.json'});
}
function httpGetCourse(courseId) {
	heartbeatClear();
	var _id = makeId(6);
	httpAsync.unshift({'reqId': _id, 'method': 'get_course', 'method_path': '/get_course.php', 'courseid': courseId});
}

function httpSetMatch(match) {
	heartbeatClear();
	var _id = makeId(6);
	match = JSON.stringify(match);
	httpAsync.push({'reqId': _id, 'method': 'set_match', 'method_path': '/send_match.php', 'match': match});
}

function httpSetDraft(draft) {
	heartbeatClear();
	var _id = makeId(6);
	draft = JSON.stringify(draft);
	httpAsync.push({'reqId': _id, 'method': 'set_draft', 'method_path': '/send_draft.php', 'draft': draft});
}

function httpSetEconomy(change) {
	heartbeatClear();
	var _id = makeId(6);
	change = JSON.stringify(change);
	httpAsync.push({'reqId': _id, 'method': 'set_economy', 'method_path': '/send_economy.php', 'change': change});
}

function httpSendError(error) {
	heartbeatClear();
	var _id = makeId(6);
	error = JSON.stringify(error);
	httpAsync.push({'reqId': _id, 'method': 'send_error', 'method_path': '/send_error.php', 'error': error});
}

function httpDeleteData() {
	heartbeatClear();
	var _id = makeId(6);
	httpAsync.push({'reqId': _id, 'method': 'delete_data', 'method_path': '/delete_data.php'});
}

function httpGetDatabase() {
	heartbeatClear();
	var _id = makeId(6);
	ipc_send("popup", {"text": "Downloading metadata", "time": 0});
	httpAsync.push({'reqId': _id, 'method': 'get_database'});
}

function htttpGetStatus() {
	heartbeatClear();
	var _id = makeId(6);
	httpAsync.push({'reqId': _id, 'method': 'get_status'});
}

function httpDraftShareLink(did, exp) {
	heartbeatClear();
	var _id = makeId(6);
	httpAsync.push({'reqId': _id, 'method': 'share_draft', 'method_path': '/get_share_draft.php', 'id': did, 'expire': exp});
}

function httpHomeGet() {
	heartbeatClear();
	var _id = makeId(6);
	httpAsync.unshift({'reqId': _id, 'method': 'home_get', 'method_path': '/get_home.php'});
}

function httpTournamentGet(tid) {
	heartbeatClear();
	var _id = makeId(6);
	httpAsync.unshift({'reqId': _id, 'method': 'tou_get', 'method_path': '/tournament_get.php', 'id': tid});
}

function httpTournamentJoin(tid, _deck) {
	heartbeatClear();
	let _id = makeId(6);
	let deck = JSON.stringify(decks[_deck]);
	httpAsync.unshift({'reqId': _id, 'method': 'tou_join', 'method_path': '/tournament_join.php', 'id': tid, 'deck': deck});
}

function httpTournamentDrop(tid) {
	heartbeatClear();
	var _id = makeId(6);
	httpAsync.unshift({'reqId': _id, 'method': 'tou_drop', 'method_path': '/tournament_drop.php', 'id': tid});
}

function httpTournamentCheck(deck, opp, setCheck) {
	heartbeatClear();
	var _id = makeId(6);
	deck = JSON.stringify(deck);
	httpAsync.unshift({'reqId': _id, 'method': 'tou_check', 'method_path': '/check_match.php', 'deck': deck, 'opp': opp, 'setcheck': setCheck});
}

function httpHeartbeat() {
	heartbeatClear();
	var _id = makeId(6);
	httpAsync.push({'reqId': _id, 'method': 'heartbeat', 'method_path': '/heartbeat.php'});
}

function httpSetMythicRank(opp, rank) {
	heartbeatClear();
	var _id = makeId(6);
	httpAsync.push({'reqId': _id, 'method': 'mythicrank', 'method_path': '/send_mythic_rank.php', 'opp': opp, 'rank': rank});
}

module.exports = {
	httpAuth,
	httpSubmitCourse,
	httpSetPlayer,
	httpGetTopDecks,
	httpGetTopLadderDecks,
	httpGetTopLadderTraditionalDecks,
	httpGetCourse,
	httpSetMatch,
	httpSetDraft,
	httpSetEconomy,
	httpSendError,
	httpDeleteData,
	httpGetDatabase,
	htttpGetStatus,
	httpHomeGet,
	httpDraftShareLink,
	httpTournamentGet,
	httpTournamentJoin,
	httpTournamentDrop,
	httpTournamentCheck,
	httpSetMythicRank
};