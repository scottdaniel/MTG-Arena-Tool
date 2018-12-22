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
	rankConstructedTier

*/
let loadHistory = 0;

function open_history_tab(loadMore) {
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
		t.innerHTML = "Current contructed season:";
		div.appendChild(t);

		// Add ranks matchup history here
		let rc = matchesHistory.rankwinrates.constructed;
		let lastWinrate;
		for (var key in rc) {
			if (rc.hasOwnProperty(key)) {
				var val = rc[key];
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

					lastWinrate = Math.round(val.w/val.t*100);
					s.innerHTML = lastWinrate+"%";

					fla.appendChild(v);
					fla.appendChild(r);
					fla.appendChild(s);
					div.appendChild(fla);
				}
			}
		}

		t = document.createElement("div");
		t.classList.add("ranks_history_title");
		t.innerHTML = `Total: ${Math.round(100 / rc.total.t * rc.total.w)} %`;
		div.appendChild(t);

		let expected = getStepsUntilNextRank(0, lastWinrate/100);
		t = document.createElement("div");
		t.classList.add("ranks_history_title");
		t.innerHTML = `Matches until ${getNextRank(0)}: ${expected}`;
		div.appendChild(t);

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
				let t = cardsDb.get(tileGrpid).images["art_crop"];
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

			d = document.createElement("div");
			d.classList.add("list_deck_name_it");
			d.innerHTML = getReadableEvent(match.eventId);
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

function getNextRank(mode) {
	let cr = rankLimited;
	if (!mode)	cr = rankConstructed;

	if (cr == "Bronze")		return "Silver";
	if (cr == "Silver")		return "Gold";
	if (cr == "Gold")		return "Platinum";
	if (cr == "Platinum")	return "Diamond";
	if (cr == "Diamond")	return "Mythic";
	return;
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

	if (winrate < 0.5)	return "&#x221e";
	let expected = 0;
	let n = 0;
	console.log("stepsNeeded", stepsNeeded);
	while (expected <= stepsNeeded) {
		expected = ((n * winrate) * stw) - (n * (1 - winrate) * stl);
		console.log("expected", expected, "N", n);
		n++;
	}

	return n;
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