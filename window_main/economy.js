/*
global
	daysPast,
	get_colation_set,
	getEventId,
	setsList,
	cardQuality,
	addCardHover,
	cardsDb,
	shell,
	get_set_scryfall,
	collectionSortRarity,
	addCardHover,
	selectAdd,
	economyHistory
*/


var loadEconomy = 0;
let filterEconomy = 'All';
let daysago = 0;
let dayList = [];

class economyDay {
	constructor(goldEarned = 0, gemsEarned = 0, goldSpent = 0, gemsSpent = 0) {
		this.goldEarned = goldEarned;
		this.gemsEarned = gemsEarned;
		this.goldSpent = goldSpent;
		this.gemsSpent = gemsSpent;
	}
}

function open_economy_tab(loadMore) {
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
		let icwcc = document.createElement("div");
		icwcc.classList.add("economy_wc_med");
		icwcc.classList.add("wc_common");
		icwcc.title = "Common Wildcards";

		let icwcu = document.createElement("div");
		icwcu.classList.add("economy_wc_med");
		icwcu.classList.add("wc_uncommon");
		icwcu.title = "Uncommon Wildcards";

		let icwcr = document.createElement("div");
		icwcr.classList.add("economy_wc_med");
		icwcr.classList.add("wc_rare");
		icwcr.title = "Rare Wildcards";

		let icwcm = document.createElement("div");
		icwcm.classList.add("economy_wc_med");
		icwcm.classList.add("wc_mythic");
		icwcm.title = "Mythic Wildcards";

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
		else if (change.context == "Redeem Wildcard") {
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
				}
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
			open_economy_tab(20);
		}
	})

	loadEconomy = loadEnd;
}

function updateEconomy() {
	filterEconomy = getEventId(document.getElementById("query_select").value);
	open_economy_tab(0);
}

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

module.exports = {
	open_economy_tab: open_economy_tab
}
