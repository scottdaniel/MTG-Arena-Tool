/*
global
	$,
	daysPast,
	get_colation_set,
	getEventId,
	setsList,
	addCardHover,
	cardsDb,
	shell,
	get_set_scryfall,
	collectionSortRarity,
	addCardHover,
	selectAdd,
	economyHistory,
	get_card_image,
	createDivision
*/


var loadEconomy = 0;
var filterEconomy = 'All';
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


// creates the economy tab.
// if loadMore is 0 then:
//   the UI is created and the top 25 results are 
//   loaded based on the current filter.
// if loadMore is >0 then a further loadMore are added 
//   to the current UI.
// 
function openEconomyTab(loadMore) {
	var mainDiv = document.getElementById("ux_0");
	if (loadMore <= 0) {
		createEconomyUI(mainDiv);
		loadMore = 25;
	}

	//console.log("Load more: ", loadEconomy, loadMore, loadEconomy+loadMore);
	
	// Loop round economyHistory changes and print out 1 row per change
	for (var loadEnd = loadEconomy + loadMore; loadEconomy < loadEnd; loadEconomy++) {
		let economy_id = economyHistory.changes[loadEconomy];
		let change = economyHistory[economy_id];

		if (change == undefined) continue;

		// print out daily summaries but no sub-events
		if (filterEconomy === 'Day Summaries' && daysago != daysPast(change.date)) {
			mainDiv.appendChild(createDayHeader(change));
			loadEnd++;
			continue;
		}

		if (filterEconomy !== 'All' && change.context !== filterEconomy) {
			loadEnd++;
			continue;
		}

		if (daysago != daysPast(change.date)) {
			mainDiv.appendChild(createDayHeader(change));
		}

		var div = createChangeRow(change, economy_id);
		mainDiv.appendChild(div);

		$('.list_economy_awarded').on("mousewheel", function(e) {
			var delta = (parseInt(e.originalEvent.deltaY)/40);
			this.scrollLeft += delta;
			e.preventDefault();
		});

	}

	$(this).off();
	$("#ux_0").on('scroll', function() {
		if (Math.round($(this).scrollTop() + $(this).innerHeight()) >= $(this)[0].scrollHeight) {
			openEconomyTab(20);
		}
	})

	loadEconomy = loadEnd;
}


function createDayHeader(change) {
	daysago = daysPast(change.date);
	let dd = new Date(change.date);
	let div = createDivision(["economy_title", "flex_item"])

	let fll = createDivision(["flex_item"])
	fll.style.lineHeight = "64px";

	if (daysago == 0) 	fll.innerHTML =  "Today";
	if (daysago == 1) 	fll.innerHTML =  "Yesterday";
	if (daysago > 1) 	fll.innerHTML =  daysago+" Days ago. ("+dd.toDateString()+")";

	let flr = createDivision(["economy_day_stats", "flex_item"])

	let icgo = createDivision(["economy_gold_med"])
	icgo.title = "Gold";

	let icge = createDivision(["economy_gems_med"])
	icge.style.marginLeft = "24px";
	icge.title = "Gems";

	let up = createDivision(["economy_up"])

	let down = createDivision(["economy_down"])

	let tx = createDivision();
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
	return div;
}

