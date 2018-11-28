/*
global
	setsList,
	cardsDb,
	makeId,
	ConicGradient,
	daysPast,
	timeSince,
	toMMSS,
	toHHMM,
	selectAdd,
	addCardHover,
	get_set_scryfall,
	get_colation_set,
	getEventId,
	addCardSeparator,
	addCardTile,
	getReadableEvent,
	get_collection_export,
	get_collection_stats,
	get_deck_colors,
	get_deck_types_ammount,
	get_deck_curve,
	get_deck_colors_ammount,
	get_deck_lands_ammount,
	get_deck_missing,
	get_deck_export,
	get_deck_export_txt,
	get_rank_index_16,
	get_rank_index,
	draftRanks
	get_card_type_sort,
	collectionSortSet,
	collectionSortName,
	collectionSortCmc,
	collectionSortRarity,
	compare_colors,
	compare_cards,
	timestamp
*/

const electron = require('electron');
const remote = require('electron').remote;

let shell = electron.shell;
let ipc = electron.ipcRenderer;
let decks = null;
let changes = null;
let matchesHistory = [];
let economyHistory = [];
let eventsHistory = [];
let tournaments = [];

let explore = null;
let cards = {};
let cardsNew = {};
let settings = null;
let updateState =  {state: -1, available: false, progress: 0, speed: 0};
let sidebarActive = 0//-99;
let collectionPage = 0;
let eventFilters = null;
let sortingAlgorithm = 'Set';
let filterEvent = 'All';
let filterEconomy = 'All';
let filteredSets = [];
let filteredMana = [];
let draftPosition = 1;
let overlayAlpha = 1;
let overlayAlphaBack = 1;
let cardSizePos = 4;
let cardSize = 140;
let cardQuality = "normal";
let loadHistory = 0;
let loadEvents = 0;
let defaultBackground = "";
let currentOpenDeck = null;
let lastSettingsSection = 1;
let loggedIn = false;
let canLogin = false;
let offlineMode = false;

let rankOffset = 0;
let rankTitle = "";
let userName = ""

//const chartjs = require('chart.js');
const sha1 	= require('js-sha1');
const fs 	= require("fs");
const path  = require('path');

const actionLogDir = path.join((electron.app || electron.remote.app).getPath('userData'), 'actionlogs');

let mana = {0: "", 1: "white", 2: "blue", 3: "black", 4: "red", 5: "green", 6: "colorless", 7: "", 8: "x"}

function ipc_send(method, arg) {
    ipc.send('ipc_switch', method, arg);
}


//document.addEventListener('DOMContentLoaded', windowReady);

//function windowReady(){
//	ipc_send('renderer_state', 1);
//}

window.onerror = (msg, url, line, col, err) => {
	var error = {
		msg: err.msg,
		stack: err.stack,
		line: line,
		col: col
	}
    ipc_send("ipc_error", error);
	console.log("Error: ", error);
}

process.on('uncaughtException', function(err){
    ipc_send("ipc_log", "Exception: "+err);
})

process.on('warning', (warning) => {
	ipc_send("ipc_log", "Warning: "+warning.message);
	ipc_send("ipc_log", "> "+warning.stack);
});

//
ipc.on('clear_pwd', function () {
	document.getElementById("signin_pass").value = "";
});

//
ipc.on('auth', function (event, arg) {
	if (arg.ok) {
		$('.message_center').css('display', 'flex');
		$('.authenticate').hide();
		loggedIn = true;
	}
	else {
		pop(arg.error, -1);
	}
});

//
ipc.on('too_slow', function () {
	pop('Loading is taking too long, please read our <a class="trouble_link">troubleshooting guide</a>.', 0);

	$('.popup').css("left", "calc(50% - 280px)");
	$('.popup').css("width", "560px");
	$('.popup').css("pointer-events", "all");

	$(".trouble_link").click(function() {
		shell.openExternal('https://github.com/Manuel-777/MTG-Arena-Tool/blob/master/TROUBLESHOOTING.md');
	});
});

//
ipc.on('set_db', function (event, arg) {
	setsList = arg.sets;
	eventsList = arg.events;
	delete arg.sets;
	delete arg.events;
	canLogin = true;
	cardsDb.set(arg);

	$(".button_simple_disabled").addClass("button_simple");
});

//
ipc.on('set_username', function (event, arg) {
	userName = arg;
	if (sidebarActive != -99) {
		$('.top_username').html(userName.slice(0, -6));
		$('.top_username_id').html(userName.slice(-6));
	}
});

//
ipc.on('set_rank', function (event, offset, rank) {
	rankOffset = offset;
	rankTitle = rank;
	if (sidebarActive != -99) {
		$(".top_rank").css("background-position", (rankOffset*-48)+"px 0px").attr("title", rankTitle);
	}
});

//
ipc.on('set_decks', function (event, arg) {
    try {
        arg = JSON.parse(arg)
    } catch(e) {
        console.log("Error parsing JSON:", arg);
        return false;
    }
	setDecks(arg);
});

// 
// Whats this?
ipc.on('set_deck_updated', function (event, str) {
    try {
        deck = JSON.parse(str);
    } catch(e) {
        console.log("Error parsing JSON:", str);
        return false;
    }
	
});

//
ipc.on('set_history', function (event, arg) {
	if (arg != null) {
		try {
			matchesHistory = JSON.parse(arg);
		} catch(e) {
			console.log("Error parsing JSON:", arg);
		return false;
		}
	}
	
	setHistory(0);
});

//
ipc.on('set_history_data', function (event, arg) {
	if (arg != null) {
		matchesHistory = JSON.parse(arg);
	}
});

//
ipc.on('set_events', function (event, arg) {
	if (arg != null) {
		try {
			eventsHistory = JSON.parse(arg);
		} catch(e) {
			console.log("Error parsing JSON:", arg);
			return false;
		}
	}

	setEvents(0);
});


ipc.on('set_economy', function (event, arg) {
	if (arg != null) {
		try {
			economyHistory = JSON.parse(arg);
		} catch(e) {
			console.log("Error parsing JSON:", arg);
			return false;
		}
	}

	setEconomy(0);
});

//
ipc.on('set_deck_changes', function (event, arg) {
	if (arg != null) {
		try {
			changes = JSON.parse(arg);
			console.log(changes);
		} catch(e) {
			console.log("Error parsing JSON:", arg);
			return false;
		}
	}

	if (changes != null) {
		setChangesTimeline();
	}
});

//
ipc.on('set_cards', function (event, _cards, _cardsnew) {
	cards = _cards;
	cardsNew = _cardsnew;
});

//
ipc.on('set_status', function (event, arg) {
	var mainStatus = 0;
	var sp = $('<span>'+arg.status.description+'</span>');
	sp.css('text-align', 'center');
	sp.css('margin-bottom', '4px');
	$('.top_status_pop').append(sp);
	arg.components.forEach(function(comp) {
		var div = $('<div class="status_item"></div>');
		var st = $('<div class="top_status"></div>');
		div.append('<span>'+comp.name+':</span>');
		var sp = $('<span></span>');
		if (comp.status == 'operational') {
			st.addClass('status_green');
			sp.html('Operational');
		}
		else if (comp.status == 'degraded_performance') {
			st.addClass('status_yellow');
			if (mainStatus > 1) mainStatus = 1;
			sp.html('Degraded performance');
		}
		else if (comp.status == 'major_outage') {
			st.addClass('status_red');
			if (mainStatus > 2) mainStatus = 2;
			sp.html('Major outage');
		}
		else if (comp.status == 'partial_outage') {
			st.addClass('status_yellow');
			if (mainStatus > 1) mainStatus = 1;
			sp.html('Partial outage');
		}
		else if (comp.status == 'under_maintenance') {
			st.addClass('status_yellow');
			if (mainStatus > 1) mainStatus = 1;
			sp.html('Under maintenance');
		}
		else {
			st.addClass('status_yellow');
			if (mainStatus > 1) mainStatus = 1;
			sp.html(comp.status);
		}
		sp.css('margin-left', 'auto');
		sp.appendTo(div);
		st.appendTo(div);
		div.appendTo($('.top_status_pop'));
	});

	if (mainStatus == 0) {
		$('.top_status').addClass('status_green');
	}
	if (mainStatus == 1) {
		$('.top_status').addClass('status_yellow');
	}
	if (mainStatus == 2) {
		$('.top_status').addClass('status_red');
	}

	$('.top_status').on('mouseenter', function() {
		$('.top_status_pop').css("opacity", 1);
	});
	$('.top_status').on('mouseleave', function() {
		$('.top_status_pop').css("opacity", 0);
	});
});

//
ipc.on('set_tou_list', function (event, arg) {
	if (arg != null) {
		tournaments = arg;
	}
	if (sidebarActive == -1) {
		setTourneys();
	}
});

//
ipc.on('set_explore', function (event, arg) {
	if (sidebarActive == 3) {
		arg.sort(compare_explore);
		setExplore(arg, 0);
	}
});

//
ipc.on('open_course_deck', function (event, arg) {
	$('.moving_ux').animate({'left': '-100%'}, 250, 'easeInOutCubic');
	arg = arg.CourseDeck;
	arg.colors = get_deck_colors(arg);
	arg.mainDeck.sort(compare_cards);
	arg.sideboard.sort(compare_cards);
	console.log(arg);
	open_deck(arg, 1);
});

//
ipc.on('set_settings', function (event, arg) {
	console.log(arg);
	settings = arg;
	cardSizePos = settings.cards_size;
	overlayAlpha = settings.overlay_alpha;
	overlayAlphaBack = settings.overlay_alpha_back;
    if (settings.cards_quality != undefined) {
        cardQuality = settings.cards_quality;
    }
    if (settings.back_color == undefined) {
        settings.back_color = 'rgba(0,0,0,0.3)';
    }
    if (settings.back_url == undefined) {
        settings.back_url = "";
    }
    else {
        defaultBackground = settings.back_url;
    }
    $('.main_wrapper').css('background-color', settings.back_color);
    change_background("default");
	cardSize = 100+(cardSizePos*10);
});

//
ipc.on('set_update', function (event, arg) {
	updateState = arg;

	if (sidebarActive == 9) {
		open_settings(5);
	}
});

//
ipc.on('show_notification', function (event, arg) {
    $('.notification').show();
    $('.notification').attr("title", arg);

    if (arg == "Update available" || arg == "Update downloaded") {
		$('.notification').click(function() {
			force_open_about();
		});
	}
});

//
ipc.on('hide_notification', function () {
    $('.notification').hide();
    $('.notification').attr("title", "");
});

//
ipc.on('force_open_settings', function () {
	force_open_settings();
});

//
ipc.on('force_open_about', function () {
	force_open_about();
});

//
ipc.on('init_login', function () {
	$('.authenticate').show();
	$('.message_center').css('display', 'none');
	$('.init_loading').hide();
});

//
ipc.on('set_remember', function (event, arg) {
	if (arg != "") {
        document.getElementById("rememberme").checked = true;
		document.getElementById("signin_user").value = arg;
		document.getElementById("signin_pass").value = "********";
	}
	else {
        document.getElementById("rememberme").checked = false;
	}
});

//
/* eslint-disable */
function rememberMe() {
	ipc_send("remember", document.getElementById("rememberme").checked);
}
/* eslint-enable */

//
ipc.on('initialize', function () {
	$('.top_username').html(userName.slice(0, -6));
	$('.top_username_id').html(userName.slice(-6));

	$(".top_rank").css("background-position", (rankOffset*-48)+"px 0px").attr("title", rankTitle);
	sidebarActive = 0;//-1;
	ipc_send('request_tou_list', true);
	$('.top_nav').removeClass('hidden');
	$('.overflow_ux').removeClass('hidden');
	$('.message_center').css('display', 'none');
	$('.init_loading').hide();
});

//
var logDialogOpen = false;
ipc.on('no_log', function (event, arg) {
	if (loggedIn) {
		$('.top_nav').addClass('hidden');
		$('.overflow_ux').addClass('hidden');
		$('.message_center').css('display', 'flex');
		$('.message_center').html('<div class="message_big red">No Log Found</div><div class="message_sub_16 white">check if it exists at '+arg+'</div><div class="message_sub_16 white">if it does, try closing MTG Arena and deleting it.</div>');
	}
	else if (!logDialogOpen) {
		logDialogOpen = true;
		$('.dialog_wrapper').css('opacity', 1);
		$('.dialog_wrapper').css('pointer-events', 'all');
		$('.dialog_wrapper').show();
		$('.dialog').css('width', '600px');
		$('.dialog').css('height', '200px');
		$('.dialog').css('top', 'calc(50% - 100px)');

		$('.dialog_wrapper').on('click', function() {
			console.log('.dialog_wrapper on click')
			//e.stopPropagation();
			$('.dialog_wrapper').css('opacity', 0);
			$('.dialog_wrapper').css('pointer-events', 'none');
			setTimeout(function() {
				logDialogOpen = false;
				$('.dialog_wrapper').hide();
				$('.dialog').css('width', '500px');
				$('.dialog').css('height', '160px');
				$('.dialog').css('top', 'calc(50% - 80px)');
			}, 250);
		});

		$('.dialog').on('click', function(e) {
			e.stopPropagation();
			console.log('.dialog on click')
		});

		var dialog = $('.dialog');
		dialog.html('');
		
		var cont = $('<div class="dialog_container"></div>');

		cont.append('<div class="share_title">Enter output_log.txt location:</div>');
		var icd = $('<div class="share_input_container"></div>');
		var sin = $('<input style="border-radius: 3px; height: 28px;font-size: 14px;" id="log_input" autofocus autocomplete="off" value="'+arg+'" />');
		var but = $('<div class="button_simple">Save</div>');
		
		sin.appendTo(icd);
		icd.appendTo(cont);
		
		cont.appendTo(dialog);
		but.appendTo(dialog);

		but.click(function () {
			ipc_send('set_log', document.getElementById("log_input").value);
			console.log('.dialog_wrapper on click')
			//e.stopPropagation();
			$('.dialog_wrapper').css('opacity', 0);
			$('.dialog_wrapper').css('pointer-events', 'none');
			setTimeout(function() {
				logDialogOpen = false;
				$('.dialog_wrapper').hide();
				$('.dialog').css('width', '500px');
				$('.dialog').css('height', '160px');
				$('.dialog').css('top', 'calc(50% - 80px)');
			}, 250);
		});
	}
});


ipc.on('log_ok', function () {
	logDialogOpen = false;
	$('.dialog_wrapper').css('opacity', 0);
	$('.dialog_wrapper').css('pointer-events', 'none');
	setTimeout(function() {
		$('.dialog_wrapper').hide();
		$('.dialog').css('width', '500px');
		$('.dialog').css('height', '160px');
		$('.dialog').css('top', 'calc(50% - 80px)');
	}, 250);
});

//
ipc.on('offline', function () {
	document.body.style.cursor = "auto";
	$('#ux_0').html('<div class="message_center" style="display: flex; position: fixed;"><div class="message_unlink"></div><div class="message_big red">Oops, you are offline!</div><div class="message_sub_16 white">You can <a class="signup_link">sign up</a> to access online features.</div></div>');
	$(".signup_link").click(function() {
		shell.openExternal('https://mtgatool.com/signup/');
	});
});

//
ipc.on('log_read', function () {
	if ($('.top_nav').hasClass('hidden')) {
		$('.top_nav').removeClass('hidden');
		$('.overflow_ux').removeClass('hidden');
		$('.message_center').css('display', 'none');
	}
});


$(".list_deck").on('mouseenter mouseleave', function(e) {
    $(".deck_tile").trigger(e.type);
});


//
ipc.on('popup', function (event, arg, time) {
	pop(arg, time);
});

var popTimeout = null;
function pop(str, timeout) {
    $('.popup').css("opacity", 1);
    $('.popup').html(str);
    if (popTimeout != null) {
		clearTimeout(popTimeout);
    }
    if (timeout < 1) {
		popTimeout = null;
    }
    else {
		popTimeout = setTimeout(function() {
			$('.popup').css("opacity", 0);
			popTimeout = null;
		}, timeout);
    }
}

/* eslint-disable */
function installUpdate() {
	ipc_send('renderer_update_install', 1);
}
/* eslint-enable */

function force_open_settings() {
	sidebarActive = 6;
	$(".top_nav_item").each(function() {
		$(this).removeClass("item_selected");
		if ($(this).hasClass("it6")) {
			$(this).addClass("item_selected");
		}
	});
	$('.moving_ux').animate({'left': '0px'}, 250, 'easeInOutCubic'); 
	open_settings(lastSettingsSection);
}

function force_open_about() {
	sidebarActive = 9;
	$(".top_nav_item").each(function() {
		$(this).removeClass("item_selected");
		if ($(this).hasClass("it7")) {
			$(this).addClass("item_selected");
		}
	});
	$('.moving_ux').animate({'left': '0px'}, 250, 'easeInOutCubic'); 
	open_settings(5);
}

$(document).ready(function() {
	//document.getElementById("rememberme").checked = false;
	$(".signup_link").click(function() {
		shell.openExternal('https://mtgatool.com/signup/');
	});

	$(".offline_link").click(function() {
		ipc_send("login", {username: '', password: ''});
		offlineMode = true;
		$('.unlink').show();
	});

	$(".forgot_link").click(function() {
		shell.openExternal('https://mtgatool.com/resetpassword/');
	});

	$(".login_link").click(function() {
		if (canLogin) {
			var user = document.getElementById("signin_user").value;
			var pass = document.getElementById("signin_pass").value;
			if (pass != "********") {
				pass = sha1(pass);
			}
			ipc_send("login", {username: user, password: pass});
		}
	});

	//
	$(".close").click(function () {
		ipc_send('renderer_window_close', 1);
	});

	//
	$(".minimize").click(function () {
		ipc_send('renderer_window_minimize', 1);
	});

	//
	$(".settings").click(function () {
		force_open_settings();
	});

	//
	$(".top_nav_item").click(function () {
		$("#ux_0").off();
		$("#history_column").off();
        change_background("default");
		if (!$(this).hasClass("item_selected")) {
			$('.moving_ux').animate({'left': '0px'}, 250, 'easeInOutCubic'); 

			$(".top_nav_item").each(function() {
				$(this).removeClass("item_selected");
			});

			$(this).addClass("item_selected");

			if ($(this).hasClass("ith")) {
				sidebarActive = -1;
				ipc_send('request_tou_list', true);
			}
			if ($(this).hasClass("it0")) {
				sidebarActive = 0;
				setDecks(null);
			}
			if ($(this).hasClass("it1")) {
				sidebarActive = 1;
				$("#ux_0").html('');
				ipc_send('renderer_request_history', 1);
			}
			if ($(this).hasClass("it2")) {
				sidebarActive = 2;
				$("#ux_0").html('');
				ipc_send('request_events', 1);
			}
			if ($(this).hasClass("it3")) {
				sidebarActive = 3;
				$("#ux_0").html('<div class="loading_bar ux_loading"><div class="loading_color loading_w"></div><div class="loading_color loading_u"></div><div class="loading_color loading_b"></div><div class="loading_color loading_r"></div><div class="loading_color loading_g"></div></div>');
				document.body.style.cursor = "progress";
				ipc_send('renderer_request_explore', filterEvent);
			}
			if ($(this).hasClass("it4")) {
				sidebarActive = 4;
				ipc_send('request_economy', 1);
			}
			if ($(this).hasClass("it5")) {
				sidebarActive = 5;
				open_cards();
			}
			if ($(this).hasClass("it6")) {
				sidebarActive = 6;
				open_settings(lastSettingsSection);
			}
		}
		else {
			$('.moving_ux').animate({'left': '0px'}, 250, 'easeInOutCubic'); 
		}
	});
});

