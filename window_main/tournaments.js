/*
global
	timestamp,
	toHHMM,
	userName,
	ipc_send,
	change_background,decks
	drawDeckVisual,
	selectAdd,
	addCardSeparator,
	addCardTile,
	get_deck_export,
	makeId,
	pop
*/

let tournaments_list;
let tournamentDeck = null;
let currentDeck = null;
let originalDeck = null;

// Should separate these two into smaller functions
function open_tournaments_tab(arg) {
	if (arg != null) {
		tournaments_list = arg;
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

	tournaments_list.forEach(function(tou) {
		console.log(tou);

		let div = document.createElement("div");
		div.classList.add("tou_container");
		div.id = tou._id;


		let sd = tou.signupDuration;
		let rd = tou.roundDuration;
		let now = timestamp();

		let roundsStart = tou.starts + (sd * 60*60);
		let roundEnd = tou.starts + (sd * 60*60) + ((tou.currentRound+1) * (60*60) * rd);

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
			state = "Round "+(tou.currentRound+1)+"/"+tou.maxRounds+" in progress.";
			stateb = toHHMM(roundEnd-now)+" left";
		}
		if (tou.state == 4) {
			state = "Tournament finish.";
			stateb = "Winner: "+tou.winner.slice(0, -6);
		}

		let nam = document.createElement("div");
		nam.classList.add("tou_name");
		nam.innerHTML = tou.name;

		let st = document.createElement("div");
		st.classList.add("tou_state");
		st.innerHTML = state;

		let stb = document.createElement("div");
		stb.classList.add("tou_cell");
		stb.innerHTML = tou.players.length+" players.";

		let pln = document.createElement("div");
		pln.classList.add("tou_cell");
		pln.style.width = "200px";
		pln.innerHTML = stateb;

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

function open_tournament(tou) {
	let mainDiv = $("#ux_1");
	mainDiv.html('');

	let sd = tou.signupDuration;
	let rd = tou.roundDuration;
	let now = timestamp();
	let roundsStart = tou.starts + (sd * 60*60);
	let roundEnd = tou.starts + (sd * 60*60) + ((tou.currentRound+1) * 60*60 * rd);

	currentDeck = tou.deck;
	originalDeck = $.extend(true, {}, tou.deck);

	let joined = false;
	let record = '-';
	let stats;
	if (tou.players.indexOf(userName) !== -1) {
		joined = true;
		stats = tou.playerStats[userName];
		record = stats.w+' - '+stats.d+' - '+stats.l;
	}

	let top = $(`<div class="decklist_top"><div class="button back"></div><div class="deck_name">${tou.name}</div></div>`);
	let flr = $(`<div class="tou_top_status" style="align-self: center;"></div>`);

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

	if (tou.state <= 0) {
		if (joined) {
			let deckContainer = $('<div class="flex_item"></div>');
			let deckvisual = $('<div class="decklist"></div>');
			deckvisual.appendTo(deckContainer);
			if (tou.deck) {
				drawDeckVisual(deckvisual, $('.dummy'), tou.deck);
			}
			deckContainer.appendTo(mainDiv);

			if (tou.state !== 4) {
				$('<div class="button_simple but_drop">Drop</div>').appendTo(mainDiv);
			}
		}
		else {
			let cont = $('<div class="flex_item"></div>');
			var select = $('<select id="deck_select">Select Deck</select>');
			decks.forEach((_deck) => {
				try {
					select.append(`<option value="${_deck.id}">${_deck.name}</option>`);
				}
				catch (e) {
					console.log(e);
				}
			});
			select.appendTo(cont);
			cont.appendTo(mainDiv);
			selectAdd(select, selectTourneyDeck);
			select.parent().css('width', '300px');
			select.parent().css('margin', '16px auto');

			if (tou.state == 0) {
				$('<div class="button_simple_disabled but_join">Join</div>').appendTo(mainDiv);
			}
			
			$('<div class="join_decklist"></div>').appendTo(mainDiv);
		}

		$(".but_join").click(function () {
			if ($(this).hasClass('button_simple')) {
				ipc_send('tou_join', {id: tou._id, deck: tournamentDeck});
			}
		});

		$(".but_drop").click(function () {
			ipc_send('tou_drop', tou._id);
		});
	}
	else {
		$(`<div class="tou_record green">${record}</div>`).appendTo(mainDiv);
		$(`<div class="tou_opp"><span>Your opponent: </span><span style="margin-left: 10px; color: rgb(250, 229, 210);">${tou.current_opponent}</span><div class="copy_button"></div></div>`).appendTo(mainDiv);

		$('.copy_button').click(() => {
			pop("Copied to clipboard", 1000);
			ipc_send('set_clipboard', tou.current_opponent);
		});

		let tabs = $('<div class="tou_tabs_cont"></div>');
		let tab_rounds = $('<div class="tou_tab tab_a tou_tab_selected">Rounds</div>');
		let tab_standings = $('<div class="tou_tab tab_b ">Standings</div>');
		let tab_decklist = $('<div class="tou_tab tab_c ">Decklist</div>');

		tab_rounds.appendTo(tabs);
		tab_standings.appendTo(tabs);
		tab_decklist.appendTo(tabs);
		tabs.appendTo(mainDiv);

		let tab_cont_a = $('<div class="tou_cont_a"></div>');
		for (let i=0; i<tou.currentRound+1; i++) {
			let rname = 'round_'+i;
			if (tou[rname] !== undefined) {
				$(`<div class="tou_round_title">Round ${i+1}</div>`).appendTo(tab_cont_a);
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
					let p1 = $(`<div ${s} class="tou_match_p ${match.p1}pn">${match.p1.slice(0, -6)+d1}<div class="${p1wc} tou_match_score">${match.p1w}</div></div>`);
					s = '';
					if (match.p2 == userName)	s = 'style="color: rgba(183, 200, 158, 1);"';
					let p2 = $(`<div ${s} class="tou_match_p ${match.p2}pn">${match.p2.slice(0, -6)+d2}<div class="${p2wc} tou_match_score">${match.p2w}</div></div>`);

					p1.appendTo(cont);
					p2.appendTo(cont);
					cont.appendTo(round_cont);
				})
				round_cont.appendTo(tab_cont_a);
			}
		}

		$('<div class="button_simple but_drop">Drop</div>').appendTo(tab_cont_a);

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

			let s = '';
			if (pname == userName)	s = 'style="color: rgba(183, 200, 158, 1);"';

			let str = `<div ${s} class="tou_stand_name">${pname.slice(0, -6)} ${tou.drops.indexOf(pname) !== -1 ? ' (drop)' : ''}</div>
			<div class="tou_stand_cell">${stat.mp}</div>
			<div class="tou_stand_cell">${stat.w}-${stat.d}-${stat.l}</div>
			<div class="tou_stand_cell">${stat.rpl}</div>
			<div class="tou_stand_cell">${stat.gpl}</div>
			<div class="tou_stand_cell">${Math.round(stat.omwp*10000)/100}%</div>
			<div class="tou_stand_cell">${Math.round(stat.gwp*10000)/100}%</div>
			<div class="tou_stand_cell">${Math.round(stat.ogwp*10000)/100}%</div>`;

			$(str).appendTo(line);
			line.appendTo(tab_cont_b);
		});

		let tab_cont_c = $('<div class="tou_cont_c" style="height: 0px"></div>');
		let decklistCont = $('<div class="sideboarder_container"></div>');

		tab_cont_a.appendTo(mainDiv);
		tab_cont_b.appendTo(mainDiv);

		$('<div class="button_simple exportDeck">Export to Arena</div>').appendTo(tab_cont_c);
		$('<div class="button_simple resetDeck">Reset</div>').appendTo(tab_cont_c);
		decklistCont.appendTo(tab_cont_c);

		tab_cont_c.appendTo(mainDiv);

		drawSideboardableDeck();

		$(".exportDeck").click(() => {
			let list = get_deck_export(currentDeck);
			ipc_send('set_clipboard', list);
		});

		$(".resetDeck").click(() => {
			currentDeck = $.extend(true, {}, originalDeck);
			drawSideboardableDeck();
		});

		$(".tou_tab").click(function () {
			if (!$(this).hasClass("tou_tab_selected")) {
				$(".tou_tab").each(function() {
					$(this).removeClass("tou_tab_selected");
				});
				$(this).addClass("tou_tab_selected");
				$(".tou_cont_a").css("height", "0px");
				$(".tou_cont_b").css("height", "0px");
				$(".tou_cont_c").css("height", "0px");
				if ($(this).hasClass('tab_a')) {
					$(".tou_cont_a").css("height", "auto");
				}
				if ($(this).hasClass('tab_b')) {
					$(".tou_cont_b").css("height", "auto");
				}
				if ($(this).hasClass('tab_c')) {
					$(".tou_cont_c").css("height", "auto");
				}
			}
		});

		$(".but_drop").click(function () {
			ipc_send('tou_drop', tou._id);
		});
	}


	$(".back").click(function () {
        change_background("default");
		$('.moving_ux').animate({'left': '0px'}, 250, 'easeInOutCubic'); 
	});
}

