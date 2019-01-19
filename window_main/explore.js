/*
globals
	filterEvent,
	getReadableEvent,
	selectAdd,
	cardsDb,
	mana,
	timeSince,
	ipc_send,
	getEventId,
	explore,
	ladder,
	add_checkbox,
	economyHistory,
	get_deck_missing,
	getWinrateClass,
	get_rank_index_16
*/

let loadExplore = 0;
let eventFilters = null;
let onlyOwned = false;
let exploreMode = 0;
let filteredMana = [];
let filteredranks = [];

let ranks_list = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Mythic"];

const open_deck = require('./deck_details').open_deck;

let rarityBooster = {c: 3, u: 3, r: 6, m: 13};
let raritySort = {c: 'common', u: 'uncommon', r: 'rare', m: 'mythic'};
let raritySortReversed = {common: 'c', uncommon: 'u', rare: 'r', mythic: 'm'};

function updateExplore() {
	filterEvent = getEventId(document.getElementById("query_select").value);
	ipc_send('request_explore', filterEvent);
}

function set_explore_mode(mode) {
	exploreMode = mode;
}

function open_explore_tab(arg, loadMore) {
	document.body.style.cursor = "auto";
	if (arg != null) {
		if (exploreMode == 1) {
			ladder = arg;
		}
		else {
			explore = arg;
		}
	}

	var mainDiv = document.getElementById("ux_0");
	var dateNow, d;
	let ownedWildcards = {c: economyHistory.wcCommon, u: economyHistory.wcUncommon, r: economyHistory.wcRare, m: economyHistory.wcMythic};

	mainDiv.classList.remove("flex_item");
	if (loadMore <= 0) {
		loadExplore = 0;
		loadMore = 20;

		mainDiv.innerHTML = '';

		d = document.createElement("div");
		d.classList.add("list_fill");
		mainDiv.appendChild(d);// goes down

		// Search box
		var icd = $('<div class="explore_buttons_container"></div>');
		
		var input = $('<div class="query_explore" style="margin-left: 16px;"></div>');
		var select = $('<select id="query_select"></select>');

		if (eventFilters == null) {
			eventFilters = [];
			eventFilters.push('All');
			eventFilters.push('Ranked Ladder');

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

		var manas = $('<div class="mana_filters_explore"></div>');
		var ms = ["w", "u", "b", "r", "g"];
		ms.forEach(function(s, i) {
			var mi = [1, 2, 3, 4, 5];
			var mf = "";
			if (!filteredMana.includes(mi[i])) {
				mf = "mana_filter_on";
			}
			var manabutton = $('<div class="mana_filter '+mf+'" style="background-image: url(../images/'+s+'20.png)"></div>');
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
				update_explore_filters();
			});
		});
		manas.appendTo(icd);

		var ranks_filters = $('<div class="mana_filters_explore"></div>');
		ranks_list.forEach(function(rr, index) {
			var mf = "";
			if (!filteredranks.includes(rr)) {
				mf = "rank_filter_on";
			}
			var rankbutton = $(`<div title="${rr}" class="rank_filter ${mf}" style="background-position: ${((index+1)*-16)}px 0px; background-image: url(../images/ranks_16.png)"></div>`);
			//backgroundPosition = (get_rank_index_16(match.opponent.rank)*-16)+"px 0px";
			rankbutton.appendTo(ranks_filters);
			rankbutton.click(function() {
				if (rankbutton.hasClass('rank_filter_on')) {
					rankbutton.removeClass('rank_filter_on');
					filteredranks.push(rr);
				}
				else {
					rankbutton.addClass('rank_filter_on');
					let n = filteredranks.indexOf(rr);
					if (n > -1) {
						filteredranks.splice(n, 1);
					}
				}
				update_explore_filters();
			});
		});
		ranks_filters.appendTo(icd);

		let lab = add_checkbox($(icd), 'Only owned', 'settings_owned', onlyOwned, 'update_explore_filters()');
		lab.css("margin-top", "6px");

		icd.appendTo($("#ux_0"));

		d = document.createElement("div");
		d.classList.add("list_fill");
		mainDiv.appendChild(d);
		d = document.createElement("div");
		d.classList.add("list_fill");
		mainDiv.appendChild(d);
	}

	//explore.forEach(function(_deck, index) {
	if (exploreMode == 1) {
		ladderLoadMore(loadMore, ownedWildcards);
	}
	else {
		exploreLoadMore(loadMore, ownedWildcards);
	}

	if (loadMore == 0 && loadExplore-actuallyLoaded < 20) {
		open_explore_tab(null, 20);
	}

	$(this).off();
	$("#ux_0").on('scroll', function() {
		if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
			open_explore_tab(null, 20);
		}
	})
}