var daysago = 0;
var dayList = [];

class economyDay {
	constructor(goldEarned = 0, gemsEarned = 0, goldSpent = 0, gemsSpent = 0) {
		this.goldEarned = goldEarned;
		this.gemsEarned = gemsEarned;
		this.goldSpent = goldSpent;
		this.gemsSpent = gemsSpent;
	}
}

//
function setEconomy(loadMore) {
	var mainDiv = document.getElementById("ux_0");
	if (loadMore <= 0) {
		loadMore = 25;
		daysago = 0;
		dayList = [];
		dayList[0] = new economyDay();
		economyHistory.changes.sort(compare_economy); 

		var selectItems = ["All"];
		for (var n = 0; n < economyHistory.changes.length; n++) {
			let economy_id = economyHistory.changes[n];
			let change = economyHistory[economy_id];

			if (!selectItems.includes(change.context)) {
				selectItems.push(change.context);
			}
			
			if (change == undefined) continue;

			if (change.delta.gemsDelta != undefined) {
				if (change.delta.gemsDelta > 0)
					dayList[daysago].gemsEarned += change.delta.gemsDelta;
				else 
					dayList[daysago].gemsSpent  += Math.abs(change.delta.gemsDelta);
			}
			if (change.delta.goldDelta != undefined) {
				if (change.delta.goldDelta > 0)
					dayList[daysago].goldEarned += change.delta.goldDelta;
				else 
					dayList[daysago].goldSpent  += Math.abs(change.delta.goldDelta);
			}
			
			if (daysago != daysPast(change.date)) {
				daysago = daysPast(change.date);
				dayList[daysago] = new economyDay();
			}
		}
		
		mainDiv.classList.remove("flex_item");
		mainDiv.innerHTML = "";

		var d = document.createElement("div");
		d.classList.add("list_fill");

		let div = document.createElement("div");
		div.classList.add("list_economy_top");
		div.classList.add("flex_item");

		//
		var selectdiv = document.createElement("div");
		selectdiv.style.margin = "auto 64px auto 0px";

		var select = $('<select id="query_select"></select>');
		for (var i=0; i < selectItems.length; i++) {
			if (selectItems[i] !== filterEconomy) {
				select.append('<option value="'+selectItems[i]+'">'+selectItems[i]+'</option>');
			}
		}
		select.appendTo(selectdiv);
		div.appendChild(selectdiv);
		selectAdd(select, updateEconomy);
		select.next('div.select-styled').text(filterEconomy);

		//

		let icgo = document.createElement("div");
		icgo.classList.add("economy_gold_med");
		icgo.title = "Gold";

		let icge = document.createElement("div");
		icge.classList.add("economy_gems_med");
		icge.style.marginLeft = "24px";
		icge.title = "Gems";

		let tx = document.createElement("div");
		tx.style.lineHeight = "64px";
		tx.classList.add("economy_sub");

		div.appendChild(icgo);
		let ntx = tx.cloneNode(true);
		ntx.innerHTML = economyHistory.gold;
		div.appendChild(ntx);

		div.appendChild(icge);
		ntx = tx.cloneNode(true);
		ntx.innerHTML = economyHistory.gems;
		div.appendChild(ntx);

		ntx = tx.cloneNode(true);
		ntx.innerHTML = "Vault: "+economyHistory.vault+"%";
		ntx.style.marginLeft = "32px";
		div.appendChild(ntx);

		mainDiv.appendChild(div);
		mainDiv.appendChild(d);

		var loadEconomy = 0;
		daysago = -1;
	}

	//console.log("Load more: ", loadEconomy, loadMore, loadEconomy+loadMore);
	for (var loadEnd = loadEconomy + loadMore; loadEconomy < loadEnd; loadEconomy++) {
		let economy_id = economyHistory.changes[loadEconomy];
		let change = economyHistory[economy_id];

		if (change == undefined) continue;
		if (filterEconomy !== 'All' && change.context !== filterEconomy) {
			loadEnd++;
			continue;
		}

		if (daysago != daysPast(change.date)) {
			daysago = daysPast(change.date);
			let dd = new Date(change.date);
			let div = document.createElement("div");
			div.classList.add("economy_title");
			div.classList.add("flex_item");

			let fll = document.createElement("div");
			fll.classList.add("economy_sub");
			div.classList.add("flex_item");
			fll.style.lineHeight = "64px";

			if (daysago == 0) 	fll.innerHTML =  "Today";
			if (daysago == 1) 	fll.innerHTML =  "Yesterday";
			if (daysago > 1) 	fll.innerHTML =  daysago+" Days ago. ("+dd.toDateString()+")";

			let flr = document.createElement("div");
			flr.classList.add("economy_day_stats");
			flr.classList.add("flex_item");

			let icgo = document.createElement("div");
			icgo.classList.add("economy_gold_med");
			icgo.title = "Gold";

			let icge = document.createElement("div");
			icge.classList.add("economy_gems_med");
			icge.style.marginLeft = "24px";
			icge.title = "Gems";

			let up = document.createElement("div");
			up.classList.add("economy_up");

			let down = document.createElement("div");
			down.classList.add("economy_down");

			let tx = document.createElement("div");
			tx.style.lineHeight = "64px";
			tx.classList.add("economy_sub");

			flr.appendChild(icgo);
			flr.appendChild(up);
			tx.innerHTML = dayList[daysago].goldEarned;
			flr.appendChild(tx);
			
			flr.appendChild(down);
			let ntx = tx.cloneNode(true);
			ntx.innerHTML = dayList[daysago].goldSpent;
			flr.appendChild(ntx);
			
			flr.appendChild(icge);
			flr.appendChild(up.cloneNode(true));
			ntx = tx.cloneNode(true);
			ntx.innerHTML = dayList[daysago].gemsEarned;
			flr.appendChild(ntx);
			
			flr.appendChild(down.cloneNode(true));
			ntx = tx.cloneNode(true);
			ntx.innerHTML = dayList[daysago].gemsSpent;
			flr.appendChild(ntx);
			
			div.appendChild(fll);
			div.appendChild(flr);
			mainDiv.appendChild(div);
		}

		var div = document.createElement("div");
		div.classList.add(economy_id);
		div.classList.add("list_economy");

		var fll = document.createElement("div");
		fll.classList.add("flex_item");
		fll.style.flexDirection = "column";

		var flt = document.createElement("div");
		flt.classList.add("flex_top");
		flt.classList.add("economy_sub");
		flt.style.lineHeight = "32px";
		flt.innerHTML = change.context;

		var flb = document.createElement("div");
		flb.classList.add("flex_bottom");

		var flr = document.createElement("div");
		flr.classList.add("tiny_scroll");
		flr.classList.add("list_economy_awarded");

		let checkGemsPaid = false;
		let checkGoldPaid = false;
		let checkCardsAdded = false;
		let checkBoosterAdded = false;
		let checkAetherized = false;
		let checkWildcardsAdded = false;
		let checkGemsEarnt = false;
		let checkGoldEarnt = false;

		var bon, bos;

		if (change.context == "Booster Open") {
			change.delta.boosterDelta.forEach(function(booster) {
				var set = get_colation_set(booster.collationId);

				var bos = document.createElement("div");
				bos.classList.add("set_logo");
				bos.style.backgroundImage = 'url(../images/sets/'+setsList[set].code+'.png)';
				bos.title = set;

				var bon = document.createElement("div");
				bon.style.lineHeight = "32px";
				bon.classList.add("economy_sub");

				bon.innerHTML = "x"+Math.abs(booster.count);

				flb.appendChild(bos);
				flb.appendChild(bon);
			});

			checkWildcardsAdded = true;
			checkCardsAdded = true;
			checkAetherized = true;
		}
		else if (change.context == "Store") {
			checkGemsPaid = true;
			checkGoldPaid = true;
			checkBoosterAdded = true;
			checkCardsAdded = true;
			checkAetherized = true;
		}
		else if (change.context == "Pay Event Entry") {
			checkGemsPaid = true;
			checkGoldPaid = true;

			bos = document.createElement("div");
			bos.classList.add("economy_ticket_med");
			bos.title = "Event Entry";

			flr.appendChild(bos);
		}
		else if (change.context == "Redeem Wilcard") {
			var imgUri = "";
			if (change.delta.wcCommonDelta != undefined)	imgUri = "wc_common";
			if (change.delta.wcUncommonDelta != undefined)	imgUri = "wc_uncommon";
			if (change.delta.wcRareDelta != undefined)		imgUri = "wc_rare";
			if (change.delta.wcMythicDelta != undefined)	imgUri = "wc_mythic";
			if (imgUri != "") {
				bos = document.createElement("div");
				bos.classList.add("economy_wc");
				bos.style.backgroundImage = 'url(../images/'+imgUri+'.png)';

				flb.appendChild(bos);
			}

			checkCardsAdded = true;
			checkAetherized = true;
		}
		else {
			checkGemsEarnt = true;
			checkGoldEarnt = true;
			checkBoosterAdded = true;
			checkCardsAdded = true;
			checkAetherized = true;
			checkWildcardsAdded = true;
		}

		if (checkGemsPaid && change.delta.gemsDelta != undefined) {
			bos = document.createElement("div");
			bos.classList.add("economy_gems");
			bos.title = "Gems";

			bon = document.createElement("div");
			bon.style.lineHeight = "32px";
			bon.classList.add("economy_sub");
			bon.innerHTML = Math.abs(change.delta.gemsDelta);

			flb.appendChild(bos);
			flb.appendChild(bon);
		}

		if (checkGoldPaid && change.delta.goldDelta != undefined) {
			bos = document.createElement("div");
			bos.classList.add("economy_gold");
			bos.title = "Gold";

			bon = document.createElement("div");
			bon.style.lineHeight = "32px";
			bon.classList.add("economy_sub");
			bon.innerHTML = Math.abs(change.delta.goldDelta);

			flb.appendChild(bos);
			flb.appendChild(bon);
		}

		if (checkGemsEarnt && change.delta.gemsDelta != undefined) {
			bos = document.createElement("div");
			bos.classList.add("economy_gems_med");
			bos.title = "Gems";

			bon = document.createElement("div");
			bon.style.lineHeight = "64px";
			bon.classList.add("economy_sub");
			bon.innerHTML = Math.abs(change.delta.gemsDelta);

			flr.appendChild(bos);
			flr.appendChild(bon);
		}

		if (checkGoldEarnt && change.delta.goldDelta != undefined) {
			bos = document.createElement("div");
			bos.classList.add("economy_gold_med");
			bos.title = "Gold";

			bon = document.createElement("div");
			bon.style.lineHeight = "64px";
			bon.classList.add("economy_sub");
			bon.innerHTML = Math.abs(change.delta.goldDelta);

			flr.appendChild(bos);
			flr.appendChild(bon);
		}

		if (checkBoosterAdded && change.delta.boosterDelta != undefined) {
			change.delta.boosterDelta.forEach(function(booster) {
				var set = get_colation_set(booster.collationId);

				var bos = document.createElement("div");
				bos.classList.add("set_logo_med");
				bos.style.backgroundImage = 'url(../images/sets/'+setsList[set].code+'.png)';
				bos.title = set;

				var bon = document.createElement("div");
				bon.style.lineHeight = "64px";
				bon.classList.add("economy_sub");
				bon.innerHTML = "x"+Math.abs(booster.count);

				flr.appendChild(bos);
				flr.appendChild(bon);
			});
		}

		if (checkWildcardsAdded) {
			if (change.delta.wcCommonDelta != undefined) {
				bos = document.createElement("div");
				bos.classList.add("economy_wc");
				bos.title = 'Common Wildcard';
				bos.style.margin = 'auto 4px';
				bos.style.backgroundImage = 'url(../images/wc_common.png)';
				bon = document.createElement("div");
				bon.style.lineHeight = "64px";
				bon.classList.add("economy_sub");
				bon.innerHTML = "x"+Math.abs(change.delta.wcCommonDelta);
				flr.appendChild(bos);
				flr.appendChild(bon);
			}

			if (change.delta.wcUncommonDelta != undefined) {
				bos = document.createElement("div");
				bos.classList.add("economy_wc");
				bos.title = 'Uncommon Wildcard';
				bos.style.margin = 'auto 4px';
				bos.style.backgroundImage = 'url(../images/wc_uncommon.png)';
				bon = document.createElement("div");
				bon.style.lineHeight = "64px";
				bon.classList.add("economy_sub");
				bon.innerHTML = "x"+Math.abs(change.delta.wcUncommonDelta);
				flr.appendChild(bos);
				flr.appendChild(bon);
			}

			if (change.delta.wcRareDelta != undefined) {
				bos = document.createElement("div");
				bos.classList.add("economy_wc");
				bos.title = 'Rare Wildcard';
				bos.style.margin = 'auto 4px';
				bos.style.backgroundImage = 'url(../images/wc_rare.png)';
				bon = document.createElement("div");
				bon.style.lineHeight = "64px";
				bon.classList.add("economy_sub");
				bon.innerHTML = "x"+Math.abs(change.delta.wcRareDelta);
				flr.appendChild(bos);
				flr.appendChild(bon);
			}
			if (change.delta.wcMythicDelta != undefined) {
				bos = document.createElement("div");
				bos.classList.add("economy_wc");
				bos.title = 'Mythic Wildcard';
				bos.style.margin = 'auto 4px';
				bos.style.backgroundImage = 'url(../images/wc_mythic.png)';
				bon = document.createElement("div");
				bon.style.lineHeight = "64px";
				bon.classList.add("economy_sub");
				bon.innerHTML = "x"+Math.abs(change.delta.wcMythicDelta);
				flr.appendChild(bos);
				flr.appendChild(bon);
			}
		}

		if (checkAetherized && change.aetherizedCards != undefined) {
			change.aetherizedCards.forEach(function(obj) {
				var grpId = obj.grpId;
				var card = cardsDb.get(grpId);

				var d = document.createElement("div");
				d.classList.add("inventory_card");
				d.style.width = "39px";

				var img = document.createElement("img");
				img.classList.add("inventory_card_img");
				img.classList.add("inventory_card_aetherized");
				img.style.width = "39px";
				img.src = "https://img.scryfall.com/cards"+card.images[cardQuality];

				d.appendChild(img);
				flr.appendChild(d);

				var imgDom = $(img);
				addCardHover(imgDom, card);

				imgDom.on('click', function() {
					if (cardsDb.get(grpId).dfc == 'SplitHalf')	{
						card = cardsDb.get(card.dfcId);
					}
					//let newname = card.name.split(' ').join('-');
					shell.openExternal('https://scryfall.com/card/'+get_set_scryfall(card.set)+'/'+card.cid+'/'+card.name);
				});
			});
		}

		if (checkCardsAdded && change.delta.cardsAdded != undefined) {
			change.delta.cardsAdded.sort(collectionSortRarity);
			change.delta.cardsAdded.forEach(function(grpId) {
				var card = cardsDb.get(grpId);

				var d = document.createElement("div");
				d.classList.add("inventory_card");
				d.style.width = "39px";

				var img = document.createElement("img");
				img.classList.add("inventory_card_img");
				img.style.width = "39px";
				img.src = "https://img.scryfall.com/cards"+card.images[cardQuality];

				d.appendChild(img);
				flr.appendChild(d);

				var imgDom = $(img);
				addCardHover(imgDom, card);

				imgDom.on('click', function() {
					if (cardsDb.get(grpId).dfc == 'SplitHalf')	{
						card = cardsDb.get(card.dfcId);
					}
					//let newname = card.name.split(' ').join('-');
					shell.openExternal('https://scryfall.com/card/'+get_set_scryfall(card.set)+'/'+card.cid+'/'+card.name);
				});				
			});
		}

		fll.appendChild(flt);
		fll.appendChild(flb);
		div.appendChild(fll);
		div.appendChild(flr);

		mainDiv.appendChild(div);

		$('.list_economy_awarded').on("mousewheel", function(e) {
			var delta = (parseInt(e.originalEvent.deltaY)/40);
			this.scrollLeft += delta;
			e.preventDefault();
		});

	}

	$(this).off();
	$("#ux_0").on('scroll', function() {
		if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
			setEconomy(20);
		}
	})

	loadEconomy = loadEnd;
}

//
function updateEconomy() {
	filterEconomy = getEventId(document.getElementById("query_select").value);
	setEconomy(0);
}