function createChangeRow(change, economy_id) {


	var flb = createDivision(["flex_bottom"])
	var flr = createDivision(["tiny_scroll", "list_economy_awarded"])

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

			var bos = createDivision(["set_logo"])
			bos.style.backgroundImage = 'url(../images/sets/'+setsList[set].code+'.png)';
			bos.title = set;

			var bon = createDivision();
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

		bos = createDivision(["economy_ticket_med"])
		bos.title = "Event Entry";

		flr.appendChild(bos);
	}
	else if (change.context == "Redeem Wildcard") {
		var imgUri = "";
		if (change.delta.wcCommonDelta != undefined)	imgUri = "wc_common";
		if (change.delta.wcUncommonDelta != undefined)	imgUri = "wc_uncommon";
		if (change.delta.wcRareDelta != undefined)		imgUri = "wc_rare";
		if (change.delta.wcMythicDelta != undefined)	imgUri = "wc_mythic";
		if (imgUri != "") {
			bos = createDivision(["economy_wc"])
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
		bos = createDivision(["economy_gems"])
		bos.title = "Gems";

		bon = createDivision();
		bon.style.lineHeight = "32px";
		bon.classList.add("economy_sub");
		bon.innerHTML = Math.abs(change.delta.gemsDelta);

		flb.appendChild(bos);
		flb.appendChild(bon);
	}

	if (checkGoldPaid && change.delta.goldDelta != undefined) {
		bos = createDivision(["economy_gold"])
		bos.title = "Gold";

		bon = createDivision();
		bon.style.lineHeight = "32px";
		bon.classList.add("economy_sub");
		bon.innerHTML = Math.abs(change.delta.goldDelta);

		flb.appendChild(bos);
		flb.appendChild(bon);
	}

	if (checkGemsEarnt && change.delta.gemsDelta != undefined) {
		bos = createDivision(["economy_gems_med"])
		bos.title = "Gems";

		bon = createDivision();
		bon.style.lineHeight = "64px";
		bon.classList.add("economy_sub");
		bon.innerHTML = Math.abs(change.delta.gemsDelta);

		flr.appendChild(bos);
		flr.appendChild(bon);
	}

	if (checkGoldEarnt && change.delta.goldDelta != undefined) {
		bos = createDivision(["economy_gold_med"])
		bos.title = "Gold";

		bon = createDivision();
		bon.style.lineHeight = "64px";
		bon.classList.add("economy_sub");
		bon.innerHTML = Math.abs(change.delta.goldDelta);

		flr.appendChild(bos);
		flr.appendChild(bon);
	}

	if (checkBoosterAdded && change.delta.boosterDelta != undefined) {
		change.delta.boosterDelta.forEach(function(booster) {
			var set = get_colation_set(booster.collationId);

			var bos = createDivision(["set_logo_med"])
			bos.style.backgroundImage = 'url(../images/sets/'+setsList[set].code+'.png)';
			bos.title = set;

			var bon = createDivision();
			bon.style.lineHeight = "64px";
			bon.classList.add("economy_sub");
			bon.innerHTML = "x"+Math.abs(booster.count);

			flr.appendChild(bos);
			flr.appendChild(bon);
		});
	}

	if (checkWildcardsAdded) {
		if (change.delta.wcCommonDelta != undefined) {
			bos = createDivision(["economy_wc"])
			bos.title = 'Common Wildcard';
			bos.style.margin = 'auto 4px';
			bos.style.backgroundImage = 'url(../images/wc_common.png)';
			bon = createDivision();
			bon.style.lineHeight = "64px";
			bon.classList.add("economy_sub");
			bon.innerHTML = "x"+Math.abs(change.delta.wcCommonDelta);
			flr.appendChild(bos);
			flr.appendChild(bon);
		}

		if (change.delta.wcUncommonDelta != undefined) {
			bos = createDivision(["economy_wc"])
			bos.title = 'Uncommon Wildcard';
			bos.style.margin = 'auto 4px';
			bos.style.backgroundImage = 'url(../images/wc_uncommon.png)';
			bon = createDivision();
			bon.style.lineHeight = "64px";
			bon.classList.add("economy_sub");
			bon.innerHTML = "x"+Math.abs(change.delta.wcUncommonDelta);
			flr.appendChild(bos);
			flr.appendChild(bon);
		}

		if (change.delta.wcRareDelta != undefined) {
			bos = createDivision(["economy_wc"])
			bos.title = 'Rare Wildcard';
			bos.style.margin = 'auto 4px';
			bos.style.backgroundImage = 'url(../images/wc_rare.png)';
			bon = createDivision();
			bon.style.lineHeight = "64px";
			bon.classList.add("economy_sub");
			bon.innerHTML = "x"+Math.abs(change.delta.wcRareDelta);
			flr.appendChild(bos);
			flr.appendChild(bon);
		}
		if (change.delta.wcMythicDelta != undefined) {
			bos = createDivision(["economy_wc"])
			bos.title = 'Mythic Wildcard';
			bos.style.margin = 'auto 4px';
			bos.style.backgroundImage = 'url(../images/wc_mythic.png)';
			bon = createDivision();
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
			let draw = false;
			if (card) {
				if (change.delta.cardsAdded) {
					if (change.delta.cardsAdded.indexOf(grpId) == -1) {
						draw = true;
					}
				}
				else {
					draw = true;
				}
			}
			if (draw) {
				var d = createDivision(["inventory_card"])
				d.style.width = "39px";

				var img = document.createElement("img");
				img.classList.add("inventory_card_img");
				img.classList.add("inventory_card_aetherized");
				img.style.width = "39px";
				img.src = get_card_image(card);

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
			}
		});
	}

	if (checkCardsAdded && change.delta.cardsAdded != undefined) {
		change.delta.cardsAdded.sort(collectionSortRarity);
		change.delta.cardsAdded.forEach(function(grpId) {
			var card = cardsDb.get(grpId);

			var d = createDivision(["inventory_card"])
			d.style.width = "39px";

			var img = document.createElement("img");
			img.classList.add("inventory_card_img");
			img.style.width = "39px";
			img.src = get_card_image(card);

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


	// DOM hierarchy is:
	// div
	//   fll
	//      flt
    //      flb
    //   flr

	var flt = createDivision(["flex_top", "economy_sub"])
	flt.style.lineHeight = "32px";
	flt.innerHTML = change.context;


	var fll = createDivision(["flex_item"])
	fll.style.flexDirection = "column";
	fll.appendChild(flt);
	fll.appendChild(flb);

	var div = createDivision([economy_id, "list_economy"]);
	div.appendChild(fll);
	div.appendChild(flr);

	return div;
}

function createEconomyUI(mainDiv) {
	daysago = 0;
	dayList = [];
	dayList[0] = new economyDay();
	economyHistory.changes.sort(compare_economy); 

	var selectItems = ["All", "Day Summaries"];
	for (var n = 0; n < economyHistory.changes.length; n++) {
		let economy_id = economyHistory.changes[n];
		let change = economyHistory[economy_id];

		if (change == undefined) continue;

		if (!selectItems.includes(change.context)) {
			selectItems.push(change.context);
		}		

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

	var d = createDivision(["list_fill"])

	let div = createDivision(["list_economy_top", "flex_item"])

	//
	var selectdiv = createDivision();
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
	let icwcc = createDivision(["economy_wc_med", "wc_common"])
	icwcc.title = "Common Wildcards";

	let icwcu = createDivision(["economy_wc_med", "wc_uncommon"])
	icwcu.title = "Uncommon Wildcards";

	let icwcr = createDivision(["economy_wc_med", "wc_rare"])
	icwcr.title = "Rare Wildcards";

	let icwcm = createDivision(["economy_wc_med", "wc_mythic"])
	icwcm.title = "Mythic Wildcards";

	let icgo = createDivision(["economy_gold_med"])
	icgo.title = "Gold";

	let icge = createDivision(["economy_gems_med"])
	icge.style.marginLeft = "24px";
	icge.title = "Gems";

	let tx = createDivision();
	tx.style.lineHeight = "64px";
	tx.classList.add("economy_sub");

	div.appendChild(icwcc);
	let ntx = tx.cloneNode(true);
	ntx.innerHTML = economyHistory.wcCommon;
	div.appendChild(ntx);

	div.appendChild(icwcu);
	ntx = tx.cloneNode(true);
	ntx.innerHTML = economyHistory.wcUncommon;
	div.appendChild(ntx);

	div.appendChild(icwcr);
	ntx = tx.cloneNode(true);
	ntx.innerHTML = economyHistory.wcRare;
	div.appendChild(ntx);

	div.appendChild(icwcm);
	ntx = tx.cloneNode(true);
	ntx.innerHTML = economyHistory.wcMythic;
	div.appendChild(ntx);


	div.appendChild(icgo);
	ntx = tx.cloneNode(true);
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

	loadEconomy = 0;
	daysago = -1;
}

function updateEconomy() {
	filterEconomy = getEventId(document.getElementById("query_select").value);
	openEconomyTab(0);
}

// Compare two economy events OR the IDs of two economy events.
// If two IDs are specified then events are retrieved from `economyHistory`

function compare_economy(a, b) {
	/* global economyHistory */
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

module.exports = {
	open_economy_tab: openEconomyTab
}
