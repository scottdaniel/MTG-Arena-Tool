/*
globals
	ipc_send,
	matchesHistory,
	get_rank_index,
	cardsDb,
	mana,
	get_rank_index_16,
	timeSince,
	toMMSS,
	get_deck_colors,
	setsList,
	addHover,
	selectAdd,
	compare_cards,
	rankLimited,
	rankLimitedStep,
	rankLimitedTier,
	rankConstructed,
	rankConstructedStep,
	rankConstructedTier,
	getReadableEvent,
	getWinrateClass

*/
const RANKS = [
	"Bronze",
	"Silver",
	"Gold",
	"Platinum",
	"Diamond",
	"Mythic"
];

let loadHistory = 0;
let filterEvent = 'All';
let filteredSampleSize = 0;
let viewingLimitSeason = false;

function open_history_tab(loadMore) {
	var mainDiv = document.getElementById("ux_0");
	var div, d;
	mainDiv.classList.add("flex_item");
	if (loadMore <= 0) {
		loadMore = 25;
		sort_history();		
		mainDiv.innerHTML = '';
		loadHistory = 0;

		let wrap_r = createDivision(["wrapper_column", "sidebar_column_l"]);

		div = createDivision(["ranks_history"]);

		renderRanksStats(div);

		let wrap_l = createDivision(["wrapper_column"]);
		wrap_l.setAttribute("id", "history_column");

		d = createDivision(["list_fill"]);

		wrap_r.appendChild(div);
		mainDiv.appendChild(wrap_l);
		mainDiv.appendChild(wrap_r);
		wrap_l.appendChild(d);
	}

	mainDiv = document.getElementById("history_column");

	// Event ID filter
	if (loadHistory == 0) {
		let events_list = [];
		let wins = 0;
		let losses = 0;
		filteredSampleSize = 0;
		matchesHistory.matches.forEach((matchId) => {
			let match = matchesHistory[matchId];
			if (match) {
				if (match.eventId) {
					if (events_list.indexOf(match.eventId) == -1) {
						events_list.push(match.eventId);
					}
					if (filterEvent == 'All' || match.eventId == filterEvent) {
						wins += match.player.win;
						losses += match.opponent.win;
						filteredSampleSize++;
					}
				}
			}
		});
		if (filteredSampleSize == 0)	filteredSampleSize = matchesHistory.matches.length;

		div = createDivision(["history_top"]);

		let history_top_filter = createDivision(["history_top_filter"]);

		let history_top_winrate = createDivision(["history_top_winrate"]);

		let wrTotal = 1 / (wins+losses) * wins;
		let colClass = getWinrateClass(wrTotal);
		d = createDivision(["list_deck_winrate"], `${wins} : ${losses} (<span class="${colClass}_bright">${Math.round(wrTotal*100)}%</span>)`);

		history_top_winrate.appendChild(d);

		div.appendChild(history_top_filter);
		div.appendChild(history_top_winrate);

		var select = $('<select id="query_select"></select>');
		if (filterEvent != "All") {
			select.append('<option value="All">All</option>');
		}
		events_list.forEach((evId) => {
			if (evId !== filterEvent) {
				select.append('<option value="'+evId+'">'+getReadableEvent(evId)+'</option>');
			}
		});
		history_top_filter.appendChild(select[0]);
		mainDiv.appendChild(div);
		selectAdd(select, filterHistory);
		select.next('div.select-styled').text(getReadableEvent(filterEvent));
	}
	
	//console.log("Load more: ", loadHistory, loadMore, loadHistory+loadMore);
	var actuallyLoaded = loadHistory;
	for (var loadEnd = loadHistory + loadMore; actuallyLoaded < loadEnd && loadHistory <= matchesHistory.matches.length && actuallyLoaded < filteredSampleSize; loadHistory++) {
		var match_id = matchesHistory.matches[loadHistory];
		var match = matchesHistory[match_id];

		//console.log("match: ", match_id, match);
		if (match == undefined) continue;
		if (match.type == "match") {
			if (match.opponent == undefined) continue;
			if (match.opponent.userid.indexOf("Familiar") !== -1) continue;
		}
		if (match.type == "Event")	continue;
		if (filterEvent !== 'All' && filterEvent !== match.eventId)		continue;

		actuallyLoaded++;
		//console.log("Load match: ", match_id, match);
		//console.log("Match: ", loadHistory, match.type, match);
		
		let div = createDivision([match.id, "list_match"]);
		let fltl = createDivision(["flex_item"]);
		let fll = createDivision(["flex_item"]);
		fll.style.flexDirection = "column";
		let flt = createDivision(["flex_top"]);
		let flb = createDivision(["flex_bottom"]);
		fll.appendChild(flt);
		fll.appendChild(flb);
		let fct = createDivision(["flex_top"]);

		let flc = createDivision(["flex_item"]);
		flc.style.flexDirection = "column";
		flc.style.flexGrow = 2;
		flc.appendChild(fct);

		let fcb = createDivision(["flex_bottom"]);
		fcb.style.marginRight = "14px";
		flc.appendChild(fcb);

		let flr = createDivision(["rightmost", "flex_item"]);

		var tileGrpid, tile;
		if (match.type == "match") {
			tileGrpid = match.playerDeck.deckTileId;
			try {
				let t = cardsDb.get(tileGrpid).images["art_crop"];
			}
			catch (e) {
				tileGrpid = 67003;
			}

			tile = createDivision([match.id+"t", "deck_tile"]);

			try {
				tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";
			}
			catch (e) {
				console.error(e, tileGrpid);
			}
			fltl.appendChild(tile);

			d = createDivision(["list_deck_name"], match.playerDeck.name);
			flt.appendChild(d);

			d = createDivision(["list_deck_name_it"], getReadableEvent(match.eventId));
			flt.appendChild(d);

			match.playerDeck.colors.forEach(function(color) {
				var m = createDivision(["mana_s20", "mana_"+mana[color]]);
				flb.appendChild(m);
			});

			if (match.opponent.name == null) {
				match.opponent.name = "-";
			}
			d = createDivision(["list_match_title"], "vs "+match.opponent.name.slice(0, -6));
			fct.appendChild(d);

			var or = createDivision(["ranks_16"]);
			or.style.backgroundPosition = (get_rank_index_16(match.opponent.rank)*-16)+"px 0px";
			or.title = match.opponent.rank+" "+match.opponent.tier;
			fct.appendChild(or);

			d = createDivision(["list_match_time"], timeSince(new Date(match.date))+' ago - '+toMMSS(match.duration));
			fcb.appendChild(d);

			var cc = get_deck_colors(match.oppDeck);
			cc.forEach(function(color) {
				var m = createDivision(["mana_s20", "mana_"+mana[color]]);
				fcb.appendChild(m);
			});

			d = createDivision([(match.player.win > match.opponent.win ? "list_match_result_win" : "list_match_result_loss")], `${match.player.win}:${match.opponent.win}`);
			flr.appendChild(d);
		}
		else if (match.type == "draft") {
			console.log("Draft: ", match);
			try {
				tileGrpid = setsList[match.set].tile;
			}
			catch (e) {
				tileGrpid = 67003;
			}

			tile = createDivision([match.id+"t", "deck_tile"]);

			try {
				tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";
			}
			catch (e) {
				console.error(e);
			}
			fltl.appendChild(tile);

			d = createDivision(["list_deck_name"], match.set+" draft");
			flt.appendChild(d);

			d = createDivision(["list_match_time"], timeSince(new Date(match.date))+" ago.");
			fcb.appendChild(d);

			d = createDivision(["list_match_replay"], "See replay");
			fct.appendChild(d);

			d = createDivision(["list_draft_share", match.id+'dr']);
			flr.appendChild(d);

		}

		var fldel = createDivision(["flex_item", match.id+"_del", "delete_item"]);

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
			open_history_tab(20);
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

function createDivision(classNames, innerHTML) {
	// Utility function. Create a <div> element with specified class names and content
	let div = document.createElement("div");

	if (classNames !== undefined) {
		classNames.forEach(
			className => div.classList.add(className)
		);
	}
	if (innerHTML !== undefined) {
		div.innerHTML = innerHTML;
	}
	return div;
}

function formatPercent(percent, precision) {
	// Utility function: converts a number to rounded percent
	// converts number to percent
	// 0.333333 -> 33%
	// 20 -> 2000%
	precision = precision || 0;
	return (100 * percent).toFixed(precision);
}

function renderRanksStats(container) {
	/*
		globals used:
			viewingLimitSeason
			matchesHistory
			get_rank_index
			getStepsUntilNextRank
			createButton
			formatPercent
			rankLimited
			rankConstructed
	*/
	container.innerHTML = '';

	let seasonName = !viewingLimitSeason ? 'constructed' : 'limited';
	let switchSeasonName = viewingLimitSeason ? 'constructed' : 'limited';

	let seasonToggleButton = createDivision(
		["button_simple", "button_thin", "season_toggle"],
		`Show ${switchSeasonName}`
	);
	seasonToggleButton.style.marginTop = "32px !important;";
	
	container.appendChild(seasonToggleButton);

	var title = createDivision(
		["ranks_history_title"],
		`Current ${seasonName} season:`);
	container.appendChild(title);

	// Add ranks matchup history here
	let rc = matchesHistory.rankwinrates[seasonName];
	var lastWinrate; // used later

	Object.values(rc).forEach(object => {
		// object is either rank win/loss data OR metadata
		// See function calculateRankWins() in background.js
		var rankName = object.r;
		var totalGames = object.t;
		var wonGames = object.w;
		var lostGames = object.l;

		if (!rankName || totalGames <= 0) {
			// this is a not winrate object OR
			// we have no data for this rank so don't display it
			return; 
		}

		var rowContainer = createDivision(["flex_item"]);
		//rowContainer.style.flexDirection = "column";
		rowContainer.style.justifyContent = "center";

		var versusPrefix = createDivision(["ranks_history_title"], "Vs.");
		rowContainer.appendChild(versusPrefix);

		var rankBadge = createDivision(["ranks_history_badge"]);
		rankBadge.title = rankName;
		rankBadge.style.backgroundPosition = `${get_rank_index(rankName, 1) * -48}px 0px`;
		rowContainer.appendChild(rankBadge);

		var rankSpecificWinrate = createDivision(
			["ranks_history_title"], 
			`${wonGames}:${lostGames} (${formatPercent(wonGames / totalGames)}%)`);
	
		// let sampleSize = `Sample size: ${totalGames}`;
		// rankSpecificWinrate.title = sampleSize;

		rowContainer.appendChild(rankSpecificWinrate);

		container.appendChild(rowContainer);

		lastWinrate = wonGames / totalGames;
	});

	let totalWon = rc.total.w;
	let totalLost = rc.total.l;
	let totalWinrate = totalWon / rc.total.t;
	title = createDivision(["ranks_history_title"], `Total: ${totalWon}:${totalLost} (${formatPercent(totalWinrate)}%)`);
	// let sampleSize = `Sample size: ${rc.total.t}`;
	// title.title = sampleSize;
	container.appendChild(title);


	let currentRank = viewingLimitSeason ? rankLimited : rankConstructed;
	let expected = getStepsUntilNextRank(viewingLimitSeason, lastWinrate);

	title = createDivision(
		["ranks_history_title"], 
		`Games until ${getNextRank(currentRank)}: ${expected}`);
	title.title = `Using ${formatPercent(lastWinrate)}% winrate`;
	container.appendChild(title);

	seasonToggleButton.addEventListener('click', (event) => {
		viewingLimitSeason = !viewingLimitSeason;
		renderRanksStats(container);
	});
} 

function filterHistory(filter) {
	filterEvent = filter;
	open_history_tab(0);
}


function getNextRank(currentRank) {
	/*
		Globals used: RANKS
	*/
	var rankIndex = RANKS.indexOf(currentRank);
	if (rankIndex < RANKS.length - 1) {
		return RANKS[rankIndex + 1];
	} else {s
		return undefined;
	}
}

function getStepsUntilNextRank(mode, winrate) {
	let cr = rankLimited;
	let cs = rankLimitedStep
	let ct = rankLimitedTier;
	if (!mode) {
		cr = rankConstructed;
		cs = rankConstructedStep;
		ct = rankConstructedTier;
	}

	let st = 1;
	let stw = 1;
	let stl = 0;
	if (cr == "Bronze")		{st = 4; stw = 2; stl = 0;}
	if (cr == "Silver")		{st = 5; stw = 2; stl = 1;}
	if (cr == "Gold")		{st = 6; stw = 1; stl = 1;}
	if (cr == "Platinum")	{st = 7; stw = 1; stl = 1;}
	if (cr == "Diamond")	{st = 1; stw = 1; stl = 1;}

	let stepsNeeded = (st * ct) - cs;

	if (winrate <= 0.5)	return "&#x221e";
	let expected = 0;
	let n = 0;
	console.log("stepsNeeded", stepsNeeded);
	while (expected <= stepsNeeded) {
		expected = ((n * winrate) * stw) - (n * (1 - winrate) * stl);
		//console.log("stepsNeeded:", stepsNeeded, "expected:", expected, "N:", n);
		n++;
	}

	return '~'+n;
}

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

		var select = $('<select id="expire_select"></select>');
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

function deleteMatch(_match) {
	$('.'+_match.id+'_del').on('click', function(e) {
		currentId = _match.id;
		e.stopPropagation();
		ipc_send('delete_match', currentId);
		$('.'+currentId).css('height', "0px");
	});
}

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


module.exports = {open_history_tab: open_history_tab};