//
function setEvents(loadMore) {
	var mainDiv = document.getElementById("ux_0");
	if (loadMore <= 0) {
		loadMore = 25;
		eventsHistory.courses.sort(compare_courses); 

		mainDiv.classList.remove("flex_item");
		mainDiv.innerHTML = '';

		var d = document.createElement("div");
		d.classList.add("list_fill");
		mainDiv.appendChild(d);

		loadEvents = 0;
	}

	//console.log("Load more: ", loadEvents, loadMore, loadEvents+loadMore);
	for (var loadEnd = loadEvents + loadMore; loadEvents < loadEnd; loadEvents++) {
		var course_id = eventsHistory.courses[loadEvents];
		var course = eventsHistory[course_id];

		if (course == undefined) continue;

		var div = document.createElement("div");
		div.classList.add(course.id);
		div.classList.add("list_match");

		var fltl = document.createElement("div");
		fltl.classList.add("flex_item");

		var fll = document.createElement("div");
		fll.classList.add("flex_item");
		fll.style.flexDirection = "column";

		var flt = document.createElement("div");
		flt.classList.add("flex_top");
		fll.appendChild(flt);

		var flb = document.createElement("div");
		flb.classList.add("flex_bottom");
		fll.appendChild(flb);

		var flc = document.createElement("div");
		flc.classList.add("flex_item");
		flc.style.flexDirection = "column";
		flc.style.flexGrow = 2;

		var fct = document.createElement("div");
		fct.classList.add("flex_top");
		flc.appendChild(fct);

		var fcb = document.createElement("div");
		fcb.classList.add("flex_bottom");
		fcb.style.marginRight = "14px";
		flc.appendChild(fcb);

		var flr = document.createElement("div");
		flr.classList.add("flex_item");

		var tileGrpid = course.CourseDeck.deckTileId;
		try {
			cardsDb.get(tileGrpid).set;
		}
		catch (e) {
			tileGrpid = 67003;
		}

		var tile = document.createElement("div");
		tile.classList.add(course.id+"t");
		tile.classList.add("deck_tile");

		try {
			tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";
		}
		catch (e) {
			console.error(e, tileGrpid);
		}
		fltl.appendChild(tile);

		d = document.createElement("div");
		d.classList.add("list_deck_name");
		d.innerHTML = getReadableEvent(course.InternalEventName);
		flt.appendChild(d);

		course.CourseDeck.colors.forEach(function(color) {
			var m = document.createElement("div");
			m.classList.add("mana_s20");
			m.classList.add("mana_"+mana[color]);
			flb.appendChild(m);
		});

		var d = document.createElement("div");
		if (course.CurrentEventState == "DoneWithMatches") {
			d.innerHTML = "Completed";
			d.classList.add("list_event_phase");
		}
		else {
			d.innerHTML = "In progress";
			d.classList.add("list_event_phase_red");
		}
		fct.appendChild(d);

		d = document.createElement("div");
		d.classList.add("list_match_time");
		d.innerHTML = timeSince(new Date(course.date))+' ago.';
		fcb.appendChild(d);

		var wlGate = course.ModuleInstanceData.WinLossGate;

		if (wlGate == undefined) {
			d = document.createElement("div");
			d.classList.add("list_match_result_win");
			d.innerHTML = "0:0";
			flr.appendChild(d);
		}
		else {
			if (wlGate.MaxWins == wlGate.CurrentWins) {
				d = document.createElement("div");
				d.classList.add("list_match_result_win");
				d.innerHTML = wlGate.CurrentWins +":"+wlGate.CurrentLosses;
				flr.appendChild(d);
			}
			else {
				d = document.createElement("div");
				d.classList.add("list_match_result_loss");
				d.innerHTML = wlGate.CurrentWins +":"+wlGate.CurrentLosses;
				flr.appendChild(d);
			}
		}

		var divExp = document.createElement("div");
		divExp.classList.add(course.id+"exp");
		divExp.classList.add("list_event_expand");


		var fldel = document.createElement("div");
		fldel.classList.add("flex_item");
		fldel.classList.add(course.id+"_del");
		fldel.classList.add("delete_item");
		fldel.style.marginRight = "10px";

		div.appendChild(fltl);
		div.appendChild(fll);
		div.appendChild(flc);
		div.appendChild(flr);
		div.appendChild(fldel);

		mainDiv.appendChild(div);
		mainDiv.appendChild(divExp);
		
		deleteCourse(course);
		addHover(course, divExp);
	}

	$(this).off();
	$("#ux_0").on('scroll', function() {
		if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
			setEvents(20);
		}
	})

	$('.delete_item').hover(function() {
			// in
			$(this).css('width', '32px');
		}, function() {
			// out
			$(this).css('width', '4px');
		}
	);

	loadEvents = loadEnd;
}

//
function deleteCourse(_course) {
	$('.'+_course.id+'_del').on('click', function(e) {
		currentId = _course.id;
		e.stopPropagation();
		ipc_send('delete_course', currentId);
		$('.'+currentId).css('height', "0px");
	});
}

//
function expandEvent(_course, expandDiv) {
	if (expandDiv.hasAttribute("style")) {
		expandDiv.removeAttribute("style");
		setTimeout(function() {
			expandDiv.innerHTML = "";
		}, 200);
		return;
	}

	var matchesList = _course.ModuleInstanceData.WinLossGate.ProcessedMatchIds;
	expandDiv.innerHTML = "";
	//console.log(matchesList);
	var d;
	var newHeight = 0;
	if (matchesList != undefined) {
		matchesList.forEach(function(_mid) {
			var match = matchesHistory[_mid];

			//console.log(_mid);
			//console.log(match);
			if (match != undefined) {
				if (match.type == "match") {

					//	if (match.opponent == undefined) continue;
					//	if (match.opponent.userid.indexOf("Familiar") !== -1) continue;
					match.playerDeck.mainDeck.sort(compare_cards);
					match.oppDeck.mainDeck.sort(compare_cards);

					var div = document.createElement("div");
					div.classList.add(match.id);
					div.classList.add("list_match");

					var fltl = document.createElement("div");
					fltl.classList.add("flex_item");

					var fll = document.createElement("div");
					fll.classList.add("flex_item");
					fll.style.flexDirection = "column";

					var flt = document.createElement("div");
					flt.classList.add("flex_top");
					fll.appendChild(flt);

					var flb = document.createElement("div");
					flb.classList.add("flex_bottom");
					fll.appendChild(flb);

					var flc = document.createElement("div");
					flc.classList.add("flex_item");
					flc.style.flexDirection = "column";
					flc.style.flexGrow = 2;

					var fct = document.createElement("div");
					fct.classList.add("flex_top");
					flc.appendChild(fct);

					var fcb = document.createElement("div");
					fcb.classList.add("flex_bottom");
					fcb.style.marginRight = "14px";
					flc.appendChild(fcb);

					var flr = document.createElement("div");
					flr.classList.add("flex_item");

					var tileGrpid = match.playerDeck.deckTileId;
					try {
						cardsDb.get(tileGrpid).set;
					}
					catch (e) {
						tileGrpid = 67003;
					}

					var tile = document.createElement("div");
					tile.classList.add(match.id+"t");
					tile.classList.add("deck_tile");

					try {
						tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";
					}
					catch (e) {
						console.error(e)
					}
					fltl.appendChild(tile);

					var d = document.createElement("div");
					d.classList.add("list_deck_name");
					d.innerHTML = match.playerDeck.name;
					flt.appendChild(d);

					match.playerDeck.colors.forEach(function(color) {
						var m = document.createElement("div");
						m.classList.add("mana_s20");
						m.classList.add("mana_"+mana[color]);
						flb.appendChild(m);
					});

					d = document.createElement("div");
					d.classList.add("list_match_title");
					if (match.opponent.name == null) {
						match.opponent.name = "-";
					}
					d.innerHTML = "vs "+match.opponent.name.slice(0, -6);
					fct.appendChild(d);

					var or = document.createElement("div");
					or.classList.add("ranks_16");
					or.style.backgroundPosition = (get_rank_index_16(match.opponent.rank)*-16)+"px 0px";
					or.title = match.opponent.rank+" "+match.opponent.tier;
					fct.appendChild(or);

					d = document.createElement("div");
					d.classList.add("list_match_time");
					d.innerHTML = timeSince(new Date(match.date))+' ago.';
					fcb.appendChild(d);

					var cc = get_deck_colors(match.oppDeck);
					cc.forEach(function(color) {
						var m = document.createElement("div");
						m.classList.add("mana_s20");
						m.classList.add("mana_"+mana[color]);
						fcb.appendChild(m);
					});

					if (match.player.win > match.opponent.win) {
						d = document.createElement("div");
						d.classList.add("list_match_result_win");
						//d.innerHTML = "Win";
						d.innerHTML = match.player.win +":"+match.opponent.win;
						flr.appendChild(d);
					}
					else {
						d = document.createElement("div");
						d.classList.add("list_match_result_loss");
						//d.innerHTML = "Loss";
						d.innerHTML = match.player.win +":"+match.opponent.win;
						flr.appendChild(d);
					}

					div.appendChild(fltl);
					div.appendChild(fll);
					div.appendChild(flc);
					div.appendChild(flr);

					expandDiv.appendChild(div);
					newHeight += 64;
					addHover(match, expandDiv);
				}
			}
		});
	}
	expandDiv.style.height = newHeight+16+"px";
}

//
function setHistory(loadMore) {
	var mainDiv = document.getElementById("ux_0");
	var div, d;
	mainDiv.classList.add("flex_item");
	if (loadMore <= 0) {
		loadMore = 25;
		sort_history();		
		mainDiv.innerHTML = '';

		loadHistory = 0;
		
		var wrap_r = document.createElement("div");
		wrap_r.classList.add("wrapper_column");
		wrap_r.classList.add("sidebar_column_l");

		div = document.createElement("div");
		div.classList.add("ranks_history");

		var t = document.createElement("div");
		t.classList.add("ranks_history_title");
		t.innerHTML = "Stats from last 10 days:";
		div.appendChild(t);

		// Add ranks matchup history here
		for (var key in matchesHistory.rankwinrates) {
			if (matchesHistory.rankwinrates.hasOwnProperty(key)) {
				var val = matchesHistory.rankwinrates[key];
				if (val.t > 0) {
					var fla = document.createElement("div");
					fla.classList.add("flex_item");
					//fla.style.flexDirection = "column";
					fla.style.justifyContent = "center";

					var v = document.createElement("div");
					v.classList.add("ranks_history_title");
					v.innerHTML = "Vs.";

					var r = document.createElement("div");
					r.classList.add("ranks_history_badge");
					r.style.backgroundPosition = (get_rank_index(val.r, 1)*-48)+"px 0px";
					r.title = val.r;

					var s = document.createElement("div");
					s.classList.add("ranks_history_title");
					s.innerHTML = Math.round(val.w/val.t*100)+"%";

					fla.appendChild(v);
					fla.appendChild(r);
					fla.appendChild(s);
					div.appendChild(fla);
				}
			}
		}

		var wrap_l = document.createElement("div");
		wrap_l.classList.add("wrapper_column");
		wrap_l.setAttribute("id", "history_column");

		d = document.createElement("div");
		d.classList.add("list_fill");

		wrap_r.appendChild(div);
		mainDiv.appendChild(wrap_l);
		mainDiv.appendChild(wrap_r);
		wrap_l.appendChild(d);
	}

	mainDiv = document.getElementById("history_column");
	
	console.log("Load more: ", loadHistory, loadMore, loadHistory+loadMore);
	for (var loadEnd = loadHistory + loadMore; loadHistory < loadEnd; loadHistory++) {
		var match_id = matchesHistory.matches[loadHistory];
		var match = matchesHistory[match_id];

		console.log("match: ", match_id, match);
		if (match == undefined) continue;
		if (match.type == "match") {
			if (match.opponent == undefined) continue;
			if (match.opponent.userid.indexOf("Familiar") !== -1) continue;
		}
		if (match.type == "Event")	continue;
		console.log("Load match: ", match_id, match);
		console.log("Match: ", loadHistory, match.type, match);

		div = document.createElement("div");
		div.classList.add(match.id);
		div.classList.add("list_match");

		var fltl = document.createElement("div");
		fltl.classList.add("flex_item");

		var fll = document.createElement("div");
		fll.classList.add("flex_item");
		fll.style.flexDirection = "column";

		var flt = document.createElement("div");
		flt.classList.add("flex_top");
		fll.appendChild(flt);

		var flb = document.createElement("div");
		flb.classList.add("flex_bottom");
		fll.appendChild(flb);

		var flc = document.createElement("div");
		flc.classList.add("flex_item");
		flc.style.flexDirection = "column";
		flc.style.flexGrow = 2;

		var fct = document.createElement("div");
		fct.classList.add("flex_top");
		flc.appendChild(fct);

		var fcb = document.createElement("div");
		fcb.classList.add("flex_bottom");
		fcb.style.marginRight = "14px";
		flc.appendChild(fcb);

		var flr = document.createElement("div");
		flr.classList.add("rightmost");
		flr.classList.add("flex_item");

		var tileGrpid, tile;
		if (match.type == "match") {
			tileGrpid = match.playerDeck.deckTileId;
			try {
				let t = cardsDb.get(tileGrpid).set;
			}
			catch (e) {
				tileGrpid = 67003;
			}

			tile = document.createElement("div");
			tile.classList.add(match.id+"t");
			tile.classList.add("deck_tile");

			try {
				tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";
			}
			catch (e) {
				console.error(e, tileGrpid);
			}
			fltl.appendChild(tile);

			d = document.createElement("div");
			d.classList.add("list_deck_name");
			d.innerHTML = match.playerDeck.name;
			flt.appendChild(d);

			match.playerDeck.colors.forEach(function(color) {
				var m = document.createElement("div");
				m.classList.add("mana_s20");
				m.classList.add("mana_"+mana[color]);
				flb.appendChild(m);
			});

			d = document.createElement("div");
			d.classList.add("list_match_title");
			if (match.opponent.name == null) {
				match.opponent.name = "-";
			}
			d.innerHTML = "vs "+match.opponent.name.slice(0, -6);
			fct.appendChild(d);

			var or = document.createElement("div");
			or.classList.add("ranks_16");
			or.style.backgroundPosition = (get_rank_index_16(match.opponent.rank)*-16)+"px 0px";
			or.title = match.opponent.rank+" "+match.opponent.tier;
			fct.appendChild(or);

			d = document.createElement("div");
			d.classList.add("list_match_time");
			d.innerHTML = timeSince(new Date(match.date))+' ago - '+toMMSS(match.duration);
			fcb.appendChild(d);

			var cc = get_deck_colors(match.oppDeck);
			cc.forEach(function(color) {
				var m = document.createElement("div");
				m.classList.add("mana_s20");
				m.classList.add("mana_"+mana[color]);
				fcb.appendChild(m);
			});

			if (match.player.win > match.opponent.win) {
				d = document.createElement("div");
				d.classList.add("list_match_result_win");
				//d.innerHTML = "Win";
				d.innerHTML = match.player.win +":"+match.opponent.win;
				flr.appendChild(d);
			}
			else {
				d = document.createElement("div");
				d.classList.add("list_match_result_loss");
				//d.innerHTML = "Loss";
				d.innerHTML = match.player.win +":"+match.opponent.win;
				flr.appendChild(d);
			}
		}
		else if (match.type == "draft") {
			console.log("Draft: ", match);
			try {
				tileGrpid = setsList[match.set].tile;
			}
			catch (e) {
				tileGrpid = 67003;
			}

			tile = document.createElement("div");
			tile.classList.add(match.id+"t");
			tile.classList.add("deck_tile");

			try {
				tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";
			}
			catch (e) {
				console.error(e);
			}
			fltl.appendChild(tile);

			d = document.createElement("div");
			d.classList.add("list_deck_name");
			d.innerHTML = match.set+" draft";
			flt.appendChild(d);

			d = document.createElement("div");
			d.classList.add("list_match_time");
			d.innerHTML = timeSince(new Date(match.date))+" ago.";
			fcb.appendChild(d);

			d = document.createElement("div");
			d.classList.add("list_match_replay");
			d.innerHTML = "See replay";
			fct.appendChild(d);

			d = document.createElement("div");
			d.classList.add("list_draft_share");
			d.classList.add(match.id+'dr');
			flr.appendChild(d);

		}

		var fldel = document.createElement("div");
		fldel.classList.add("flex_item");
		fldel.classList.add(match.id+"_del");
		fldel.classList.add("delete_item");


		div.appendChild(fltl);
		div.appendChild(fll);
		div.appendChild(flc);
		div.appendChild(flr);
		div.appendChild(fldel);

		mainDiv.appendChild(div);

		if (match.type == "draft") {
			addShare(match);
		}
		deleteMatch(match);
		addHover(match, tileGrpid);
	}

	$(this).off();
	$("#history_column").on('scroll', function() {
		if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
			setHistory(20);
		}
	})

	$('.delete_item').hover(function() {
			// in
			$(this).css('width', '32px');
		}, function() {
			// out
			$(this).css('width', '4px');
		}
	);

	loadHistory = loadEnd;
}

//
function deleteMatch(_match) {
	$('.'+_match.id+'_del').on('click', function(e) {
		currentId = _match.id;
		e.stopPropagation();
		ipc_send('delete_match', currentId);
		$('.'+currentId).css('height', "0px");
	});
}

var currentId = null;
//
function addShare(_match) {
	$('.'+_match.id+'dr').on('click', function(e) {
		currentId = _match.id;
		e.stopPropagation();
		$('.dialog_wrapper').css('opacity', 1);
		$('.dialog_wrapper').css('pointer-events', 'all');
		$('.dialog_wrapper').show();
		$('.dialog').css('width', '500px');
		$('.dialog').css('height', '200px');
		$('.dialog').css('top', 'calc(50% - 100px)');

		$('.dialog_wrapper').on('click', function() {
			console.log('.dialog_wrapper on click')
			//e.stopPropagation();
			$('.dialog_wrapper').css('opacity', 0);
			$('.dialog_wrapper').css('pointer-events', 'none');
			setTimeout(function() {
				$('.dialog_wrapper').hide();
				$('.dialog').css('width', '400px');
				$('.dialog').css('height', '160px');
				$('.dialog').css('top', 'calc(50% - 80px)');
			}, 250);
		});

		$('.dialog').on('click', function(e) {
			e.stopPropagation();
			console.log('.dialog on click')
		});

		var dialog = $('.dialog');
		dialog.html('');
		var cont = $('<div class="dialog_container"></div>');

		cont.append('<div class="share_title">Link For sharing:</div>');
		var icd = $('<div class="share_input_container"></div>');
		var but = $('<div class="button_simple">Copy</div>');
		var sin = $('<input id="share_input" onClick="this.setSelectionRange(0, this.value.length)" autofocus autocomplete="off" value="" />');

		sin.appendTo(icd);
		but.appendTo(icd);
		icd.appendTo(cont);

		cont.append('<div class="share_subtitle"><i>Expires in: </i></div>');
		cont.appendTo(dialog);

		var select = $('<select id="expire_select">'+sortingAlgorithm+'</select>');
		var sortby = ['One day', 'One week', 'One month', 'Never'];
		for (var i=0; i < sortby.length; i++) {
			select.append('<option value="'+sortby[i]+'">'+sortby[i]+'</option>');
		}
		select.appendTo(cont);
		selectAdd(select, draftShareLink);

		but.click(function () {
			ipc_send('set_clipboard', document.getElementById("share_input").value);
		});
	});
}

//
function draftShareLink() {
	var shareExpire = document.getElementById("expire_select").value;
	var expire = 0;
	switch (shareExpire) {
		case 'One day': 	expire = 0; break;
		case 'One week': 	expire = 1; break;
		case 'One month': 	expire = 2; break;
		case 'Never': 		expire = -1; break;
		default: 			expire = 0; break;

	}
	var obj = {
		expire: expire,
		id: currentId
	}
	ipc_send('request_draft_link', obj);
}

//
ipc.on('set_draft_link', function (event, arg) {
	document.getElementById("share_input").value = arg;
});


