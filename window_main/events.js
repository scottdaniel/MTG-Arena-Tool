
//
function openEventsTab(loadMore) {
	var mainDiv = document.getElementById("ux_0");
	if (loadMore <= 0) {
		loadMore = 25;
		eventsHistory.courses.sort(compare_courses); 

		mainDiv.classList.remove("flex_item");
		mainDiv.innerHTML = '';

		var d = createDivision(["list_fill"]);
		mainDiv.appendChild(d);

		loadEvents = 0;
	}

	//console.log("Load more: ", loadEvents, loadMore, loadEvents+loadMore);
	for (var loadEnd = loadEvents + loadMore; loadEvents < loadEnd; loadEvents++) {
		var course_id = eventsHistory.courses[loadEvents];
		var course = eventsHistory[course_id];

		if (course == undefined) continue;
		if (course.CourseDeck == undefined) continue;

		var div = createDivision([course.id, "list_match"]);

		var fltl = createDivision(["flex_item"]);

		var fll = createDivision(["flex_item"]);
		fll.style.flexDirection = "column";

		var flt = createDivision(["flex_top"]);
		fll.appendChild(flt);

		var flb = createDivision(["flex_bottom"]);
		fll.appendChild(flb);

		var flc = createDivision(["flex_item"]);
		flc.style.flexDirection = "column";
		flc.style.flexGrow = 2;

		var fct = createDivision(["flex_top"]);
		flc.appendChild(fct);

		var fcb = createDivision(["flex_bottom"]);
		fcb.style.marginRight = "14px";
		flc.appendChild(fcb);

		var flr = createDivision(["flex_item"]);

		var tileGrpid = course.CourseDeck.deckTileId;
		try {
			cardsDb.get(tileGrpid).set;
		}
		catch (e) {
			tileGrpid = 67003;
		}

		var tile = createDivision([course.id+"t", "deck_tile"]);

		try {
			tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";
		}
		catch (e) {
			console.error(e, tileGrpid);
		}
		fltl.appendChild(tile);

		d =  createDivision(["list_deck_name"], getReadableEvent(course.InternalEventName));
		flt.appendChild(d);

		course.CourseDeck.colors.forEach(function(color) {
			var m = createDivision(["mana_s20", "mana_"+mana[color]]);
			flb.appendChild(m);
		});

		if (course.CurrentEventState == "DoneWithMatches" || course.CurrentEventState == 2) {
			var d = createDivision(["list_event_phase"], "Completed");
		}
		else {
			var d = createDivision(["list_event_phase_red"], "In progress");
		}
		fct.appendChild(d);

		d = createDivision(["list_match_time"], timeSince(new Date(course.date))+' ago.');
		fcb.appendChild(d);

		var wlGate = course.ModuleInstanceData.WinLossGate;

		if (wlGate == undefined) {
			d = createDivision(["list_match_result_win"], "0:0");
			flr.appendChild(d);
		}
		else {
			if (wlGate.MaxWins == wlGate.CurrentWins) {
				d = createDivision(["list_match_result_win"], wlGate.CurrentWins +":"+wlGate.CurrentLosses);
				flr.appendChild(d);
			}
			else {
				d = createDivision(["list_match_result_loss"], wlGate.CurrentWins +":"+wlGate.CurrentLosses);
				flr.appendChild(d);
			}
		}

		var divExp = createDivision([course.id+"exp", "list_event_expand"]);

		var fldel = createDivision(["flex_item", course.id+"_del", "delete_item"]);
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
		if (Math.round($(this).scrollTop() + $(this).innerHeight()) >= $(this)[0].scrollHeight) {
			openEventsTab(20);
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

					var div = createDivision([match.id, "list_match"]);

					var fltl = createDivision(["flex_item"]);

					var fll = createDivision(["flex_item"]);
					fll.style.flexDirection = "column";

					var flt = createDivision(["flex_top"]);
					fll.appendChild(flt);

					var flb = createDivision(["flex_bottom"]);
					fll.appendChild(flb);

					var flc = createDivision(["flex_item"]);
					flc.style.flexDirection = "column";
					flc.style.flexGrow = 2;

					var fct = createDivision(["flex_top"]);
					flc.appendChild(fct);

					var fcb = createDivision(["flex_bottom"]);
					fcb.style.marginRight = "14px";
					flc.appendChild(fcb);

					var flr = createDivision(["flex_item"]);

					var tileGrpid = match.playerDeck.deckTileId;
					try {
						cardsDb.get(tileGrpid).images["art_crop"];
					}
					catch (e) {
						tileGrpid = 67003;
					}

					var tile = createDivision([match.id+"t", "deck_tile"]);

					try {
						tile.style.backgroundImage = "url(https://img.scryfall.com/cards"+cardsDb.get(tileGrpid).images["art_crop"]+")";
					}
					catch (e) {timeSince(new Date(match.date))+' ago - '+toMMSS(match.duration)
						console.error(e)
					}
					//fltl.appendChild(tile);

					var d = createDivision(["list_deck_name"], match.playerDeck.name);
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

					if (match.player.win > match.opponent.win) {
						d = createDivision(["list_match_result_win"], match.player.win +":"+match.opponent.win);
						flr.appendChild(d);
					}
					else {
						d = createDivision(["list_match_result_loss"], match.player.win +":"+match.opponent.win);
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

module.exports = {
	openEventsTab: openEventsTab,
	expandEvent: expandEvent
};