function selectTourneyDeck() {
	tournamentDeck = document.getElementById("deck_select").value;
	decks.forEach((_deck) => {
		if (_deck.id == tournamentDeck) {
			drawDeck($('.join_decklist'), _deck);
		}
	});
	
	$(".but_join").addClass("button_simple");
}

function drawSideboardableDeck() {
	let unique = makeId(4);
	let _div = $(".sideboarder_container");
	_div.html('');
	_div.css("dsiplay", "flex");
	let mainboardDiv = $('<div class="decklist_divided"></dii>');

	let size = 0;
	currentDeck.mainDeck.forEach(function(card) { size += card.quantity; });
	addCardSeparator(`Mainboard (${size})`, mainboardDiv);
	currentDeck.mainDeck.forEach(function(card) {
		let grpId = card.id;

		if (card.quantity > 0) {
			let tile = addCardTile(grpId, unique+"a", card.quantity, mainboardDiv);
			tile.children(".card_tile_glow").off("click");
			jQuery.data(tile[0], "board", 0);
			tile.click(function() {
				moveCard($(this)[0]);
				drawSideboardableDeck();
			});
		}
	});

	let sideboardDiv = $('<div class="decklist_divided"></dii>');

	if (currentDeck.sideboard != undefined) {
		if (currentDeck.sideboard.length > 0) {
			size = 0;
			currentDeck.sideboard.forEach(function(card) { size += card.quantity; });
			addCardSeparator(`Sideboard (${size})`, sideboardDiv);

			currentDeck.sideboard.forEach(function(card) {
				let grpId = card.id;
				if (card.quantity > 0) {
					let tile = addCardTile(grpId, unique+"b", card.quantity, sideboardDiv);
					tile.children(".card_tile_glow").off("click");
					jQuery.data(tile[0], "board", 1);
					tile.click(function() {
						moveCard($(this)[0]);
						drawSideboardableDeck();
					});
				}
			});
		}
	}

	_div.append(mainboardDiv);
	_div.append($('<div class="swap_icon"></div>'));
	_div.append(sideboardDiv);
}

function moveCard(_cardTile) {
	let grpId 		= jQuery.data(_cardTile, "grpId");
	let board 		= jQuery.data(_cardTile, "board");

	let moved = false;

	let _from = currentDeck.mainDeck;
	let _to = currentDeck.sideboard;
	if (board == 1) {
		_from = currentDeck.sideboard;
		_to = currentDeck.mainDeck;
	}

	_from.forEach(function(card, index, object) {
		if (!moved ) {
			if (grpId == card.id) {
				card.quantity -= 1;
				moved = true;
			}
			if (card.quantity == 0) {
				object.splice(index, 1);
			}
		}
	});
	let added = false;
	_to.forEach(function(card) {
		if (grpId == card.id) {
			card.quantity += 1;
			added = true;
		}
	});
	if (!added) {
		let obj = {id: grpId, quantity: 1};
		_to.push(obj);
	}
}

module.exports = {
    open_tournaments_tab: open_tournaments_tab,
    open_tournament: open_tournament
}