//
function addHover(_match, tileGrpid) {
	$('.'+_match.id).on('mouseenter', function() {
		$('.'+_match.id+'t').css('opacity', 1);
		$('.'+_match.id+'t').css('width', '200px');
	});

	$('.'+_match.id).on('mouseleave', function() {
		$('.'+_match.id+'t').css('opacity', 0.66);
$('.'+_match.id+'t').css('width', '128px');
	});

	$('.'+_match.id).on('click', function() {
		if (_match.type == "match") {
			open_match(_match.id);
			$('.moving_ux').animate({'left': '-100%'}, 250, 'easeInOutCubic'); 
		}
		else if (_match.type == "draft") {
			draftPosition = 1;
			open_draft(_match.id, tileGrpid, _match.set);
			$('.moving_ux').animate({'left': '-100%'}, 250, 'easeInOutCubic'); 
		}
		else if (_match.type == "Event") {
			expandEvent(_match, tileGrpid);
		}
	});
}

//
function setTourneys(arg) {
	if (arg != null) {
		tournaments = arg;
	}

	let mainDiv = document.getElementById("ux_0");
	mainDiv.classList.remove("flex_item");
	mainDiv.innerHTML = '';

	let d = document.createElement("div");
	d.classList.add("list_fill");
	mainDiv.appendChild(d);

	let cont = document.createElement("div");
	cont.classList.add("tournament_list_cont");

	cont = document.createElement("div");
	cont.classList.add("tournament_list_cont");

	tournaments.forEach(function(tou, index) {
		console.log(tou);

		let div = document.createElement("div");
		div.classList.add("tou_container");
		div.id = tou._id;


		let sd = tou.signupDuration;
		let rd = tou.roundDuration;
		let now = timestamp();

		let roundsStart = tou.starts + (sd * 60*60);
		let roundEnd = tou.starts + (sd * 60*60) + (tou.currentRound * (60*60) * rd);

		let state = "-";
		let stateb = "-";
		if (tou.state == -1) {
			state = "Registration begin in "+(toHHMM(now - tou.starts));
		}
		if (tou.state == 0) {
			state = "Registration in progress.";
			stateb = toHHMM(roundsStart-now)+" left";
		}
		if (tou.state == 1) {
			state = "Round "+(tou.currentRound+1)+" in progress.";
			stateb = toHHMM(roundEnd-now)+" left";
		}
		if (tou.state == 4) {
			state = "Tournament finish.";
			stateb = tou.winner.slice(0, -6);
		}

		let nam = document.createElement("div");
		nam.classList.add("tou_name");
		nam.innerHTML = tou.name;

		let st = document.createElement("div");
		st.classList.add("tou_state");
		st.innerHTML = state;

		let pln = document.createElement("div");
		pln.classList.add("tou_cell");
		pln.innerHTML = stateb;

		let stb = document.createElement("div");
		stb.classList.add("tou_cell");
		stb.innerHTML = tou.players.length;

		div.appendChild(nam);
		div.appendChild(st);
		div.appendChild(stb);
		div.appendChild(pln);
		cont.appendChild(div);
	});

	mainDiv.appendChild(cont);

	$('.tou_container').each(function() {
		$(this).on("click", function() {
			let ti = $(this).attr('id');
			ipc_send("tou_get", ti);
		});
	});
}


//
ipc.on('tou_set', function (event, arg) {
	openTournament(arg);
	$('.moving_ux').animate({'left': '-100%'}, 250, 'easeInOutCubic');
});

//
function openTournament(tou) {
	let mainDiv = $("#ux_1");
	mainDiv.html('');

	let sd = tou.signupDuration;
	let rd = tou.roundDuration;
	let now = timestamp();
	let roundsStart = tou.starts + (sd * 60*60);
	let roundEnd = tou.starts + (sd * 60*60) + (tou.currentRound * 60*60 * rd);

	let joined = false;
	let record = '-';
	let stats;
	if (tou.players.indexOf(userName) !== -1) {
		joined = true;
		stats = tou.playerStats[userName];
		record = stats.w+' - '+stats.d+' - '+stats.l;
	}

	let top = $('<div class="decklist_top"><div class="button back"></div><div class="deck_name">'+tou.name+'</div></div>');
	let flr = $('<div class="tou_top_status" style="align-self: center;"></div>');

	let state = "";
	if (tou.state == -1) {
		state = "Registration begin in "+(toHHMM(now - tou.starts));
	}
	if (tou.state == 0) {
		state = toHHMM(roundsStart-now)+" left to register.";
	}
	if (tou.state == 1) {
		state = "Round "+(tou.currentRound+1)+" ends in "+toHHMM(roundEnd-now);
	}
	if (tou.state == 4) {
		state = "Tournament finish.";
	}
	flr.html(state);
	flr.appendTo(top);
	top.appendTo(mainDiv);

	$('<div class="tou_record green">'+record+'</div>').appendTo(mainDiv);

	let tabs = $('<div class="tou_tabs_cont"></div>');
	let tab_rounds = $('<div class="tou_tab tabr tou_tab_selected">Rounds</div>');
	let tab_standings = $('<div class="tou_tab tabp ">Standings</div>');

	tab_rounds.appendTo(tabs);
	tab_standings.appendTo(tabs);
	tabs.appendTo(mainDiv);

	let tab_cont_a = $('<div class="tou_cont_a"></div>');
	for (let i=0; i<tou.currentRound+1; i++) {
		let rname = 'round_'+i;
		if (tou[rname] !== undefined) {
			$('<div class="tou_round_title">Round '+(i+1)+'</div>').appendTo(tab_cont_a);
			let round_cont = $('<div class="tou_round_cont"></div>');

			tou[rname].forEach(function(match) {
				let cont = $('<div class="tou_match_cont"></div>');
				let p1wc = '';
				let p2wc = '';
				if (match.winner == 1) {
					p1wc = 'tou_score_win';
				}
				if (match.winner == 2) {
					p2wc = 'tou_score_win';
				}

				let d1 = '';
				let d2 = '';
				if (match.p2 == "bye")	match.p2 = "BYE#00000";
				try {
					if (match.drop1)	d1 = ' (drop)';
					if (match.drop2)	d2 = ' (drop)';
				}
				catch (e) {
					console.error(e);
				}

				let s = '';
				if (match.p1 == userName)	s = 'style="color: rgba(183, 200, 158, 1);"';
				let p1 = $('<div '+s+' class="tou_match_p '+match.p1+'pn">'+match.p1.slice(0, -6)+d1+'<div class="'+p1wc+' tou_match_score">'+match.p1w+'</div></div>');
				s = '';
				if (match.p2 == userName)	s = 'style="color: rgba(183, 200, 158, 1);"';
				let p2 = $('<div '+s+' class="tou_match_p '+match.p2+'pn">'+match.p2.slice(0, -6)+d2+'<div class="'+p2wc+' tou_match_score">'+match.p2w+'</div></div>');

				p1.appendTo(cont);
				p2.appendTo(cont);
				cont.appendTo(round_cont);
			})
			round_cont.appendTo(tab_cont_a);
		}
	}

	let tab_cont_b = $('<div class="tou_cont_b" style="height: 0px"></div>');
	tou.players.sort(function(a, b) {
		if (tou.playerStats[a].mp > tou.playerStats[b].mp)		return -1;
		else if (tou.playerStats[a].mp < tou.playerStats[b].mp)	return 1;
		else {
			if (tou.playerStats[a].omwp > tou.playerStats[b].omwp)		return -1;
			else if (tou.playerStats[a].omwp < tou.playerStats[b].omwp)	return 1;
			else {
				if (tou.playerStats[a].gwp > tou.playerStats[b].gwp)		return -1;
				else if (tou.playerStats[a].gwp < tou.playerStats[b].gwp)	return 1;
				else {
					if (tou.playerStats[a].ogwp > tou.playerStats[b].ogwp)		return -1;
					else if (tou.playerStats[a].ogwp < tou.playerStats[b].ogwp)	return 1;
				}
			}
		}
		return 0;
	});

	let line = $('<div class="tou_stand_line_title line_dark"></div>');
	$('<div class="tou_stand_name">Name</div><div class="tou_stand_cell">Points</div><div class="tou_stand_cell">Score</div><div class="tou_stand_cell">Matches</div><div class="tou_stand_cell">Games</div><div class="tou_stand_cell">OMW</div><div class="tou_stand_cell">GW</div><div class="tou_stand_cell">OGW</div>').appendTo(line);
	line.appendTo(tab_cont_b);

	tou.players.forEach( function(pname, index) {
		let stat = tou.playerStats[pname];
		if (index % 2) {
			line = $('<div class="tou_stand_line line_dark"></div>');
		}
		else {
			line = $('<div class="tou_stand_line"></div>');
		}
		let str = '';

		let s = '';
		if (pname == userName)	s = 'style="color: rgba(183, 200, 158, 1);"';

		str += '<div '+s+' class="tou_stand_name">'+pname.slice(0, -6)+'</div>';
		str += '<div class="tou_stand_cell">'+stat.mp+'</div>';
		str += '<div class="tou_stand_cell">'+stat.w+'-'+stat.d+'-'+stat.l+'</div>';
		str += '<div class="tou_stand_cell">'+stat.rpl+'</div>';
		str += '<div class="tou_stand_cell">'+stat.gpl+'</div>';
		str += '<div class="tou_stand_cell">'+Math.round(stat.omwp*10000)/100+'%</div>';
		str += '<div class="tou_stand_cell">'+Math.round(stat.gwp*10000)/100+'%</div>';
		str += '<div class="tou_stand_cell">'+Math.round(stat.ogwp*10000)/100+'%</div>';

		$(str).appendTo(line);
		line.appendTo(tab_cont_b);
	});

	tab_cont_a.appendTo(mainDiv);
	tab_cont_b.appendTo(mainDiv);

	$(".tabr").click(function () {
		if (!$(this).hasClass("tou_tab_selected")) {
			$(this).addClass("tou_tab_selected");
			$(".tabp").removeClass("tou_tab_selected");
			$(".tou_cont_a").css("height", "auto");
			$(".tou_cont_b").css("height", "0px");
		}
	});

	$(".tabp").click(function () {
		if (!$(this).hasClass("tou_tab_selected")) {
			$(this).addClass("tou_tab_selected");
			$(".tabr").removeClass("tou_tab_selected");
			$(".tou_cont_b").css("height", "auto");
			$(".tou_cont_a").css("height", "0px");
		}
	});

	$(".back").click(function () {
        change_background("default");
		$('.moving_ux').animate({'left': '0px'}, 250, 'easeInOutCubic'); 
	});
}

//
function setDecks(arg) {
	if (arg != null) {
		decks = arg;//JSON.parse(arg);
	}
	if (sidebarActive == 0 && decks != null) {
		sort_decks();
		var mainDiv = document.getElementById("ux_0");
		mainDiv.classList.remove("flex_item");
		mainDiv.innerHTML = '';
		var d = document.createElement("div");
		d.classList.add("list_fill");
		mainDiv.appendChild(d);

		decks.forEach(function(deck, index) {
			var tileGrpid = deck.deckTileId;

			if (cardsDb.get(tileGrpid).set == undefined) {
				tileGrpid = 67003;
			}

			var tile = document.createElement("div");
			tile.classList.add(deck.id+'t');
			tile.classList.add('deck_tile');

			try {
				tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";
			}
			catch (e) {
				console.error(e);
			}

			var div = document.createElement("div");
			div.classList.add(deck.id);
			div.classList.add('list_deck');

			var fll = document.createElement("div");
			fll.classList.add('flex_item');

			var flc = document.createElement("div");
			flc.classList.add('flex_item');
			flc.style.flexDirection = "column";

			var flcf = document.createElement("div");
			flcf.classList.add('flex_item');
			flcf.style.flexGrow = 2;

			var flr = document.createElement("div");
			flr.classList.add('flex_item');
			flr.style.flexDirection = "column";

			var flt = document.createElement("div");
			flt.classList.add('flex_top');

			var flb = document.createElement("div");
			flb.classList.add('flex_bottom');

			if (deck.name.indexOf('?=?Loc/Decks/Precon/') != -1) {
				deck.name = deck.name.replace('?=?Loc/Decks/Precon/', '');
			}

			d = document.createElement("div");
			d.classList.add('list_deck_name');
			d.innerHTML = deck.name;
			flt.appendChild(d);

			var missingCards = false;
			deck.mainDeck.forEach(function(card) {
				var grpId = card.id;
				//var type = cardsDb.get(grpId).type;
				if (cardsDb.get(grpId).type.indexOf("Basic Land") == -1) {
					var quantity = card.quantity;
					if (grpId == 67306 && quantity > 4) {
						quantity = 4;
					}
					if (cards[grpId] == undefined) {
						missingCards = true
					}
					else if (quantity > cards[grpId]) {
						missingCards = true;
					}
				}
			});
			deck.sideboard.forEach(function(card) {
				var grpId = card.id;
				//var type = cardsDb.get(grpId).type;
				if (cardsDb.get(grpId).type.indexOf("Basic Land") == -1) {
					var quantity = card.quantity;
					if (grpId == 67306 && quantity > 4) {
						quantity = 4;
					}
					if (cards[grpId] == undefined) {
						missingCards = true
					}
					else if (quantity > cards[grpId]) {
						missingCards = true;
					}
				}
			});

			if (missingCards) {
				d = document.createElement("div");
				d.classList.add('decklist_not_owned');
				flt.appendChild(d);
			}


			deck.colors.forEach(function(color) {
				var d = document.createElement("div");
				d.classList.add('mana_s20');
				d.classList.add('mana_'+mana[color]);
				flb.appendChild(d);
			});

			var wr = getDeckWinrate(deck.id, deck.lastUpdated);
			if (wr != 0) {
				var d = document.createElement("div");
				d.classList.add('list_deck_winrate');
				//d.innerHTML = 'Winrate: '+(wr.total*100).toFixed(2)+'%';
				d.innerHTML = 'Wins: '+wr.wins+' / Losses: '+wr.losses+' ('+(wr.total*100).toFixed(2)+'%)';
				flr.appendChild(d);

				d = document.createElement("div");
				d.classList.add('list_deck_winrate');
				d.style.opacity = 0.6;
				d.innerHTML = 'Since last edit: '+(wr.lastEdit*100).toFixed(2)+'%';
				flr.appendChild(d);
			}

			div.appendChild(fll);
			fll.appendChild(tile);
			div.appendChild(flc);
			div.appendChild(flcf);
			flc.appendChild(flt);
			flc.appendChild(flb);
			div.appendChild(flr);
			mainDiv.appendChild(div);

			$('.'+deck.id).on('mouseenter', function() {
				$('.'+deck.id+'t').css('opacity', 1);
				$('.'+deck.id+'t').css('width', '200px');
			});

			$('.'+deck.id).on('mouseleave', function() {
				$('.'+deck.id+'t').css('opacity', 0.66);
				$('.'+deck.id+'t').css('width', '128px');
			});

			$('.'+deck.id).on('click', function() {
				open_deck(index, 0);
				$('.moving_ux').animate({'left': '-100%'}, 250, 'easeInOutCubic'); 
			});

		});
		$("#ux_0").append('<div class="list_fill"></div>');
	}
}

//
function updateExplore() {
	filterEvent = getEventId(document.getElementById("query_select").value);
	ipc_send('request_explore', filterEvent);
}

//
function setExplore(arg, loadMore) {
	document.body.style.cursor = "auto";
	if (arg != null) {
		explore = arg;
	}

	var mainDiv = document.getElementById("ux_0");
	var dateNow, d;

	mainDiv.classList.remove("flex_item");
	if (loadMore <= 0) {
		var loadExplore = 0;
		loadMore = 25;

		mainDiv.innerHTML = '';

		d = document.createElement("div");
		d.classList.add("list_fill");
		mainDiv.appendChild(d);// goes down

		// Search box
		var icd = $('<div class="input_container"></div>');
		var label = $('<label style="display: table; margin-top: 6px !important;">Filter by event</label>');
		label.appendTo(icd);
		
		var input = $('<div class="query_explore" style="margin-left: 16px;"></div>');
		var select = $('<select id="query_select"></select>');

		if (eventFilters == null) {
			eventFilters = [];
			eventFilters.push('All');

			dateNow = new Date();
			dateNow = dateNow.getTime()/1000;

			for (var i = 0; i < explore.length; i++) {
				var _deck = explore[i];

				var ss = Math.floor(dateNow - _deck.date);
				if (Math.floor(ss / 86400) > 10) {
					explore.splice(i, 1);
					i--;
				}
				else {
					let evId = getReadableEvent(_deck.event)//.replace(/[0-9]/g, ''); 
					if (!eventFilters.includes(evId)) {
						eventFilters.push(evId);
					}
				}
			}
		}
		eventFilters.sort(function(a, b){
			if(a < b) return -1;
			if(a > b) return 1;
			return 0;
		})
		for (let i=0; i < eventFilters.length; i++) {
			if (eventFilters[i] !== getReadableEvent(filterEvent)) {
				select.append('<option value="'+eventFilters[i]+'">'+eventFilters[i]+'</option>');
			}
		}
		select.appendTo(input);
		selectAdd(select, updateExplore);
		select.next('div.select-styled').text(getReadableEvent(filterEvent));

		input.appendTo(icd);
		icd.appendTo($("#ux_0"));

		d = document.createElement("div");
		d.classList.add("list_fill");
		mainDiv.appendChild(d);
		d = document.createElement("div");
		d.classList.add("list_fill");
		mainDiv.appendChild(d);
	}

	//explore.forEach(function(_deck, index) {
	var actuallyLoaded = 0;
	for (var loadEnd = loadExplore + loadMore; loadExplore < loadEnd; loadExplore++) {
		let _deck = explore[loadExplore];
		if (_deck == undefined) {
			continue;
		}

		let index = loadExplore;

		dateNow = new Date();
		dateNow = dateNow.getTime()/1000;
		let _ss = Math.floor(dateNow - _deck.date);
		if (Math.floor(_ss / 86400) > 10) {
			continue;
		}

		actuallyLoaded++;

		if (_deck.colors == undefined) {
			_deck.colors = [];
		}
		if (_deck.wins == undefined) {
			_deck.wins = 0;
			_deck.losses = 0;
		}

		var tileGrpid = _deck.tile;
		try {
			cardsDb.get(tileGrpid).set;
		}
		catch (e) {
			tileGrpid = 67003;
		}

		var tile = document.createElement("div");
		tile.classList.add(index+"t");
		tile.classList.add("deck_tile");

		try {
			tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";
		}
		catch (e) {
			console.error(e);
		}

		var div = document.createElement("div");
		div.classList.add(index);
		div.classList.add("list_deck");

		var fll = document.createElement("div");
		fll.classList.add("flex_item");

		var flc = document.createElement("div");
		flc.classList.add("flex_item");
		flc.style.flexDirection = "column";

		var flcf = document.createElement("div");
		flcf.classList.add("flex_item");
		flcf.style.flexGrow = 2;

		var flr = document.createElement("div");
		flr.classList.add("flex_item");
		flr.style.flexDirection = "column";

		var flt = document.createElement("div");
		flt.classList.add("flex_top");

		var flb = document.createElement("div");
		flb.classList.add("flex_bottom");

		d = document.createElement("div");
		d.classList.add("list_deck_name");
		d.innerHTML = _deck.deckname;
		flt.appendChild(d);

		d = document.createElement("div");
		d.classList.add("list_deck_name_it");
		d.innerHTML = "by "+_deck.player;
		flt.appendChild(d);
		
		_deck.colors.forEach(function(color) {
			var d = document.createElement("div");
			d.classList.add("mana_s20");
			d.classList.add("mana_"+mana[color]);
			flb.appendChild(d);
		});

		d = document.createElement("div");
		d.classList.add("list_deck_record");
		d.innerHTML = _deck.wins+' - '+_deck.losses;
		flr.appendChild(d);

		d = document.createElement("div");
		d.classList.add("list_deck_name_it");
		let ee = _deck.event;
		d.innerHTML = getReadableEvent(ee)+" - "+timeSince(new Date(_deck.date))+" ago";
		flr.appendChild(d);

		div.appendChild(fll);
		fll.appendChild(tile);
		div.appendChild(flc);
		div.appendChild(flcf);
		flc.appendChild(flt);
		flc.appendChild(flb);
		div.appendChild(flr);

		mainDiv.appendChild(div);

		$('.'+index).on('mouseenter', function() {
			$('.'+index+'t').css('opacity', 1);
			$('.'+index+'t').css('width', '200px');
		});

		$('.'+index).on('mouseleave', function() {
			$('.'+index+'t').css('opacity', 0.66);
			$('.'+index+'t').css('width', '128px');
		});

		$('.'+index).on('click', function() {
			open_course_request(_deck._id);
		});

	}

	if (loadMore == 0 && actuallyLoaded < 20) {
		setExplore(null, 50);
	}

	$(this).off();
	$("#ux_0").on('scroll', function() {
		if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
			setExplore(null, 20);
		}
	})
}