function ladderLoadMore(loadMore, ownedWildcards) {
	let mainDiv = document.getElementById("ux_0");
	var actuallyLoaded = loadExplore;
	console.log(ladder);
	for (var loadEnd = loadExplore + loadMore; actuallyLoaded < loadEnd && loadExplore < ladder.length; loadExplore++) {
		let _deck = ladder[loadExplore];
		if (_deck == undefined) {
			continue;
		}
		_deck.wildcards = get_deck_missing(_deck);

		if (filteredMana.length > 0) {
			let filterOut = false;
			filteredMana.forEach((i) => {
				if (!_deck.colors.includes(i)) {
					filterOut = true;
				}
			});

			if (filterOut)	continue;
		}

		if (filteredranks.length > 0) {
			let filterOut = true;
			filteredranks.forEach((rr) => {
				if (_deck.rank == rr) {
					filterOut = false;
				}
			});

			if (filterOut)	continue;
		}

		let index = 'ladder_'+loadExplore;

		var flcf = document.createElement("div");
		flcf.classList.add("flex_item");
		flcf.style.width = '20%';
		flcf.style.justifyContent = 'center';

		let wc;
		let n = 0;
		let boosterCost = 0;
		for (var key in raritySortReversed) {
			if (_deck.wildcards.hasOwnProperty(key)) {
				if (_deck.wildcards[key] > 0) {					
					let bc = rarityBooster[raritySortReversed[key]] * (_deck.wildcards[key] - ownedWildcards[raritySortReversed[key]]);

					n++;
					if (bc > boosterCost) {
						boosterCost = bc;
					}
					wc = document.createElement("div");
					wc.classList.add("wc_explore_cost");
					wc.classList.add("wc_"+key);
					wc.title = key.capitalize()+" wldcards needed.";
					wc.innerHTML = ownedWildcards[raritySortReversed[key]] + '/'  + _deck.wildcards[key];
					flcf.appendChild(wc);
				}
			}
		}
		if (n == 0) {
			wc = document.createElement("div");
			wc.classList.add("wc_complete");
			flcf.appendChild(wc);
		}

		else if (onlyOwned) {
			continue;
		}
		else {
			let bo = document.createElement("div");
			bo.classList.add("bo_explore_cost");
			bo.innerHTML = boosterCost;
			bo.title = "Boosters needed (estimated)";
			flcf.appendChild(bo);
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
			let a = cardsDb.get(tileGrpid).images["art_crop"];
		}
		catch (e) {
			tileGrpid = 67003;
		}

		var tile = document.createElement("div");
		tile.classList.add(index+"t");
		tile.classList.add("deck_tile");
		tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";

		var div = document.createElement("div");
		div.classList.add(index);
		div.classList.add("list_deck");

		var fll = document.createElement("div");
		fll.classList.add("flex_item");

		var flc = document.createElement("div");
		flc.classList.add("flex_item");
		flc.style.flexDirection = "column";
		flc.style.width = '40%';

		var flr = document.createElement("div");
		flr.classList.add("flex_item");
		flr.style.flexDirection = "column";
		flr.style.width = '40%';

		var flt = document.createElement("div");
		flt.classList.add("flex_top");

		var flb = document.createElement("div");
		flb.classList.add("flex_bottom");

		let d;
		d = document.createElement("div");
		d.classList.add("list_deck_name");
		d.innerHTML = _deck.name;
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
		let colClass = getWinrateClass(1/_deck.t*_deck.w);
		d.innerHTML = `'Wins: ${_deck.w} / Losses: ${_deck.l} <span class="${colClass}_bright">(${Math.round(100/_deck.t*_deck.w)}%)</span>`;
		flr.appendChild(d);

		let rcont = document.createElement("div");
		rcont.style.marginLeft = 'auto';
		var pr = document.createElement("div");
		pr.classList.add("ranks_16");
		pr.style.backgroundPosition = (get_rank_index_16(_deck.rank)*-16)+"px 0px";
		pr.title = _deck.rank;

		rcont.appendChild(pr);
		flr.appendChild(rcont);

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
			open_deck(_deck, 1);
			$('.moving_ux').animate({'left': '-100%'}, 250, 'easeInOutCubic'); 
		});

	}
}