//
function open_course_request(courseId) {
	ipc_send('renderer_request_course', courseId);
}

// 
function open_deck(i, type) {
	var _deck;
	if (type == 0) {
		_deck = decks[i];
	}
	if (type == 1 || type == 2) {
		_deck = i;
	}
	currentOpenDeck = _deck;

	$("#ux_1").html('');

	let top = $('<div class="decklist_top"><div class="button back"></div><div class="deck_name">'+_deck.name+'</div></div>');
	let flr = $('<div class="deck_top_colors" style="align-self: center;"></div>');

	_deck.colors.forEach(function(color) {
		let m = $('<div class="mana_s20 mana_'+mana[color]+'"></div>');
		flr.append(m);
	});
	top.append(flr);

	let tileGrpid = _deck.deckTileId;
	if (cardsDb.get(tileGrpid)) {
		change_background("", tileGrpid);
	}
	let fld = $('<div class="flex_item"></div>');

	let dl = $('<div class="decklist"></div>');
	drawDeck(dl, _deck);
	var stats = $('<div class="stats"></div>');


	$('<div class="button_simple visualView">Visual View</div>').appendTo(stats);
	$('<div class="button_simple openHistory">History of changes</div>').appendTo(stats);
	$('<div class="button_simple exportDeck">Export to Arena</div>').appendTo(stats);
	$('<div class="button_simple exportDeckStandard">Export to .txt</div>').appendTo(stats);

	var types = get_deck_types_ammount(_deck);
	var typesdiv = $('<div class="types_container"></div>');
	$('<div class="type_icon_cont"><div title="Creatures" 		class="type_icon type_cre"></div><span>'+types.cre+'</span></div>').appendTo(typesdiv);
	$('<div class="type_icon_cont"><div title="Lands" 			class="type_icon type_lan"></div><span>'+types.lan+'</span></div>').appendTo(typesdiv);
	$('<div class="type_icon_cont"><div title="Instants" 		class="type_icon type_ins"></div><span>'+types.ins+'</span></div>').appendTo(typesdiv);
	$('<div class="type_icon_cont"><div title="Sorceries" 		class="type_icon type_sor"></div><span>'+types.sor+'</span></div>').appendTo(typesdiv);
	$('<div class="type_icon_cont"><div title="Enchantments" 	class="type_icon type_enc"></div><span>'+types.enc+'</span></div>').appendTo(typesdiv);
	$('<div class="type_icon_cont"><div title="Artifacts" 		class="type_icon type_art"></div><span>'+types.art+'</span></div>').appendTo(typesdiv);
	$('<div class="type_icon_cont"><div title="Planeswalkers" 	class="type_icon type_pla"></div><span>'+types.pla+'</span></div>').appendTo(typesdiv);
	typesdiv.appendTo(stats);

	var curvediv = $('<div class="mana_curve"></div>');
	var curve = get_deck_curve(_deck);

	var curveMax = 0;
	for (let i=0; i<curve.length; i++) {
		if (curve[i] == undefined) {
			curve[i] = 0;
		}
		if (curve[i] > curveMax) {
			curveMax = curve[i];
		}
	}

	for (let i=0; i<curve.length; i++) {
		curvediv.append($('<div class="mana_curve_column" style="height: '+(curve[i]/curveMax*100)+'%"></div>'))
	}
	curvediv.appendTo(stats);
	curvediv = $('<div class="mana_curve_numbers"></div>');
	for (let i=0; i<curve.length; i++) {
		curvediv.append($('<div class="mana_curve_column_number"><div style="margin: 0 auto !important" class="mana_s16 mana_'+i+'"></div></div>'))
	}
	curvediv.appendTo(stats);

	//var missing = get_deck_missing(_deck);
	var cont = $('<div class="pie_container_outer"></div>');

	// Deck colors
	var colorspie = get_deck_colors_ammount(_deck);
	var wp = colorspie.w / colorspie.total * 100;
	var up = wp+colorspie.u / colorspie.total * 100;
	var bp = up+colorspie.b / colorspie.total * 100;
	var rp = bp+colorspie.r / colorspie.total * 100;
	var gp = rp+colorspie.g / colorspie.total * 100;
	var cp = gp+colorspie.c / colorspie.total * 100;

	var gradient = new ConicGradient({
		stops: '#E7CA8E '+wp+'%, #AABEDF 0 '+up+'%, #A18E87 0 '+bp+'%, #DD8263 0 '+rp+'%, #B7C89E 0 '+gp+'%, #E3E3E3 0 '+cp+'%', // required
		size: 400 // Default: Math.max(innerWidth, innerHeight)
	});
	var piechart = $('<div class="pie_container"><span>Mana Symbols</span><svg class="pie">'+gradient.svg+'</svg></div>');
	piechart.appendTo(cont);

	// Lands colors
	colorspie = get_deck_lands_ammount(_deck);
	wp = colorspie.w / colorspie.total * 100;
	up = wp+colorspie.u / colorspie.total * 100;
	bp = up+colorspie.b / colorspie.total * 100;
	rp = bp+colorspie.r / colorspie.total * 100;
	gp = rp+colorspie.g / colorspie.total * 100;
	cp = gp+colorspie.c / colorspie.total * 100;

	gradient = new ConicGradient({
		stops: '#E7CA8E '+wp+'%, #AABEDF 0 '+up+'%, #A18E87 0 '+bp+'%, #DD8263 0 '+rp+'%, #B7C89E 0 '+gp+'%, #E3E3E3 0 '+cp+'%', // required
		size: 400 // Default: Math.max(innerWidth, innerHeight)
	});
	piechart = $('<div class="pie_container"><span>Mana Sources</span><svg class="pie">'+gradient.svg+'</svg></div>');
	piechart.appendTo(cont);

	cont.appendTo(stats);

	if (type == 0 || type == 2) {
		var wr = getDeckWinrate(_deck.id, _deck.lastUpdated);
		if (wr != 0) {
			//$('<span>w/l vs Color combinations</span>').appendTo(stats);
			curvediv = $('<div class="mana_curve"></div>');
			curve = get_deck_curve(_deck);

			curveMax = 0;
			for (let i=0; i<wr.colors.length; i++) {
				if (wr.colors[i].wins > curveMax) {
					curveMax = wr.colors[i].wins;
				}
				if (wr.colors[i].losses > curveMax) {
					curveMax = wr.colors[i].losses;
				}
			}

			for (let i=0; i<wr.colors.length; i++) {
				if (wr.colors[i].wins + wr.colors[i].losses > 2) {
					curvediv.append($('<div class="mana_curve_column back_green" style="height: '+(wr.colors[i].wins/curveMax*100)+'%"></div>'))
					curvediv.append($('<div class="mana_curve_column back_red" style="height: '+(wr.colors[i].losses/curveMax*100)+'%"></div>'))
				}
			}

			curvediv.appendTo(stats);
			curvediv = $('<div class="mana_curve_costs"></div>');
			for (let i=0; i<wr.colors.length; i++) {
				if (wr.colors[i].wins + wr.colors[i].losses > 2) {
					var cn = $('<div class="mana_curve_column_number">'+wr.colors[i].wins+'/'+wr.colors[i].losses+'</div>');
					cn.append($('<div style="margin: 0 auto !important" class=""></div>'));

					var colors = wr.colors[i].colors;
					colors.forEach(function(color) {
						cn.append($('<div style="margin: 0 auto !important" class="mana_s16 mana_'+mana[color]+'"></div>'));
					})
					curvediv.append(cn);
				}
			}
			curvediv.appendTo(stats);
		}
	}

	var missingWildcards = get_deck_missing(_deck);

	var cost = $('<div class="wildcards_cost"><span>Wildcards Needed</span></div>');

	var _c = $('<div class="wc_cost wc_common">'+missingWildcards.common+'</div>');
	_c.attr("title", "Common");
	_c.appendTo(cost);
	var _u = $('<div class="wc_cost wc_uncommon">'+missingWildcards.uncommon+'</div>');
	_u.appendTo(cost);
	_u.attr("title", "Uncommon");
	var _r = $('<div class="wc_cost wc_rare">'+missingWildcards.rare+'</div>');
	_r.appendTo(cost);
	_r.attr("title", "Rare");
	var _m = $('<div class="wc_cost wc_mythic">'+missingWildcards.mythic+'</div>');
	_m.appendTo(cost);
	_m.attr("title", "Mythic Rare");

	cost.appendTo(stats);

	dl.appendTo(fld);
	stats.appendTo(fld);
	$("#ux_1").append(top);
	$("#ux_1").append(fld);

	//
	$(".visualView").click(function () {
		drawDeckVisual(dl, stats, _deck);
	});

	//
	$(".openHistory").click(function () {
		ipc_send('get_deck_changes', _deck.id);
	});

	$(".exportDeck").click(function () {
		var list = get_deck_export(_deck);
		ipc_send('set_clipboard', list);
	});

	$(".exportDeckStandard").click(function () {
		var list = get_deck_export_txt(_deck);
		ipc_send('export_txt', {str: list, name: _deck.name});
	});

	$(".back").click(function () {
        change_background("default");
		$('.moving_ux').animate({'left': '0px'}, 250, 'easeInOutCubic'); 
	});
}

//
function drawDeck(div, deck) {
	var unique = makeId(4);
	div.html('');
	var prevIndex = 0;
	deck.mainDeck.forEach(function(card) {
		var grpId = card.id;
		var type = cardsDb.get(grpId).type;
		if (prevIndex == 0) {
			addCardSeparator(get_card_type_sort(type), div);
		}
		else if (prevIndex != 0) {
			if (get_card_type_sort(type) != get_card_type_sort(cardsDb.get(prevIndex).type)) {
				addCardSeparator(get_card_type_sort(type), div);
			}
		}

		if (card.quantity > 0) {
			addCardTile(grpId, unique+"a", card.quantity, div);
		}
		
		prevIndex = grpId;
	});

	if (deck.sideboard != undefined) {
		if (deck.sideboard.length > 0) {
			addCardSeparator(99, div);
			prevIndex = 0;
			deck.sideboard.forEach(function(card) {
				var grpId = card.id;
				//var type = cardsDb.get(grpId).type;
				if (card.quantity > 0) {
					addCardTile(grpId, unique+"b", card.quantity, div);
				}
			});
		}
	}
}

//
function drawDeckVisual(_div, _stats, deck) {
	// attempt at sorting visually.. 
	var newMainDeck = [];

	for (var cmc = 0; cmc < 21; cmc++) {
		for (var qq = 4; qq > -1; qq--) {
			deck.mainDeck.forEach(function(c) {
				var grpId = c.id;
				var card = cardsDb.get(grpId);
				var quantity;
				if (card.type.indexOf("Land") == -1 && grpId != 67306) {
					if (card.cmc == cmc) {
						quantity = c.quantity;

						if (quantity == qq) {
							newMainDeck.push(c);
						}
					}
				}
				else if (cmc == 20) {
					quantity = c.quantity;
					if (qq == 0 && quantity > 4) {
						newMainDeck.push(c);
					}
					if (quantity == qq) {
						newMainDeck.push(c);
					}
				}
			});
		}
	}

	var types = get_deck_types_ammount(deck);
	var typesdiv = $('<div class="types_container"></div>');
	$('<div class="type_icon_cont"><div title="Creatures" 		class="type_icon type_cre"></div><span>'+types.cre+'</span></div>').appendTo(typesdiv);
	$('<div class="type_icon_cont"><div title="Lands" 			class="type_icon type_lan"></div><span>'+types.lan+'</span></div>').appendTo(typesdiv);
	$('<div class="type_icon_cont"><div title="Instants" 		class="type_icon type_ins"></div><span>'+types.ins+'</span></div>').appendTo(typesdiv);
	$('<div class="type_icon_cont"><div title="Sorceries" 		class="type_icon type_sor"></div><span>'+types.sor+'</span></div>').appendTo(typesdiv);
	$('<div class="type_icon_cont"><div title="Enchantments" 	class="type_icon type_enc"></div><span>'+types.enc+'</span></div>').appendTo(typesdiv);
	$('<div class="type_icon_cont"><div title="Artifacts" 		class="type_icon type_art"></div><span>'+types.art+'</span></div>').appendTo(typesdiv);
	$('<div class="type_icon_cont"><div title="Planeswalkers" 	class="type_icon type_pla"></div><span>'+types.pla+'</span></div>').appendTo(typesdiv);
	typesdiv.prependTo(_div.parent());

	_stats.hide();
	_div.css("display", "flex");
	_div.css("width", "auto");
	_div.css("margin", "0 auto");
	_div.html('');

	_div.parent().css("flex-direction", "column");

	$('<div class="button_simple openDeck">Normal view</div>').appendTo(_div.parent());

	$(".openDeck").click(function () {
		open_deck(currentOpenDeck, 2);
	});

	var sz = cardSize;
	let div = $('<div class="visual_mainboard"></div>');
	div.css("display", "flex");
	div.css("flex-wrap", "wrap");
	div.css("align-content", "start");
	div.css("max-width", (sz+6)*5+"px");
	div.appendTo(_div);

	//var unique = makeId(4);
	//var prevIndex = 0;

	var tileNow;
	var _n = 0;
	newMainDeck.forEach(function(c) {
		var grpId = c.id;
		var card = cardsDb.get(grpId);

		if (c.quantity > 0) {
			let dfc = '';
			if (card.dfc == 'DFC_Back')	 dfc = 'a';
			if (card.dfc == 'DFC_Front') dfc = 'b';
			if (card.dfc == 'SplitHalf') dfc = 'a';
			if (dfc != 'b') {
				for (let i=0; i<c.quantity; i++) {
					if (_n % 4 == 0) {
						tileNow = $('<div class="deck_visual_tile"></div>');
						tileNow.appendTo(div);
					}

					let d = $('<div style="width: '+sz+'px !important;" class="deck_visual_card"></div>');
					let img = $('<img style="width: '+sz+'px !important;" class="deck_visual_card_img"></img>');

					img.attr("src", "https://img.scryfall.com/cards"+card.images[cardQuality]);
					img.appendTo(d);
					d.appendTo(tileNow);

					addCardHover(img, card);
					_n++;
				}
			}
		}
	});

	div = $('<div class="visual_sideboard"></div>');
	div.css("display", "flex");
	div.css("flex-wrap", "wrap");
	div.css("margin-left", "32px");
	div.css("align-content", "start");
	div.css("max-width", (sz+6)*1.5+"px");
	div.appendTo(_div);
	
	if (deck.sideboard != undefined) {
		tileNow = $('<div class="deck_visual_tile_side"></div>');
		tileNow.css("width", (sz+6)*5+"px");
		tileNow.appendTo(div);

		if (deck.sideboard.length == 0) {
			tileNow.css("display", "none");
		}

		_n = 0;
		deck.sideboard.forEach(function(c) {
			var grpId = c.id;
			var card = cardsDb.get(grpId);
			if (c.quantity > 0) {
				let dfc = '';
				if (card.dfc == 'DFC_Back')	 dfc = 'a';
				if (card.dfc == 'DFC_Front') dfc = 'b';
				if (card.dfc == 'SplitHalf') dfc = 'a';
				if (dfc != 'b') {
					for (let i=0; i<c.quantity; i++) {
						var d;
						if (_n % 2 == 1) {
							d = $('<div style="width: '+sz+'px !important;" class="deck_visual_card_side"></div>');
						}
						else {
							d = $('<div style="margin-left: 60px; width: '+sz+'px !important;" class="deck_visual_card_side"></div>');
						}
						let img = $('<img style="width: '+sz+'px !important;" class="deck_visual_card_img"></img>');
						img.attr("src", "https://img.scryfall.com/cards"+card.images[cardQuality]);
						//img.attr("src", "https://img.scryfall.com/cards/"+cardQuality+"/en/"+get_set_scryfall(card.set)+"/"+card.cid+dfc+".jpg");
						img.appendTo(d);
						d.appendTo(tileNow);

						addCardHover(img, card);
						_n++;
					}
				}
			}
		});
	}
}

//
function setChangesTimeline() {
	var cont = $(".stats");
	cont.html('');


	var time = $('<div class="changes_timeline"></div>')

	changes.sort(compare_changes);

	// CURRENT DECK
	let div = $('<div class="change"></div>');
	let butbox = $('<div class="change_button_cont" style="transform: scaleY(-1);"></div>');
	let button = $('<div class="change_button"></div>');
	button.appendTo(butbox);
	let datbox = $('<div class="change_data"></div>');

	// title
	let title = $('<div class="change_data_box"></div>');
	title.html('Current Deck');

	butbox.appendTo(div);
	datbox.appendTo(div);
	title.appendTo(datbox);
	div.appendTo(time);

	butbox.on('mouseenter', function() {
		button.css('width', '32px');
		button.css('height', '32px');
		button.css('top', 'calc(50% - 16px)');
	});

	butbox.on('mouseleave', function() {
		button.css('width', '24px');
		button.css('height', '24px');
		button.css('top', 'calc(50% - 12px)');
	});

	butbox.on('click', function() {
		var hasc = button.hasClass('change_button_active');

		$(".change_data_box_inside").each(function() {
			$(this).css('height', '0px');
		});

		$(".change_button").each(function() {
			$(this).removeClass('change_button_active');
		});

		if (!hasc) {
			button.addClass('change_button_active');
		}
	});
	//

	var cn = 0;
	changes.forEach(function(change) {
		change.changesMain.sort(compare_changes_inner);
		change.changesSide.sort(compare_changes_inner);

		let div = $('<div class="change"></div>');
		let butbox;
		if (cn < changes.length-1) {
			butbox = $('<div style="background-size: 100% 100% !important;" class="change_button_cont"></div>');
		}
		else {
			butbox = $('<div class="change_button_cont"></div>');
		}
		var button = $('<div class="change_button"></div>');
		button.appendTo(butbox);
		let datbox = $('<div class="change_data"></div>');

		// title
		let title = $('<div class="change_data_box"></div>');
		// inside
		let data  = $('<div class="change_data_box_inside"></div>');
		var innherH = 54;
		let nc = 0;
		if (change.changesMain.length > 0) {
			let dd = $('<div class="change_item_box"></div>');
			addCardSeparator(98, dd);
			dd.appendTo(data);
		}

		change.changesMain.forEach(function(c) {
			innherH += 30;
			if (c.quantity > 0)	nc += c.quantity;
			let dd = $('<div class="change_item_box"></div>');
			if (c.quantity > 0)	{
				let ic  = $('<div class="change_add"></div>');
				ic.appendTo(dd);
			}
			else {
				let ic  = $('<div class="change_remove"></div>');
				ic.appendTo(dd);
			}

			addCardTile(c.id, 'chm'+cn, Math.abs(c.quantity), dd);
			dd.appendTo(data);
		});

		if (change.changesSide.length > 0) {
			let dd = $('<div class="change_item_box"></div>');
			addCardSeparator(99, dd);
			innherH += 30;
			dd.appendTo(data);
		}

		change.changesSide.forEach(function(c) {
			innherH += 30;
			if (c.quantity > 0)	nc += c.quantity;
			let dd = $('<div class="change_item_box"></div>');
			if (c.quantity > 0)	{
				let ic  = $('<div class="change_add"></div>');
				ic.appendTo(dd);
			}
			else {
				let ic  = $('<div class="change_remove"></div>');
				ic.appendTo(dd);
			}

			addCardTile(c.id, 'chs'+cn, Math.abs(c.quantity), dd);
			dd.appendTo(data);
		});

		title.html(nc+' changes, '+timeSince(Date.parse(change.date))+' ago.');

		butbox.appendTo(div);
		datbox.appendTo(div);
		title.appendTo(datbox);
		data.appendTo(datbox);
		div.appendTo(time);

		butbox.on('mouseenter', function() {
			button.css('width', '32px');
			button.css('height', '32px');
			button.css('top', 'calc(50% - 16px)');
		});

		butbox.on('mouseleave', function() {
			button.css('width', '24px');
			button.css('height', '24px');
			button.css('top', 'calc(50% - 12px)');
		});

		butbox.on('click', function() {
			// This requires some UX indicators
			//drawDeck($('.decklist'), {mainDeck: change.previousMain, sideboard: change.previousSide});
			var hasc = button.hasClass('change_button_active');

			$(".change_data_box_inside").each(function() {
				$(this).css('height', '0px');
			});

			$(".change_button").each(function() {
				$(this).removeClass('change_button_active');
			});

			if (!hasc) {
				button.addClass('change_button_active');
				data.css('height', innherH+'px');
			}
		});

		cn++;
	})

	$('<div class="button_simple openDeck">View stats</div>').appendTo(cont);

	$(".openDeck").click(function () {
		open_deck(currentOpenDeck, 2);
	});
	time.appendTo(cont);
}

//
function open_draft(id, tileGrpid, set) {
	console.log("OPEN DRAFT", id, draftPosition)
	$("#ux_1").html('');
	var draft = matchesHistory[id];

	if (draftPosition < 1)	draftPosition = 1; 
	if (draftPosition > (packSize*6))	draftPosition = (packSize*6); 

	var packSize = 14;
	if (draft.set == "Guilds of Ravnica") {
		packSize = 15;
	}

	var pa = Math.floor( (draftPosition-1)/2 / packSize);
	var pi = Math.floor( ((draftPosition-1)/2) % packSize);
	var key = 'pack_'+pa+'pick_'+pi;

	var pack = draft[key].pack;
	var pick = draft[key].pick;

	var top = $('<div class="decklist_top"><div class="button back"></div><div class="deck_name">'+set+' Draft</div></div>');
	let flr = $('<div class="deck_top_colors"></div>');
	top.append(flr);

	if (cardsDb.get(tileGrpid)) {
		change_background("", tileGrpid);
	}

	var cont = $('<div class="flex_item" style="flex-direction: column;"></div>');
    cont.append('<div class="draft_nav_container"><div class="draft_nav_prev"></div><div class="draft_nav_next"></div></div>');

	$('<div class="draft_title">Pack '+(pa+1)+', Pick '+(pi+1)+'</div>').appendTo(cont);

	var slider = $('<div class="slidecontainer"></div>');
	slider.appendTo(cont);
	var sliderInput = $('<input type="range" min="1" max="'+packSize*6+'" value="'+draftPosition+'" class="slider" id="myRange">');
	sliderInput.appendTo(slider);


	var pd = $('<div class="draft_pack_container"></div>');
	pd.appendTo(cont);

	
	pack.forEach(function(grpId) {
        var d = $('<div style="width: '+cardSize+'px !important;" class="draft_card"></div>');
        var img = $('<img style="width: '+cardSize+'px !important;" class="draft_card_img"></img>');
        if (grpId == pick && draftPosition % 2 == 0) {
			img.addClass('draft_card_picked');
        }
        var card = cardsDb.get(grpId);
        img.attr("src", "https://img.scryfall.com/cards"+card.images[cardQuality]);

		img.appendTo(d);
        var r = $('<div style="" class="draft_card_rating">'+draftRanks[card.rank]+'</div>');
		r.appendTo(d);
		addCardHover(img, card);
		d.appendTo(pd);
	});


	$("#ux_1").append(top);
	$("#ux_1").append(cont);
	
	var qSel = document.querySelector("input");

	$(".draft_nav_prev").off();
	$(".draft_nav_next").off();
	$(".slider").off();

	$(".slider").on('click mousemove', function() {
		var pa = Math.floor( (qSel.value-1)/2 / packSize) ;
		var pi = Math.floor( ((qSel.value-1)/2) % packSize) ;
		$('.draft_title').html('Pack '+(pa+1)+', Pick '+(pi+1));
	});

	$(".slider").on('click mouseup', function() {
		draftPosition = parseInt(qSel.value);
		open_draft(id, tileGrpid, set);
	});
	
	$(".draft_nav_prev").on('click mouseup', function() {
		draftPosition -= 1;
		open_draft(id, tileGrpid, set);
	});

	$(".draft_nav_next").on('click mouseup', function() {
		draftPosition += 1;
		open_draft(id, tileGrpid, set);
	});
	//
	$(".back").click(function () {
		change_background("default");
		$('.moving_ux').animate({'left': '0px'}, 250, 'easeInOutCubic'); 
	});
}

function open_match(id) {
	$("#ux_1").html('');
	var match = matchesHistory[id];

	let top = $('<div class="decklist_top"><div class="button back"></div><div class="deck_name">'+match.playerDeck.name+'</div></div>');
	let flr = $('<div class="deck_top_colors"></div>');

	if (match.playerDeck.colors != undefined) {		
		match.playerDeck.colors.forEach(function(color) {
			var m = $('<div class="mana_s20 mana_'+mana[color]+'"></div>');
			flr.append(m);
		});
	}
	top.append(flr);

	var flc = $('<div class="flex_item" style="justify-content: space-evenly;"></div>');
	if (fs.existsSync(path.join(actionLogDir, id+'.txt'))) {
		$('<div class="button_simple openLog">Action log</div>').appendTo(flc);
	}

	var tileGrpid = match.playerDeck.deckTileId;
	if (cardsDb.get(tileGrpid)) {
		change_background("", tileGrpid);
	}
	var fld = $('<div class="flex_item"></div>');

	// this is a mess
	var flt = $('<div class="flex_item"></div>')
	var fltl = $('<div class="flex_item"></div>')
	var r = $('<div class="rank"></div>'); r.appendTo(fltl);

	var fltr = $('<div class="flex_item"></div>'); fltr.css("flex-direction","column");
	var fltrt = $('<div class="flex_top"></div>');
	var fltrb = $('<div class="flex_bottom"></div>');
	fltrt.appendTo(fltr); fltrb.appendTo(fltr);

	fltl.appendTo(flt); fltr.appendTo(flt);

	var rank = match.player.rank;
	var tier = match.player.tier;
	r.css("background-position", (get_rank_index(rank, tier)*-48)+"px 0px").attr("title", rank+" "+tier);

	var name = $('<div class="list_match_player_left">'+match.player.name.slice(0, -6)+' ('+match.player.win+')</div>');
	name.appendTo(fltrt);

	if (match.player.win > match.opponent.win) {
		var w = $('<div class="list_match_player_left green">Winner</div>');
		w.appendTo(fltrb);
	}

	var dl = $('<div class="decklist"></div>');
	flt.appendTo(dl);

	drawDeck(dl, match.playerDeck);

	$('<div class="button_simple centered exportDeckPlayer">Export to Arena</div>').appendTo(dl);
	$('<div class="button_simple centered exportDeckStandardPlayer">Export to .txt</div>').appendTo(dl);

	flt = $('<div class="flex_item" style="flex-direction: row-reverse;"></div>')
	fltl = $('<div class="flex_item"></div>')
	r = $('<div class="rank"></div>'); r.appendTo(fltl);

	fltr = $('<div class="flex_item"></div>'); fltr.css("flex-direction","column"); fltr.css("align-items","flex-end");
	fltrt = $('<div class="flex_top"></div>');
	fltrb = $('<div class="flex_bottom"></div>');
	fltrt.appendTo(fltr); fltrb.appendTo(fltr);

	fltl.appendTo(flt);fltr.appendTo(flt);

	rank = match.opponent.rank;
	tier = match.opponent.tier;
	r.css("background-position", (get_rank_index(rank, tier)*-48)+"px 0px").attr("title", rank+" "+tier);

	name = $('<div class="list_match_player_right">'+match.opponent.name.slice(0, -6)+' ('+match.opponent.win+')</div>');
	name.appendTo(fltrt);

	if (match.player.win < match.opponent.win) {
		w = $('<div class="list_match_player_right green">Winner</div>');
		w.appendTo(fltrb);
	}

	var odl = $('<div class="decklist"></div>');
	flt.appendTo(odl);

	match.oppDeck.mainDeck.sort(compare_cards);
	match.oppDeck.sideboard.sort(compare_cards);
	match.oppDeck.mainDeck.forEach(function(c) {
		c.quantity = 9999;
	});
	match.oppDeck.sideboard.forEach(function(c) {
		c.quantity = 9999;
	});
	drawDeck(odl, match.oppDeck);

	$('<div class="button_simple centered exportDeck">Export to Arena</div>').appendTo(odl);
	$('<div class="button_simple centered exportDeckStandard">Export to .txt</div>').appendTo(odl);

	dl.appendTo(fld);
	odl.appendTo(fld);
	$("#ux_1").append(top);
	$("#ux_1").append(flc);
	$("#ux_1").append(fld);
	
	$(".openLog").click(function() {
		shell.openItem(path.join(actionLogDir, id+'.txt'));
	});

	$(".exportDeckPlayer").click(function () {
		var list = get_deck_export(match.playerDeck);
		ipc_send('set_clipboard', list);
	});
	$(".exportDeckStandardPlayer").click(function () {
		var list = get_deck_export_txt(match.playerDeck);
		ipc_send('export_txt', {str: list, name: match.playerDeck.name});
	});

	$(".exportDeck").click(function () {
		var list = get_deck_export(match.oppDeck);
		ipc_send('set_clipboard', list);
	});
	$(".exportDeckStandard").click(function () {
		var list = get_deck_export_txt(match.oppDeck);
		ipc_send('export_txt', {str: list, name: match.opponent.name.slice(0, -6)+"'s deck"});
	});

	$(".back").click(function () {
		change_background("default");
		$('.moving_ux').animate({'left': '0px'}, 250, 'easeInOutCubic'); 
	});

}

//
function open_cards() {
	$("#ux_0").html('');
	$("#ux_1").html('');
	$("#ux_0").removeClass("flex_item");
	var div = $('<div class="inventory"></div>');
	
	var basicFilters = $('<div class="inventory_filters_basic"></div>');
	var flex = $('<div class="inventory_flex"></div>');

	var icd = $('<div class="input_container"></div>');
	var label = $('<label style="display: table">Search</label>');
	label.appendTo(icd);
	var input = $('<input type="search" id="query_name" autocomplete="off" />');
	input.appendTo(icd);
	icd.appendTo(flex);

	input.keypress(function(e) {
		if (e.which == 13) {
			printCards();
		}
	});

	var searchButton = $('<div class="button_simple button_thin" onClick="printCards()">Search</div>');	
	searchButton.appendTo(flex);
	var advancedButton = $('<div class="button_simple button_thin" onClick="expandFilters()">Advanced filters</div>');
	advancedButton.appendTo(flex);

	flex.appendTo(basicFilters);

	flex = $('<div class="inventory_flex"></div>');

	var select = $('<select id="query_select">'+sortingAlgorithm+'</select>');
	var sortby = ['Set', 'Name', 'Rarity', 'CMC'];
	for (var i=0; i < sortby.length; i++) {
		select.append('<option value="'+sortby[i]+'">'+sortby[i]+'</option>');
	}
	select.appendTo(flex);
	selectAdd(select, sortCollection);

	var exp   = $('<div class="button_simple button_thin" onClick="exportCollection()">Export Collection</div>');
	exp.appendTo(flex);
	var reset = $('<div class="button_simple button_thin" onClick="resetFilters()">Reset</div>');
	reset.appendTo(flex);
	var stats = $('<div class="button_simple button_thin stats_button" onClick="printStats()">Collection Stats</div>');
	stats.appendTo(flex);

	flex.appendTo(basicFilters);


	// "ADVANCED" FILTERS
	var filters = $('<div class="inventory_filters"></div>');

	flex = $('<div class="inventory_flex"></div>');

	icd = $('<div style="padding-bottom: 8px;" class="input_container"></div>');
	label = $('<label style="display: table">Type line</label>');
	label.appendTo(icd);
	var typeInput = $('<input type="search" id="query_type" autocomplete="off" />');
	typeInput.appendTo(icd);
	icd.appendTo(flex);
	flex.appendTo(filters);

	var sets = $('<div class="sets_container"><label>Filter by set:</label></div>');
	for (let set in setsList) {
		let setbutton = $('<div class="set_filter set_filter_on" style="background-image: url(../images/sets/'+setsList[set].code+'.png)" title="'+set+'"></div>');
		setbutton.appendTo(sets);
		setbutton.click(function() {
			if (setbutton.hasClass('set_filter_on')) {
				setbutton.removeClass('set_filter_on');
				filteredSets.push(set);
			}
			else {
				setbutton.addClass('set_filter_on');
				let n = filteredSets.indexOf(set);
				if (n > -1) {
					filteredSets.splice(n, 1);
				}
			}
		});
	}
	sets.appendTo(filters);

	var manas = $('<div class="sets_container"><label>Filter by color:</label></div>');
	var ms = ["w", "u", "b", "r", "g"];
	ms.forEach(function(s, i) {
		var mi = [1, 2, 3, 4, 5];
		var manabutton = $('<div class="mana_filter mana_filter_on" style="background-image: url(../images/'+s+'20.png)"></div>');
		manabutton.appendTo(manas);
		manabutton.click(function() {
			if (manabutton.hasClass('mana_filter_on')) {
				manabutton.removeClass('mana_filter_on');
				filteredMana.push(mi[i]);
			}
			else {
				manabutton.addClass('mana_filter_on');
				let n = filteredMana.indexOf(mi[i]);
				if (n > -1) {
					filteredMana.splice(n, 1);
				}
			}
		});
	});
	manas.appendTo(filters);

	var cont = $('<div class="buttons_container"></div>');
	add_checkbox_search(cont, 'Show unowned', 'query_unown', false);
	add_checkbox_search(cont, 'Newly acquired only', 'query_new', false);
	add_checkbox_search(cont, 'Require multicolored', 'query_multicolor', false);
	add_checkbox_search(cont, 'Exclude unselected colors', 'query_exclude', false);
	cont.appendTo(filters);

	cont = $('<div class="buttons_container"></div>');
	add_checkbox_search(cont, 'Common', 'query_common', true);
	add_checkbox_search(cont, 'Uncommon', 'query_uncommon', true);
	add_checkbox_search(cont, 'Rare', 'query_rare', true);
	add_checkbox_search(cont, 'Mythic Rare', 'query_mythic', true);
	cont.appendTo(filters);
	
	cont = $('<div class="buttons_container"></div>');

	icd = $('<div class="input_container auto_width"></div>');
	label = $('<label style="display: table">CMC:</label>');
	label.appendTo(icd);
	input = $('<input type="number" id="query_cmc" autocomplete="off" />');
	input.appendTo(icd);
	icd.appendTo(cont);

	add_checkbox_search(cont, 'Lower than', 'query_cmclower', false);
	add_checkbox_search(cont, 'Equal to', 'query_cmcequal', true);
	add_checkbox_search(cont, 'Higher than', 'query_cmchigher', false);
	
	cont.appendTo(filters);
	
	$("#ux_0").append(basicFilters);
	$("#ux_0").append(filters);
	$("#ux_0").append(div);


    $('#query_cmclower').change(function() {
        if (document.getElementById("query_cmclower").checked == true) {
            document.getElementById("query_cmchigher").checked = false;
        }
    });

    $('#query_cmchigher').change(function() {
        if (document.getElementById("query_cmchigher").checked == true) {
            document.getElementById("query_cmclower").checked = false;
        }
    });

	//let filterCmcLower 	= document.getElementById("query_cmclower");
	//let filterCmcEqual 	= document.getElementById("query_cmcequal");
	//let filterCmcHigher = document.getElementById("query_cmchigher");

	printCards();
}