function exploreLoadMore(loadMore, ownedWildcards) {
	let mainDiv = document.getElementById("ux_0");
	var actuallyLoaded = loadExplore;
	for (var loadEnd = loadExplore + loadMore; actuallyLoaded < loadEnd && loadExplore < explore.length; loadExplore++) {
		let _deck = explore[loadExplore];
		if (_deck == undefined) {
			continue;
		}

		let index = loadExplore;

		let dateNow = new Date();
		dateNow = dateNow.getTime()/1000;
		let _ss = Math.floor(dateNow - _deck.date);
		if (Math.floor(_ss / 86400) > 10) {
			continue;
		}

		if (_deck.colors == undefined) {
			_deck.colors = [];
		}
		if (filteredMana.length > 0) {
			let filterOut = false;
			filteredMana.forEach((i) => {
				if (!_deck.colors.includes(i)) {
					filterOut = true;
				}
			});

			if (filterOut)	continue;
		}

		var flcf = document.createElement("div");
		flcf.classList.add("flex_item");
		flcf.style.width = '20%';
		flcf.style.justifyContent = 'center';

		let wc;
		let n = 0;
		let boosterCost = 0;
		for (var key in raritySort) {
			if (_deck.wildcards.hasOwnProperty(key)) {
				n++;
				let bc = rarityBooster[key] * (_deck.wildcards[key] - ownedWildcards[key]);
				if (bc > boosterCost) {
					boosterCost = bc;
				}
				wc = document.createElement("div");
				wc.classList.add("wc_explore_cost");
				wc.classList.add("wc_"+raritySort[key]);
				wc.title = raritySort[key].capitalize()+" wldcards needed.";
				wc.innerHTML = ownedWildcards[key] + '/' + _deck.wildcards[key];
				flcf.appendChild(wc);
			}
		}
		if (n == 0) {
			wc = document.createElement("div");
			wc.classList.add("wc_complete");
			flcf.appendChild(wc);
		}
		else if (onlyOwned) {
			continue;
		}
		else {
			let bo = document.createElement("div");
			bo.classList.add("bo_explore_cost");
			bo.innerHTML = boosterCost;
			bo.title = "Boosters needed (estimated)";
			flcf.appendChild(bo);
		}

		actuallyLoaded++;

		if (_deck.wins == undefined) {
			_deck.wins = 0;
			_deck.losses = 0;
		}

		var tileGrpid = _deck.tile;
		try {
			let a = cardsDb.get(tileGrpid).images["art_crop"];
		}
		catch (e) {
			tileGrpid = 67003;
		}

		var tile = document.createElement("div");
		tile.classList.add(index+"t");
		tile.classList.add("deck_tile");
		tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";

		var div = document.createElement("div");
		div.classList.add(index);
		div.classList.add("list_deck");

		var fll = document.createElement("div");
		fll.classList.add("flex_item");

		var flc = document.createElement("div");
		flc.classList.add("flex_item");
		flc.style.flexDirection = "column";
		flc.style.width = '40%';

		var flr = document.createElement("div");
		flr.classList.add("flex_item");
		flr.style.flexDirection = "column";
		flr.style.width = '40%';

		var flt = document.createElement("div");
		flt.classList.add("flex_top");

		var flb = document.createElement("div");
		flb.classList.add("flex_bottom");

		let d;
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
		d.classList.add("list_deck_right_it");
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
}

function update_explore_filters() {
	onlyOwned = document.getElementById("settings_owned").checked;

	open_explore_tab(null, 0);
}

function open_course_request(courseId) {
	ipc_send('request_course', courseId);
}

module.exports = {
	open_explore_tab, update_explore_filters, set_explore_mode
}