//
function add_checkbox_search(div, label, iid, def) {
	label = $('<label class="check_container hover_label">'+label+'</label>');
	var check_new = $('<input type="checkbox" id="'+iid+'" />');
	check_new.appendTo(label);
	check_new.prop('checked', def);

	var span = $('<span class="checkmark"></span>');
	span.appendTo(label);
	label.appendTo(div);
}

function expandFilters() {
	var div = $('.inventory_filters');
	if (div.css('opacity') == 1) {
		div.css('height', '0px');
		div.css('opacity', 0);
		$('.inventory').show();

	}
	else {
		div.css('height', 'calc(100% - 122px)');
		div.css('opacity', 1);
		setTimeout(function() {
			$('.inventory').hide();
		}, 200);
	}
}

function resetFilters() {
	filteredSets = [];
	filteredMana = [];
	
	$(".set_filter").each(function(  ) {
		$( this ).removeClass('set_filter_on');
		$( this ).addClass('set_filter_on');
	});
	$(".mana_filter").each(function(  ) {
		$( this ).removeClass('mana_filter_on');
		$( this ).addClass('mana_filter_on');
	});

	document.getElementById("query_name").value = "";
	document.getElementById("query_type").value = "";
	document.getElementById("query_unown").checked = false;
	document.getElementById("query_new").checked = false;
	document.getElementById("query_multicolor").checked = false;
	document.getElementById("query_exclude").checked = false;

	document.getElementById("query_common").checked = true;
	document.getElementById("query_uncommon").checked = true;
	document.getElementById("query_rare").checked = true;
	document.getElementById("query_mythic").checked = true;

	document.getElementById("query_cmc").value = "";
	document.getElementById("query_cmclower").checked = false;
	document.getElementById("query_cmcequal").checked = true;
	document.getElementById("query_cmchigher").checked = false;

	printCards();
}

//
/* eslint-disable */
function exportCollection() {
	var list = get_collection_export();
	ipc_send('export_csvtxt', {str: list, name: "collection"});
}

//
function printStats() {
	$('.moving_ux').animate({ 'left': '-100%' }, 250, 'easeInOutCubic');
	$("#ux_1").html('');
	const stats = get_collection_stats();

	const top = $('<div class="decklist_top"><div class="button back"></div><div class="deck_name">Collection Statistics</div><div class="deck_top_colors"></div></div>');
	change_background("", 67574);

	const flex = $('<div class="flex_item"></div>');
	const mainstats = $('<div class="main_stats"></div>');

	$('<label>Sets Completion</label>').appendTo(mainstats);

	// each set stats
	for (let set in setsList) {
		renderSetStats(stats[set], setsList[set].code, set).appendTo(mainstats);
	}

	// Complete collection sats
	renderSetStats(stats.complete, "pw", "Complete collection").appendTo(mainstats);

	// Singleton collection sats
	renderSetStats(stats.singles, "pw", "Singles").appendTo(mainstats);

	const substats = $('<div class="main_stats sub_stats"></div>');

	flex.append(mainstats);
	flex.append(substats);

	$("#ux_1").append(top);
	$("#ux_1").append(flex);
	//
	$(".back").click(function () {
		change_background("default");
		$('.moving_ux').animate({ 'left': '0px' }, 250, 'easeInOutCubic');
	});
}
/* eslint-enable */

//
function renderSetStats(setStats, setIconCode, setName) {
	const setDiv = renderCompletionDiv(setStats.all, 'sets/' + setIconCode + '.png', setName);

	setDiv.click(function () {
		const substats = $(".sub_stats");
		substats.html('');
		$('<label>' + setName + ' completion</label>').appendTo(substats);
		["common", "uncommon", "rare", "mythic"].forEach(rarity => {
			const countStats = setStats[rarity];
			if (countStats.total > 0) {
				const capitalizedRarity = rarity[0].toUpperCase() + rarity.slice(1) + 's';
				renderCompletionDiv(countStats, 'wc_' + rarity + '.png', capitalizedRarity).appendTo(substats);
			}
		});
	});

	return setDiv;
}

//
function renderCompletionDiv(countStats, image, title) {
	const completionDiv = $('<div class="stats_set_completion"></div>');
	$('<div class="stats_set_icon" style="background-image: url(../images/' + image + ')"><span>' + title + ' <i>(' + countStats.owned + '/' + countStats.total + ', ' + Math.round(countStats.percentage) + '%)</i></span></div>')
		.appendTo(completionDiv);
	$('<div class="stats_set_bar" style="width: ' + countStats.percentage + '%"></div>')
		.appendTo(completionDiv);
	return completionDiv;
}

function sortCollection(alg) {
	sortingAlgorithm = alg;
	printCards();
}

//
function printCards() {
	var div = $('.inventory_filters');
	div.css('height', '0px');
	div.css('opacity', 0);
	$('.inventory').show();

	div = $(".inventory");
	div.html('');

	var paging = $('<div class="paging_container"></div>');
	div.append(paging);

	let filterName  	= document.getElementById("query_name").value.toLowerCase();
	let filterType  	= document.getElementById("query_type").value.toLowerCase();
	let filterUnown		= document.getElementById("query_unown").checked;
	let filterNew   	= document.getElementById("query_new");
	let filterMulti 	= document.getElementById("query_multicolor");
	let filterExclude 	= document.getElementById("query_exclude");
 
	let filterCommon 	= document.getElementById("query_common");
	let filterUncommon 	= document.getElementById("query_uncommon");
	let filterRare 		= document.getElementById("query_rare");
	let filterMythic 	= document.getElementById("query_mythic");
 
	let filterCMC  		= document.getElementById("query_cmc").value;
	let filterCmcLower 	= document.getElementById("query_cmclower").checked;
	let filterCmcEqual 	= document.getElementById("query_cmcequal").checked;
	let filterCmcHigher = document.getElementById("query_cmchigher").checked;

	var totalCards = 0;
	var list;
	if (filterUnown) {
		list = cardsDb.getAll();
		delete list.abilities;
		delete list.events;
		delete list.sets;
		delete list.ok;
	}
	else {
		list = cards;
	}
	
	var keysSorted;
	if (sortingAlgorithm == 'Set')
		keysSorted = Object.keys(list).sort( collectionSortSet );
	if (sortingAlgorithm == 'Name')
		keysSorted = Object.keys(list).sort( collectionSortName );
	if (sortingAlgorithm == 'Rarity')
		keysSorted = Object.keys(list).sort( collectionSortRarity );
	if (sortingAlgorithm == 'CMC')
		keysSorted = Object.keys(list).sort( collectionSortCmc );

    for (n=0; n<keysSorted.length; n++) {
		let key = keysSorted[n];
	
		let grpId = key;
		let card = cardsDb.get(grpId);
		let doDraw = true;

		let name = card.name.toLowerCase();
		let type = card.type.toLowerCase();
		let rarity = card.rarity;
		let cost = card.cost;
		let cmc = card.cmc;
		let set  = card.set;

		if (card.images == undefined) 	continue;

		// Filter name
		var arr;
		arr = filterName.split(" ");
		arr.forEach(function(s) {
			if (name.indexOf(s) == -1) {
				doDraw = false;
			}
		})

		// filter type
		arr = filterType.split(" ");
		arr.forEach(function(s) {
			if (type.indexOf(s) == -1) {
				doDraw = false;
			}
		})

		if (filterNew.checked && cardsNew[key] == undefined) {
			doDraw = false;
		}

		if (filteredSets.length > 0) {
		if (!filteredSets.includes(set)) {
			doDraw = false;
		}
		}

		if (filterCMC && doDraw) {
			if (filterCmcLower && filterCmcEqual) {
				if (cmc > filterCMC) {
					doDraw = false;
				}
			}
			else if (filterCmcHigher && filterCmcEqual) {
				if (cmc < filterCMC) {
					doDraw = false;
				}
			}
			else if (filterCmcLower && !filterCmcEqual) {
				if (cmc >= filterCMC) {
					doDraw = false;
				}
			}
			else if (filterCmcHigher && !filterCmcEqual) {
				if (cmc <= filterCMC) {
					doDraw = false;
				}
			}
			else if (!filterCmcHigher && !filterCmcLower && filterCmcEqual) {
				if (cmc != filterCMC) {
					doDraw = false;
				}
			}
		}

		switch (rarity) {
			case 'land':
				if (!filterCommon.checked) 		doDraw = false; break;
			case 'common':
				if (!filterCommon.checked) 		doDraw = false; break;
			case 'uncommon':
				if (!filterUncommon.checked) 	doDraw = false; break;
			case 'rare':
				if (!filterRare.checked) 		doDraw = false; break;
			case 'mythic':
				if (!filterMythic.checked) 		doDraw = false; break;
			default:
				doDraw = false;
				break;
		}

		if (filterExclude.checked && cost.length == 0) {
			doDraw = false;
		}
		else {
			let s = [];
			let generic = false;
			cost.forEach(function(m) {
				if (m.indexOf('w') !== -1) {
					if (filterExclude.checked && !filteredMana.includes(1)) {
						doDraw = false;
					}
					s[1] = 1;
				}
				if (m.indexOf('u') !== -1) {
					if (filterExclude.checked && !filteredMana.includes(2)) {
						doDraw = false;
					}
					s[2] = 1;
				}
				if (m.indexOf('b') !== -1) {
					if (filterExclude.checked && !filteredMana.includes(3)) {
						doDraw = false;
					}
					s[3] = 1;
				}
				if (m.indexOf('r') !== -1) {
					if (filterExclude.checked && !filteredMana.includes(4)) {
						doDraw = false;
					}
					s[4] = 1;
				}
				if (m.indexOf('g') !== -1) {
					if (filterExclude.checked && !filteredMana.includes(5)) {
						doDraw = false;
					}
					s[5] = 1;
				}
				if (parseInt(m) > 0) {
					generic = true;
				}
				/*
				if (m.color < 6 && m.color > 0) {
					s[m.color] = 1;
					if (filterExclude.checked && !filteredMana.includes(m.color)) {
						doDraw = false;
					}
				}
				if (m.color > 6) {
					generic = true;
				}
				*/
			});
			let ms = s.reduce((a, b) => a + b, 0);
			if ((generic && ms == 0) && filterExclude.checked) {
				doDraw = false;
			}
			if (filteredMana.length > 0) {
				let su = 0;
				filteredMana.forEach( function(m) {
					if (s[m] == 1) {
						su ++;
					}
				});
				if (su == 0) {
					doDraw = false;
				}
			}
			if (filterMulti.checked && ms < 2) {
				doDraw = false;
			}
		}

		if (doDraw) {
			totalCards++;
		}

		if (totalCards < collectionPage*100 || totalCards > collectionPage*100+99) {
			doDraw = false;
		}

		let dfc = '';

		if (card.dfc == 'DFC_Back')	 dfc = 'a';
		if (card.dfc == 'DFC_Front') dfc = 'b';
		if (card.dfc == 'SplitHalf') {
			dfc = 'a';
			if (card.dfcId != 0)	dfc = 'b';
		}
		if (dfc == 'b') {
			doDraw = false;
		}

		if (doDraw) {
			var d = $('<div style="width: '+cardSize+'px !important;" class="inventory_card"></div>');

			for (let i=0; i<4; i++) {
				if (cardsNew[key] != undefined && i < cardsNew[key]) {
					$('<div style="width: '+cardSize/4+'px;" class="inventory_card_quantity_orange"></div>').appendTo(d);
				}
				else if (i < cards[key]) {
					$('<div style="width: '+cardSize/4+'px;" class="inventory_card_quantity_green"></div>').appendTo(d);
				}
				else {
					$('<div style="width: '+cardSize/4+'px;" class="inventory_card_quantity_gray"></div>').appendTo(d);
				}
			}

			var img = $('<img style="width: '+cardSize+'px !important;" class="inventory_card_img"></img>');
			img.attr("src", "https://img.scryfall.com/cards"+card.images[cardQuality]);
			img.appendTo(d);

			addCardHover(img, card);

			img.on('click', function() {
				if (cardsDb.get(grpId).dfc == 'SplitHalf')	{
					card = cardsDb.get(card.dfcId);
				}
				//let newname = card.name.split(' ').join('-');
				shell.openExternal('https://scryfall.com/card/'+get_set_scryfall(card.set)+'/'+card.cid+'/'+card.name);
			});

			d.appendTo(div);
		}
    }

	var paging_bottom = $('<div class="paging_container"></div>');
	div.append(paging_bottom);
	var but;
	if (collectionPage <= 0) {
		but = $('<div class="paging_button_disabled"> \< </div>');
	}
	else {
		but = $('<div class="paging_button" onClick="setCollectionPage('+(collectionPage-1)+')"> \< </div>');
	}

	paging.append(but);
	paging_bottom.append(but.clone());

	var totalPages = Math.ceil(totalCards / 100);
	for (var n=0; n<totalPages; n++) {
		but = $('<div class="paging_button" onClick="setCollectionPage('+(n)+')">'+n+'</div>');
		if (collectionPage == n) {
			but.addClass("paging_active");
		}
		paging.append(but);
		paging_bottom.append(but.clone());
	}
	if (collectionPage >= totalPages-1) {
		but = $('<div class="paging_button_disabled"></div>');
	}
	else {
		but = $('<div class="paging_button" onClick="setCollectionPage('+(collectionPage+1)+')"></div>');
	}
	paging.append(but);
	paging_bottom.append(but.clone());
}


//
/* eslint-disable */
function setCollectionPage(page) {
	collectionPage = page;
	printCards();
}
/* eslint-enable */

//
function add_checkbox(div, label, iid, def) {
	label = $('<label class="check_container hover_label">'+label+'</label>');
	label.appendTo(div);
	var check_new = $('<input type="checkbox" id="'+iid+'" onclick="updateSettings()" />');
	check_new.appendTo(label);
	check_new.prop('checked', def);

	var span = $('<span class="checkmark"></span>');
	span.appendTo(label);
}

//
function open_settings(openSection) {
	lastSettingsSection = openSection;
    change_background("default");
	$("#ux_0").off();
	$("#history_column").off();
	$("#ux_0").html('');
	$("#ux_0").addClass('flex_item');

	var wrap_l = $('<div class="wrapper_column sidebar_column_r"></div>');
	$('<div class="settings_nav sn1" style="margin-top: 28px;" >Behaviour</div>').appendTo(wrap_l);
	$('<div class="settings_nav sn2">Overlay</div>').appendTo(wrap_l);
	$('<div class="settings_nav sn3">Visual</div>').appendTo(wrap_l);
	$('<div class="settings_nav sn4">Privacy</div>').appendTo(wrap_l);
	$('<div class="settings_nav sn5">About</div>').appendTo(wrap_l);

	if (offlineMode) {
		$('<div class="settings_nav sn6">Login</div>').appendTo(wrap_l);
	}
	else {
		$('<div class="settings_nav sn6">Logout</div>').appendTo(wrap_l);
	}

	var wrap_r = $('<div class="wrapper_column"></div>');
	var div = $('<div class="settings_page"></div>');
	var section;

	//
	section = $('<div class="settings_section ss1"></div>');
	section.appendTo(div);
	section.append('<div class="settings_title">Behaviour</div>');
	
	add_checkbox(section, 'Launch on startup', 'settings_startup', settings.startup);
	add_checkbox(section, 'Close main window on match found', 'settings_closeonmatch', settings.close_on_match);
	add_checkbox(section, 'Close to tray', 'settings_closetotray', settings.close_to_tray);
	add_checkbox(section, 'Sound when priority changes', 'settings_soundpriority', settings.sound_priority);


    var label = $('<label class="but_container_label">Export Format:</label>');
    label.appendTo(section);
    var icd = $('<div class="input_container"></div>');
    var export_input = $('<input type="search" id="settings_export_format" autocomplete="off" value="'+settings.export_format+'" />');
    export_input.appendTo(icd);
    icd.appendTo(label);

    section.append('<label style="color: rgba(250, 229, 210, 0.75); font-size: 14px; margin-left: 16px;"><i>Possible variables: $Name, $Count, $SetName, $SetCode, $Collector, $Rarity, $Type, $Cmc</i></label>');
    

	section = $('<div class="settings_section ss2"></div>');
	section.appendTo(div);
	section.append('<div class="settings_title">Overlay</div>');
	
	add_checkbox(section, 'Always on top', 'settings_overlay_ontop', settings.overlay_ontop);
	add_checkbox(section, 'Show overlay', 'settings_showoverlay', settings.show_overlay);
	add_checkbox(section, 'Persistent overlay <i>(useful for OBS setup)</i>', 'settings_showoverlayalways', settings.show_overlay_always);

	add_checkbox(section, 'Show top bar', 'settings_overlay_top', settings.overlay_top);
	add_checkbox(section, 'Show title', 'settings_overlay_title', settings.overlay_title);
	add_checkbox(section, 'Show deck/lists', 'settings_overlay_deck', settings.overlay_deck);
	add_checkbox(section, 'Show clock', 'settings_overlay_clock', settings.overlay_clock);
	add_checkbox(section, 'Show sideboard', 'settings_overlay_sideboard', settings.overlay_sideboard);

	var sliderOpacity = $('<div class="slidecontainer_settings"></div>');
	sliderOpacity.appendTo(section);
	var sliderOpacityLabel = $('<label style="width: 400px; !important" class="card_size_container">Elements transparency: '+transparencyFromAlpha(overlayAlpha)+'%</label>');
	sliderOpacityLabel.appendTo(sliderOpacity);
	var sliderOpacityInput = $('<input type="range" min="0" max="100" step="5" value="'+transparencyFromAlpha(overlayAlpha)+'" class="slider sliderB" id="opacityRange">');
	sliderOpacityInput.appendTo(sliderOpacity);

	var sliderOpacityBack = $('<div class="slidecontainer_settings"></div>');
	sliderOpacityBack.appendTo(section);
	var sliderOpacityBackLabel = $('<label style="width: 400px; !important" class="card_size_container">Background transparency: '+transparencyFromAlpha(overlayAlphaBack)+'%</label>');
	sliderOpacityBackLabel.appendTo(sliderOpacityBack);
	var sliderOpacityBackInput = $('<input type="range" min="0" max="100" step="5" value="'+transparencyFromAlpha(overlayAlphaBack)+'" class="slider sliderC" id="opacityBackRange">');
	sliderOpacityBackInput.appendTo(sliderOpacityBack);

	//
	section = $('<div class="settings_section ss3"></div>');
	section.appendTo(div);
	section.append('<div class="settings_title">Visual</div>');

    label = $('<label class="but_container_label">Background URL:</label>');
    label.appendTo(section);

    icd = $('<div class="input_container"></div>');
    var url_input = $('<input type="search" id="query_image" autocomplete="off" value="'+settings.back_url+'" />');
    url_input.appendTo(icd);
    icd.appendTo(label);

    label = $('<label class="but_container_label">Background shade:</label>');
    var colorPick = $('<input type="text" id="flat" class="color_picker" />');
    colorPick.appendTo(label);
    label.appendTo(section);
    colorPick.spectrum({
        showInitial: true,
        showAlpha: true,
        showButtons: false
    });
    colorPick.spectrum("set", settings.back_color);

    colorPick.on('move.spectrum', function(e, color) {
        $('.main_wrapper').css('background-color', color.toRgbString());
        updateSettings();
    });

	label = $('<label class="but_container_label">Cards quality:</label>');
	label.appendTo(section);
	var button = $('<div class="button_simple button_long" style="margin-left: 32px;" onclick="changeQuality(this)">'+cardQuality+'</div>');
	button.appendTo(label);

	var slider = $('<div class="slidecontainer_settings"></div>');
	slider.appendTo(section);
	var sliderlabel = $('<label style="width: 400px; !important" class="card_size_container">Cards size: '+cardSize+'px</label>');
	sliderlabel.appendTo(slider);
	var sliderInput = $('<input type="range" min="0" max="20" value="'+cardSizePos+'" class="slider sliderA" id="myRange">');
	sliderInput.appendTo(slider);

	var d = $('<div style="width: '+cardSize+'px; !important" class="inventory_card_settings"></div>');
	var img = $('<img style="width: '+cardSize+'px; !important" class="inventory_card_settings_img"></img>');
	
	var card = cardsDb.get(67518);
	img.attr("src", "https://img.scryfall.com/cards"+card.images[cardQuality]);
	img.appendTo(d);

	d.appendTo(slider);

	//
	section = $('<div class="settings_section ss4"></div>');
	section.appendTo(div);
	section.append('<div class="settings_title">Privacy</div>');
	add_checkbox(section, 'Anonymous sharing <i>(makes your username anonymous on Explore)</i>', 'settings_anon_explore', settings.anon_explore);
	add_checkbox(section, 'Online sharing <i>(when disabled, blocks any connections with our servers)</i>', 'settings_senddata', settings.send_data);

	label = $('<label class="check_container_but"></label>');
	label.appendTo(section);
	button = $('<div class="button_simple button_long" onclick="eraseData()">Erase my shared data</div>');
	button.appendTo(label);

	//
	section = $('<div class="settings_section ss5" style="height: 100%;"></div>');
	section.appendTo(div);
	//section.append('<div class="settings_title">About</div>');

	var about = $('<div class="about"></div>');
	about.append('<div class="top_logo_about"></div>');
	about.append('<div class="message_sub_15 white">By Manuel Etchegaray, 2018</div>');
	about.append('<div class="message_sub_15 white">Version '+remote.app.getVersion()+'</div>');

	if (updateState.state == 0) {
		about.append('<div class="message_updates white">Checking for updates..</div>');
	}
	if (updateState.state == 1) {
		about.append('<div class="message_updates green">Update available.</div>');
		about.append('<a class="release_notes_link">Release Notes</a>');
	}
	if (updateState.state == -1) {
		about.append('<div class="message_updates green">Client is up to date.</div>');
	}
	if (updateState.state == -2) {
		about.append('<div class="message_updates red">Error updating.</div>');
	}
	if (updateState.state == 2) {
		about.append('<div class="message_updates green">Donwloading ('+updateState.progress+'%)</div>');
		about.append('<a class="release_notes_link">Release Notes</a>');
	}
	if (updateState.state == 3) {
		about.append('<div class="message_updates green">Download complete.</div>');
		about.append('<a class="release_notes_link">Release Notes</a>');
		about.append('<div class="button_simple" onClick="installUpdate()">Install</div>');
	}

	about.append('<div class="flex_item" style="margin: 64px auto 0px auto;"><div class="discord_link"></div><div class="twitter_link"></div><div class="git_link"></div></div>');
	about.append('<div class="message_sub_15 white" style="margin: 24px 0 12px 0;">Support my work!</div><div class="donate_link"><img src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/PP_logo_h_100x26.png" alt="PayPal" /></div>')
	about.appendTo(section);

	//
	section = $('<div class="settings_section ss6" style="height: 100%;"></div>');
	var login = $('<div class="about"></div>');
	section.appendTo(div);
	if (offlineMode) {
		button = $('<div class="button_simple centered login_link_about">Login</div>');
	}
	else {
		button = $('<div class="button_simple centered login_link_about">Logout</div>');
	}
	button.appendTo(login);
	login.appendTo(section);


	div.appendTo(wrap_r);
	$("#ux_0").append(wrap_l);
	$("#ux_0").append(wrap_r);

	$(".ss"+openSection).show();
	$(".sn"+openSection).addClass("nav_selected");

	$(".top_logo_about").click(function() {
		shell.openExternal('https://mtgatool.com');
	});

	$(".twitter_link").click(function() {
		shell.openExternal('https://twitter.com/MEtchegaray7');
	});

	$(".discord_link").click(function() {
		shell.openExternal('https://discord.gg/K9bPkJy');
	});

	$(".git_link").click(function() {
		shell.openExternal('https://github.com/Manuel-777/MTG-Arena-Tool');
	});

	$(".release_notes_link").click(function() {
		shell.openExternal('https://mtgatool.com/release-notes/');
	});

	$(".donate_link").click(function() {
		shell.openExternal('https://www.paypal.me/ManuelEtchegaray/10');
	});

	$(".login_link_about").click(function() {
		remote.app.relaunch();
		remote.app.exit(0);
	});


	$(".settings_nav").click(function () {
		if (!$(this).hasClass("nav_selected")) {
			$(".settings_nav").each(function() {
				$(this).removeClass("nav_selected");
			});
			$(".settings_section").each(function() {
				$(this).hide();
			});

			$(this).addClass("nav_selected");

			if ($(this).hasClass("sn1")) {
				sidebarActive = 8;
				lastSettingsSection = 1;
				$(".ss1").show();
			}
			if ($(this).hasClass("sn2")) {
				sidebarActive = 8;
				lastSettingsSection = 2;
				$(".ss2").show();
			}
			if ($(this).hasClass("sn3")) {
				sidebarActive = 8;
				lastSettingsSection = 3;
				$(".ss3").show();
			}
			if ($(this).hasClass("sn4")) {
				sidebarActive = 8;
				lastSettingsSection = 4;
				$(".ss4").show();
			}
			if ($(this).hasClass("sn5")) {
				sidebarActive = 9;
				lastSettingsSection = 5;
				$(".ss5").show();
			}
			if ($(this).hasClass("sn6")) {
				sidebarActive = 8;
				lastSettingsSection = 6;
				$(".ss6").show();
			}
		}
	});


    url_input.on('keyup', function (e) {
        if (e.keyCode == 13) {
            updateSettings();
        }
    });

    export_input.on('keyup', function () {
        updateSettings();
    });

	$(".sliderA").off();

	$(".sliderA").on('click mousemove', function() {
		cardSizePos = Math.round(parseInt(this.value));
		cardSize = 100+(cardSizePos*10);
		sliderlabel.html('Cards size: '+cardSize+'px');

		$('.inventory_card_settings').css('width', '');
		var styles = $('.inventory_card_settings').attr('style');
		styles += 'width: '+cardSize+'px !important;'
		$('.inventory_card_settings').attr('style', styles);

		$('.inventory_card_settings_img').css('width', '');
		styles = $('.inventory_card_settings_img').attr('style');
		styles += 'width: '+cardSize+'px !important;'
		$('.inventory_card_settings_img').attr('style', styles);
	});

	$(".sliderA").on('click mouseup', function() {
		cardSizePos = Math.round(parseInt(this.value));
		updateSettings();
	});

	$(".sliderB").off();

	$(".sliderB").on('click mousemove', function() {
		overlayAlpha = alphaFromTransparency(parseInt(this.value));
		sliderOpacityLabel.html('Elements transparency: '+transparencyFromAlpha(overlayAlpha)+'%');
	});

	$(".sliderB").on('click mouseup', function() {
		overlayAlpha = alphaFromTransparency(parseInt(this.value));
		updateSettings();
	});

	$(".sliderC").on('click mousemove', function() {
		overlayAlphaBack = alphaFromTransparency(parseInt(this.value));
		sliderOpacityBackLabel.html('Background transparency: '+transparencyFromAlpha(overlayAlphaBack)+'%');
	});

	$(".sliderC").on('click mouseup', function() {
		overlayAlphaBack = alphaFromTransparency(parseInt(this.value));
		updateSettings();
	});

}

function alphaFromTransparency(transparency) {
	return 1 - (transparency / 100);
}

function transparencyFromAlpha(alpha) {
	return Math.round((1 - alpha) * 100);
}

//
function change_background(arg, grpId = 0) {
	var artistLine = "";
	var _card = cardsDb.get(grpId);

	//console.log(arg, grpId, _card);
	if (arg == "default") {
	$('.top_artist').html("Githu Lavarunner by Jesper Ejsing");
	if (defaultBackground == "") {
		$('.main_wrapper').css("background-image", "url(../images/Ghitu-Lavarunner-Dominaria-MtG-Art.jpg)");
        }
        else {
			$('.main_wrapper').css("background-image", "url("+defaultBackground+")");
        }
    }
    else if (_card != false) {
		console.log(_card.images["art_crop"]);
		$('.main_wrapper').css("background-image", "url(https://img.scryfall.com/cards"+_card.images["art_crop"]+")");
	}
    else if (fs.existsSync(arg)) {
        $('.main_wrapper').css("background-image", "url("+arg+")");
    }
    else {
        $.ajax({
            url: arg,
            type: 'HEAD',
            error: function() {
                $('.main_wrapper').css("background-image", "");
            },
            success: function() {
                $('.main_wrapper').css("background-image", "url("+arg+")");
            }
        });
    }

	if (_card) {
		try {
			artistLine = _card.name+" by "+_card.artist;
			$('.top_artist').html(artistLine);
		}
		catch (e) {
			console.log(e);
		}
    }
}

//
/* eslint-disable */
function changeQuality(dom) {
	if (cardQuality == "normal") {
		cardQuality = "large";
	}
	else if (cardQuality == "large") {
		cardQuality = "small";
	}
	else if (cardQuality == "small") {
		cardQuality = "normal";
	}
	dom.innerHTML = cardQuality;
	updateSettings();
	open_settings(lastSettingsSection);
}

//
function eraseData() {
	if (confirm('This will erase all of your decks and events shared online, are you sure?')) {
		ipc_send('renderer_erase_data', true);
	} else {
		return;
	}
}
/* eslint-enable */

//
function updateSettings() {
	var startup = document.getElementById("settings_startup").checked;
	var showOverlay = document.getElementById("settings_showoverlay").checked;
	var showOverlayAlways = document.getElementById("settings_showoverlayalways").checked;
	var soundPriority = document.getElementById("settings_soundpriority").checked;

    var backColor = $(".color_picker").spectrum("get").toRgbString();
    var backUrl = document.getElementById("query_image").value;
    defaultBackground = backUrl;
    if (backUrl == "")
		change_background("default");
	else
		change_background(backUrl);

	var overlayOnTop = document.getElementById("settings_overlay_ontop").checked;
	var closeToTray = document.getElementById("settings_closetotray").checked;
	var sendData = document.getElementById("settings_senddata").checked;
	var anonExplore = document.getElementById("settings_anon_explore").checked;

	var closeOnMatch = document.getElementById("settings_closeonmatch").checked;

	var overlayTop = document.getElementById("settings_overlay_top").checked;
	var overlayTitle = document.getElementById("settings_overlay_title").checked;
	var overlayDeck = document.getElementById("settings_overlay_deck").checked;
	var overlayClock = document.getElementById("settings_overlay_clock").checked;
	var overlaySideboard = document.getElementById("settings_overlay_sideboard").checked;

    var exportFormat = document.getElementById("settings_export_format").value;

	settings = {
		sound_priority: soundPriority,
		show_overlay: showOverlay,
		show_overlay_always: showOverlayAlways,
		startup: startup,
		close_to_tray: closeToTray,
		send_data: sendData,
		close_on_match: closeOnMatch,
		cards_size: cardSizePos,
		cards_quality: cardQuality,
		overlay_alpha: overlayAlpha,
		overlay_alpha_back: overlayAlphaBack,
		overlay_top: overlayTop,
		overlay_title: overlayTitle,
		overlay_deck: overlayDeck,
		overlay_clock: overlayClock,
		overlay_sideboard: overlaySideboard,
		overlay_ontop: overlayOnTop,
        anon_explore: anonExplore,
        back_color: backColor,
        back_url: backUrl,
        export_format: exportFormat
	};
	cardSize = 100+(cardSizePos*10);
	ipc_send('save_settings', settings);
}

//
function getDeckWinrate(deckid, lastEdit) {
	var wins = 0;
	var loss = 0;
	var winsLastEdit = 0;
	var lossLastEdit = 0;
	var colorsWinrates = [];

	if (matchesHistory == undefined) {
		return 0;
	}

	matchesHistory.matches.forEach(function(matchid, index) {
		let match = matchesHistory[matchid];
		if (matchid != null && match != undefined) {
			if (match.type == "match") {
				if (match.playerDeck.id == deckid) {
					var oppDeckColors = get_deck_colors(match.oppDeck);
					if (oppDeckColors.length > 0) {
						var added = -1;

						colorsWinrates.forEach(function(wr, index) {
							if (compare_colors(wr.colors, oppDeckColors)) {
								added = index;
							}
						});

						if (added == -1) {
							added = colorsWinrates.push({colors: oppDeckColors, wins: 0, losses: 0})-1;
						}

						if (match.player.win > match.opponent.win) {
							if (index > -1) {
								colorsWinrates[added].wins++;
							}

							wins++;
						}
						else {
							if (index > -1) {
								colorsWinrates[added].losses++;
							}
							loss++;
						}

						if (match.date > lastEdit) {
							if (match.player.win > match.opponent.win) {
								winsLastEdit++;
							}
							else {
								lossLastEdit++;
							}
						}
					}
				}
			}
		}
	});

	if (wins == 0 && loss == 0) {
		return 0;
	}

	var winrate = Math.round((1/(wins+loss)*wins) * 100) / 100;
	var winrateLastEdit = Math.round((1/(winsLastEdit+lossLastEdit)*winsLastEdit) * 100) / 100;
	if (winsLastEdit == 0)	winrateLastEdit = 0;

	//colorsWinrates.sort(compare_color_winrates);
	colorsWinrates.sort(compare_winrates);

	return {total: winrate, wins: wins, losses: loss, lastEdit: winrateLastEdit, colors: colorsWinrates};
}

function compare_winrates(a, b) {
	let _a = a.wins/a.losses;
	let _b = b.wins/b.losses;

	if (_a < _b)	return 1;
	if (_a > _b)	return -1;

	return compare_color_winrates(a, b);
}

function compare_color_winrates(a, b) {
	a = a.colors;
	b = b.colors;

	if (a.length < b.length)	return -1;
	if (a.length > b.length)	return 1;

	let sa = a.reduce(function(_a, _b) { return _a + _b; }, 0);
	let sb = b.reduce(function(_a, _b) { return _a + _b; }, 0);
	if (sa < sb)	return -1;
	if (sa > sb)	return 1;

	return 0;
}

//
function sort_decks() {
	decks.sort(compare_decks); 
	decks.forEach(function(deck) {
		deck.colors = [];
		deck.colors = get_deck_colors(deck);
		deck.mainDeck.sort(compare_cards); 
	});
}

//
function compare_decks(a, b) {
	a = Date.parse(a.lastUpdated);
	b = Date.parse(b.lastUpdated);
	if (a < b)	return 1;
	if (a > b)	return -1;
	return 0;
}

//
function compare_changes(a, b) {
	a = Date.parse(a.date);
	b = Date.parse(b.date);
	if (a < b)	return 1;
	if (a > b)	return -1;
	return 0;
}

//
function compare_changes_inner(a, b) {
	a = a.quantity;
	b = b.quantity;
	if (a > 0 && b > 0) {
		if (a < b)	return -1;
		if (a > b)	return 1;
	}
	if (a < 0 && b < 0) {
		if (a < b)	return 1;
		if (a > b)	return -1;
	}
	if (a < 0 && b > 0) {
		return -1;
	}
	if (a > 0 && b < 0) {
		return 1;
	}
	return 0;
}

//
function sort_history() {
	matchesHistory.matches.sort(compare_matches); 

	matchesHistory.matches.forEach(function(mid) {
		var match = matchesHistory[mid];

		if (mid != null && match != undefined) {
			if (match.type != "draft" && match.type != "Event") {
				try {
					if (match.playerDeck.mainDeck == undefined) {
						match.playerDeck = JSON.parse('{"deckTileId":67003,"description":null,"format":"Standard","colors":[],"id":"00000000-0000-0000-0000-000000000000","isValid":false,"lastUpdated":"2018-05-31T00:06:29.7456958","lockedForEdit":false,"lockedForUse":false,"mainDeck":[],"name":"Undefined","resourceId":"00000000-0000-0000-0000-000000000000","sideboard":[]}');
					}
					else {
						match.playerDeck.colors = get_deck_colors(match.playerDeck);
					}
					match.playerDeck.mainDeck.sort(compare_cards);
					match.oppDeck.colors = get_deck_colors(match.oppDeck);
					match.oppDeck.mainDeck.sort(compare_cards);
				} catch (e) {
					console.log(e, match);
				}
			}
		}
	});
}

//
function compare_matches(a, b) {
	if (a == undefined)
		return -1;
	if (b == undefined)
		return 1;

	a = matchesHistory[a];
	b = matchesHistory[b];

	if (a == undefined)
		return -1;
	if (b == undefined)
		return 1;

	a = Date.parse(a.date);
	b = Date.parse(b.date);
	if (a < b)	return 1;
	if (a > b)	return -1;
	return 0;
}

//
function compare_courses(a, b) {
	if (a == undefined)
		return -1;
	if (b == undefined)
		return 1;

	a = eventsHistory[a];
	b = eventsHistory[b];

	if (a == undefined)
		return -1;
	if (b == undefined)
		return 1;

	a = Date.parse(a.date);
	b = Date.parse(b.date);
	if (a < b)	return 1;
	if (a > b)	return -1;
	return 0;
}

//
function compare_economy(a, b) {
	if (a == undefined)
		return -1;
	if (b == undefined)
		return 1;

	a = economyHistory[a];
	b = economyHistory[b];

	if (a == undefined)
		return -1;
	if (b == undefined)
		return 1;

	a = Date.parse(a.date);
	b = Date.parse(b.date);
	if (a < b)	return 1;
	if (a > b)	return -1;
	return 0;
}

function compare_explore(a, b) {
	var awlrate = a.wins-a.losses;
	var bwlrate = b.wins-b.losses;

	if (awlrate > bwlrate)	return -1;
	if (awlrate < bwlrate)	return 1;
	return 0;
}

