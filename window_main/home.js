/*
global
	timestamp,
	$$,
	userName,
	ipc_send,
	change_background,decks
	drawDeckVisual,
	selectAdd,
	addCardSeparator,
	addCardTile,
	get_deck_export,
	makeId,
	authToken,
	discordTag,
	shell,
	pop,
	toHHMMSS,
	createDivision
*/

let usersActive;
let tournaments_list;
let tournamentDeck = null;
let currentDeck = null;
let originalDeck = null;
let tou = null;
let listInterval = [];

let touStates = {};
let topWildcards = null;

let homeInterval = null;

// Should separate these two into smaller functions
function open_home_tab(arg, opentab = true) {
  let mainDiv = document.getElementById("ux_0");
  mainDiv.classList.remove("flex_item");
  mainDiv.innerHTML = "";

  if (arg) {
    tournaments_list = arg.tournaments;
    topWildcards = arg.wildcards;
    usersActive = arg.users_active;
    if (!opentab) return;
  }

  if (usersActive) {
    let d = createDivision(["list_fill"]);
    mainDiv.appendChild(d);
    let title = createDivision(["card_tile_separator"], "General");
    mainDiv.appendChild(title);
    let users = createDivision(
      ["text_centered"],
      "Users active: " + usersActive
    );
    users.setAttribute("tooltip-content", "In the last 24 hours.");
    users.setAttribute("tooltip-bottom", "");
    users.style.textAlign = "center";

    let daily = createDivision(
      ["text_centered", "white", "daily_left"],
      "Daily rewards end: -"
    );
    daily.style.textAlign = "center";

    let weekly = createDivision(
      ["text_centered", "white", "weekly_left"],
      "Weekly rewards end: -"
    );
    weekly.style.textAlign = "center";

    if (homeInterval !== null) clearInterval(homeInterval);

    homeInterval = window.setInterval(() => {
      let dd = new Date(rewards_daily_ends);
      let timeleft = dd.getTime() / 1000 - timestamp();
      $(".daily_left").html("Daily rewards end: " + toDDHHMMSS(timeleft));

      dd = new Date(rewards_weekly_ends);
      timeleft = dd.getTime() / 1000 - timestamp();
      $(".weekly_left").html("Weekly rewards end: " + toDDHHMMSS(timeleft));
    }, 250);

    mainDiv.appendChild(users);
    mainDiv.appendChild(daily);
    mainDiv.appendChild(weekly);
  }

  let d = createDivision(["list_fill"]);
  mainDiv.appendChild(d);
  let title = createDivision(["card_tile_separator"], "Tournaments");
  mainDiv.appendChild(title);
  let cont = createDivision(["tournament_list_cont"]);

  if (discordTag == null) {
    let but = $('<div class="discord_but"></div>');
    but.click(() => {
      let url =
        "https://discordapp.com/api/oauth2/authorize?client_id=531626302004789280&redirect_uri=http%3A%2F%2Fmtgatool.com%2Fdiscord%2F&response_type=code&scope=identify%20email&state=" +
        authToken;
      shell.openExternal(url);
    });

    but.appendTo(cont);
  } else {
    let dname = discordTag.split("#")[0];
    let fl = createDivision(
      ["flex_item"],
      `<div class="discord_icon"></div><div class="top_username discord_username">${dname}</div><div class="discord_message">Your discord tag will be visible to your opponents.</div>`
    );
    fl.style.margin = "auto";
    fl.style.width = "fit-content";
    mainDiv.appendChild(fl);

    listInterval.forEach(_id => {
      clearInterval(_id);
    });
    listInterval = [];
    if (tournaments_list) {
      // Create tournament button
      if (playerData.patreon) {
        let div = createDivision(["tou_container"]);
        div.id = "create";
        div.style.justifyContent = "center";
        let createBut = createDivision(["tou_create_but"]);
        let nam = createDivision(["tou_name"], "Create tournament");
        nam.style.width = "auto";

        div.appendChild(createBut);
        div.appendChild(nam);
        cont.appendChild(div);
      }

      // Tournaments list
      tournaments_list.forEach(function(tou, index) {
        let div = createDivision(["tou_container"]);
        div.id = tou._id;

        let stat = createDivision(["top_status"]);
        if (tou.state == -1) stat.classList.add("status_red");
        else if (tou.state == 4) stat.classList.add("status_black");
        else stat.classList.add("status_green");

        let sd = tou.signupDuration;
        let rd = tou.roundDuration;

        let roundsStart = tou.starts + sd * 60 * 60;
        let roundEnd =
          tou.starts + sd * 60 * 60 + (tou.currentRound + 1) * (60 * 60) * rd;

        let state = "-";
        let stateb = "-";
        if (tou.state == -1) {
          state = "";
          listInterval.push(
            window.setInterval(() => {
              let now = timestamp();
              $(".list_state_" + index).html(
                "Registration begins in " + toHHMMSS(now - tou.starts)
              );
            }, 250)
          );
        }
        if (tou.state == 0) {
          state = "Registration in progress.";
          stateb = "";
          listInterval.push(
            window.setInterval(() => {
              let now = timestamp();
              $(".list_stateb_" + index).html(
                toHHMMSS(roundsStart - now) + " left"
              );
            }, 250)
          );
        }
        if (tou.state == 1) {
          state =
            "Round " +
            (tou.currentRound + 1) +
            "/" +
            tou.maxRounds +
            " in progress.";
          stateb = "";
          listInterval.push(
            window.setInterval(() => {
              let now = timestamp();
              $(".list_stateb_" + index).html(toHHMMSS(roundEnd - now) + " left");
            }, 250)
          );
        }
        if (tou.state == 3) {
          state = "Top " + tou.top + " in progress.";
          stateb = "-";
        }
        if (tou.state == 4) {
          state = "Tournament finish.";
          stateb = "Winner: " + tou.winner.slice(0, -6);
        }

        let nam = createDivision(["tou_name"], tou.name);
        let fo = createDivision(["tou_cell"], tou.format);
        let st = createDivision(["tou_state", "list_state_" + index], state);
        let stb = createDivision(["tou_cell"], tou.players.length + " players.");
        let pln = createDivision(["tou_cell", "list_stateb_" + index], stateb);
        pln.style.width = "120px";
        div.appendChild(stat);
        div.appendChild(nam);
        div.appendChild(fo);
        div.appendChild(st);
        div.appendChild(stb);
        div.appendChild(pln);
        cont.appendChild(div);
      });
    }
  }

  mainDiv.appendChild(cont);

  $(".tou_container").each(function() {
    $(this).on("click", function() {
      let ti = $(this).attr("id");
      if (ti == "create") {
        createTournament();
      }
      else {
        document.body.style.cursor = "progress";
        ipc_send("tou_get", ti);
      }
    });
  });

  if (topWildcards) {
    d = createDivision(["list_fill"]);
    mainDiv.appendChild(d);
    title = createDivision(["card_tile_separator"], "Top Wildcards redeemed");
    title.setAttribute("tooltip-content", "In the last 15 days.");
    title.setAttribute("tooltip-bottom", "");
    mainDiv.appendChild(title);
    cont = createDivision(["top_wildcards_cont"]);

    let cell;
    cell = createDivision(["line_dark", "line_bottom_border"], "Top");
    cell.style.gridArea = `1 / 1 / auto / 3`;
    cont.appendChild(cell);

    cell = createDivision(["line_dark", "line_bottom_border"]);
    cell.style.gridArea = `1 / 3 / auto / 4`;
    cont.appendChild(cell);

    cell = createDivision(["line_dark", "line_bottom_border"], "Name");
    cell.style.gridArea = `1 / 4 / auto / 5`;
    cont.appendChild(cell);

    cell = createDivision(["line_dark", "line_bottom_border"], "Ammount");
    cell.style.gridArea = `1 / 5 / auto / 6`;
    cont.appendChild(cell);

    cell = createDivision(["line_dark", "line_bottom_border"]);
    cell.style.gridArea = `1 / 6 / auto / 8`;
    cont.appendChild(cell);

    topWildcards.forEach((wc, index) => {
      let card = cardsDb.get(wc.grpId);
      let ld = index % 2 ? "line_dark" : "line_light";

      cell = createDivision([ld], index + 1);
      cell.style.gridArea = `${index + 2} / 1 / auto / auto`;
      cell.style.textAlign = "center";
      cont.appendChild(cell);

      cell = createDivision(["top_wildcards_set_icon", ld]);
      cell.style.backgroundImage = `url(../images/sets/${
        setsList[card.set].code
      }.png)`;
      cell.title = card.set;
      cell.style.gridArea = `${index + 2} / 2 / auto / auto`;
      cont.appendChild(cell);

      cell = createDivision(["top_wildcards_set_icon", ld]);
      cell.style.backgroundImage = `url(../images/wc_${wc.rarity}.png)`;
      cell.title = wc.rarity;
      cell.style.gridArea = `${index + 2} / 3 / auto / auto`;
      cont.appendChild(cell);

      cell = createDivision([ld], card.name);
      cell.style.gridArea = `${index + 2} / 4 / auto / auto`;
      cell.style.textDecoration = "underline dotted";
      cont.appendChild(cell);
      addCardHover(cell, card);

      cell = createDivision([ld], wc.quantity);
      cell.style.gridArea = `${index + 2} / 5 / auto / auto`;
      cont.appendChild(cell);

      if (wc.change == 0) {
        cell = createDivision([ld]);
      } else {
        cell = createDivision([wc.change < 0 ? "arrow_down" : "arrow_up", ld]);
      }
      cell.style.gridArea = `${index + 2} / 6 / auto / auto`;
      cont.appendChild(cell);

      cell = createDivision([ld], (wc.change > 0 ? "+" : "") + wc.change);
      if (wc.change == 0) cell.innerHTML = "-";
      cell.style.gridArea = `${index + 2} / 7 / auto / auto`;
      cont.appendChild(cell);
    });

    mainDiv.appendChild(cont);
  }
}

let stateClockInterval = null;
let lastSeenInterval = null;

function createTournament() {
  $(".moving_ux").animate({ left: "-100%" }, 250, "easeInOutCubic");
  let mainDiv = $$("#ux_1")[0];
  mainDiv.innerHTML = "";
  // Top navigation stuff
  let top = createDivision(["decklist_top"]);
  let buttonBack = createDivision(["button", "back"]);
  let topTitle = createDivision(["deck_name"], "Create Tournament");
  let topStatus = createDivision(["tou_top_status"]);
  top.appendChild(buttonBack);
  top.appendChild(topTitle);
  top.appendChild(topStatus);

  // Append
  mainDiv.appendChild(top);
  buttonBack.addEventListener("click", () => {
    change_background("default");
    $(".moving_ux").animate({ left: "0px" }, 250, "easeInOutCubic");
  });
}

/* eslint-disable */
function open_tournament(t) {
  //console.log(t);
  tou = t;
  let mainDiv = $("#ux_1");
  mainDiv.html("");

  let sd = tou.signupDuration;
  let rd = tou.roundDuration;
  let roundsStart = tou.starts + sd * 60 * 60;
  let roundEnd =
    tou.starts + sd * 60 * 60 + (tou.currentRound + 1) * 60 * 60 * rd;

  if (tou.deck) {
    currentDeck = tou.deck;
    originalDeck = $.extend(true, {}, tou.deck);
  }

  let joined = false;
  let record = "-";
  let stats;
  if (tou.players.indexOf(playerData.name) !== -1) {
    joined = true;
    stats = tou.playerStats[playerData.name];
    record = stats.w + " - " + stats.d + " - " + stats.l;
  }

  let top = $(
    `<div class="decklist_top"><div class="button back"></div><div class="deck_name">${
      tou.name
    }</div></div>`
  );
  let flr = $(
    `<div class="tou_top_status state_clock" style="align-self: center;"></div>`
  );

  let state = "";
  if (stateClockInterval !== null) clearInterval(stateClockInterval);
  if (tou.state == -1) {
    state = "";
    stateClockInterval = window.setInterval(() => {
      let tst = timestamp();
      $(".state_clock").html(
        "Registration begin in " + toHHMMSS(tst - tou.starts)
      );
    }, 1000);
  }
  if (tou.state == 0) {
    state = "";
    stateClockInterval = window.setInterval(() => {
      let tst = timestamp();
      if (joined) {
        $(".state_clock").html("Starts in " + toHHMMSS(roundsStart - tst));
      } else {
        $(".state_clock").html(
          toHHMMSS(roundsStart - tst) + " left to register."
        );
      }
    }, 1000);
  }
  if (tou.state == 1) {
    state = "";
    stateClockInterval = window.setInterval(() => {
      let tst = timestamp();
      $(".state_clock").html(
        "Round " +
          (tou.currentRound + 1) +
          " ends in " +
          toHHMMSS(roundEnd - tst)
      );
    }, 1000);
  }
  if (tou.state == 3) {
    state = "";
    $(".state_clock").html("Top " + tou.top);
  }
  if (tou.state == 4) {
    state = "Tournament finish.";
  }

  flr.html(state);
  flr.appendTo(top);
  top.appendTo(mainDiv);

  let desc = $(
    `<div class="tou_desc" style="align-self: center;">${tou.desc}</div>`
  );
  desc.appendTo(mainDiv);

  if (tou.state <= 0) {
    showTournamentRegister(mainDiv, tou);
  } else {
    showTournamentStarted(mainDiv, tou);
  }

  $(".back").click(function() {
    change_background("default");
    $(".moving_ux").animate({ left: "0px" }, 250, "easeInOutCubic");
  });
}

function showTournamentRegister(mainDiv, tou) {
  let joined = false;
  if (tou.players.indexOf(playerData.name) !== -1) {
    joined = true;
  }

  if (joined) {
    let deckContainer = $('<div class="flex_item"></div>');
    let deckvisual = $('<div class="decklist"></div>');
    deckvisual.appendTo(deckContainer);
    if (tou.deck) {
      drawDeckVisual(deckvisual, undefined, tou.deck);
    }
    deckContainer.appendTo(mainDiv);

    if (tou.state !== 4) {
      $('<div class="button_simple but_drop">Drop</div>').appendTo(mainDiv);
    }
  } else {
    let cont = $('<div class="flex_item"></div>');
    var select = $('<select id="deck_select">Select Deck</select>');
    decks.forEach(_deck => {
      try {
        select.append(`<option value="${_deck.id}">${_deck.name}</option>`);
      } catch (e) {
        console.log(e);
      }
    });
    select.appendTo(cont);
    cont.appendTo(mainDiv);
    selectAdd(select, selectTourneyDeck);
    select.parent().css("width", "300px");
    select.parent().css("margin", "16px auto");

    if (tou.state == 0) {
      $('<div class="button_simple_disabled but_join">Join</div>').appendTo(
        mainDiv
      );
    }

    $('<div class="join_decklist"></div>').appendTo(mainDiv);
  }

  let list = $('<div class="tou_list_players"></div>');
  $(
    `<div class="tou_list_player_name tou_list_player_name_title">Players joined:</div>`
  ).appendTo(list);
  tou.players.forEach(p => {
    $(`<div class="tou_list_player_name">${p.slice(0, -6)}</div>`).appendTo(
      list
    );
  });
  $(`<br><br>`).appendTo(list);
  list.appendTo(mainDiv);

  $(".but_join").click(function() {
    if ($(this).hasClass("button_simple")) {
      ipc_send("tou_join", { id: tou._id, deck: tournamentDeck });
    }
  });

  $(".but_drop").click(function() {
    ipc_send("tou_drop", tou._id);
  });
}

function showTournamentStarted(mainDiv, tou) {
  let joined = false;
  if (tou.players.indexOf(playerData.name) !== -1) {
    joined = true;
    stats = tou.playerStats[playerData.name];
    record = stats.w + " - " + stats.d + " - " + stats.l;
  }

  if (tou.state !== 4) {
    $(`<div class="tou_reload"></div>`).appendTo(mainDiv);
  }
  if (joined) {
    $(`<div class="tou_record green">${record}</div>`).appendTo(mainDiv);
    if (tou.state !== 4) {
      $(
        `<div class="tou_opp"><span>On MTGA: </span><span style="margin-left: 10px; color: rgb(250, 229, 210);">${
          tou.current_opponent
        }</span><div class="copy_button copy_mtga"></div></div>`
      ).appendTo(mainDiv);
      $(
        `<div class="tou_opp"><span>On Discord: </span><span style="margin-left: 10px; color: rgb(250, 229, 210);">${
          tou.current_opponent_discord
        }</span><div class="copy_button copy_discord"></div></div>`
      ).appendTo(mainDiv);
      $(
        `<div class="tou_opp tou_opp_sub"><span class="last_seen_clock"></span></div></div>`
      ).appendTo(mainDiv);
    }

    if (lastSeenInterval !== null) clearInterval(lastSeenInterval);
    if (tou.current_opponent_last !== tou.server_time) {
      lastSeenInterval = window.setInterval(() => {
        let tst = timestamp();
        let diff = tst - tou.current_opponent_last;
        $(".last_seen_clock").html(`Last seen ${toHHMMSS(diff)} ago.`);
      }, 250);
    }

    if (
      tou.state !== 4 &&
      tou.current_opponent !== "bye" &&
      tou.current_opponent !== ""
    ) {
      let checks = $(`<div class="tou_checks"></div>`);
      generateChecks(
        tou.current_check,
        tou.current_seat
      ).appendTo(checks);
      checks.appendTo(mainDiv);
    }

    $(".copy_mtga").click(() => {
      pop("Copied to clipboard", 1000);
      ipc_send("set_clipboard", tou.current_opponent);
    });

    $(".copy_discord").click(() => {
      pop("Copied to clipboard", 1000);
      ipc_send("set_clipboard", tou.current_opponent_discord);
    });
  }

  let tabs = $('<div class="tou_tabs_cont"></div>');
  let tab_rounds = $(
    '<div class="tou_tab tab_a tou_tab_selected">Rounds</div>'
  );
  let tab_standings = $('<div class="tou_tab tab_b ">Standings</div>');

  tab_rounds.appendTo(tabs);
  tab_standings.appendTo(tabs);
  if (joined) {
    let tab_decklist = $('<div class="tou_tab tab_c">Decklist</div>');
    tab_decklist.appendTo(tabs);
    /*
    if (tou.current_opponent !== '' && tou.current_opponent !== 'bye') {
      let tab_chat = $('<div class="tou_tab tab_d">Chat</div>');
      tab_chat.appendTo(tabs);
    }
    */
  }

  tabs.appendTo(mainDiv);

  let tab_cont_a = $('<div class="tou_cont_a"></div>');

  // DRAW TOP 8
  if (tou.top > 0 && tou.state >= 3) {
    $(`<div class="tou_round_title">Top ${tou.top}</div>`).appendTo(
      tab_cont_a
    );

    let top_matches = [];
    let top_cont = $('<div class="tou_top"></div>');
    let m;
    let tou_cont_a = $('<div class="tou_top_cont"></div>');
    let tou_cont_b = $('<div class="tou_top_cont"></div>');
    let tou_cont_c = $('<div class="tou_top_cont"></div>');

    if (tou.top >= 2) {
      m = $('<div class="tou_match_cont top_0"></div>');
      top_matches.push(m);
      m.appendTo(tou_cont_c);
    }
    if (tou.top >= 4) {
      m = $('<div class="tou_match_cont top_1"></div>');
      top_matches.push(m);
      m.appendTo(tou_cont_b);
      m = $('<div class="tou_match_cont top_2"></div>');
      top_matches.push(m);
      m.appendTo(tou_cont_b);
    }
    if (tou.top >= 8) {
      m = $('<div class="tou_match_cont top_3"></div>');
      top_matches.push(m);
      m.appendTo(tou_cont_a);
      m = $('<div class="tou_match_cont top_4"></div>');
      top_matches.push(m);
      m.appendTo(tou_cont_a);
      m = $('<div class="tou_match_cont top_5"></div>');
      top_matches.push(m);
      m.appendTo(tou_cont_a);
      m = $('<div class="tou_match_cont top_6"></div>');
      top_matches.push(m);
      m.appendTo(tou_cont_a);
    }
    if (tou.top >= 8) tou_cont_a.appendTo(top_cont);
    if (tou.top >= 4) tou_cont_b.appendTo(top_cont);
    if (tou.top >= 2) tou_cont_c.appendTo(top_cont);
    top_cont.appendTo(tab_cont_a);

    tou["round_top"].forEach(function(match) {
      if (match.p1 == "") {
        match.p1 = "TBD#00000";
      }
      if (match.p2 == "") {
        match.p2 = "TBD#00000";
      }
      let cont = top_matches[match.id];

      let p1wc = "";
      let p2wc = "";
      if (match.winner == 1) {
        p1wc = "tou_score_win";
      }
      if (match.winner == 2) {
        p2wc = "tou_score_win";
      }

      let d1 = "";
      let d2 = "";
      if (match.p2 == "bye") match.p2 = "BYE#00000";
      try {
        if (match.drop1) d1 = " (drop)";
        if (match.drop2) d2 = " (drop)";
      } catch (e) {
        console.error(e);
      }

      let s = "";
      if (match.p1 == userName) s = 'style="color: rgba(183, 200, 158, 1);"';
      if (match.p1 == "TBD#00000")
        s = 'style="color: rgba(250, 229, 210, 0.65);"';

      let p1 = $(
        `<div ${s} class="tou_match_p ${match.p1}pn">${match.p1.slice(0, -6) +
          d1}<div class="${p1wc} tou_match_score">${match.p1w}</div></div>`
      );
      s = "";
      if (match.p2 == userName) s = 'style="color: rgba(183, 200, 158, 1);"';
      if (match.p2 == "TBD#00000")
        s = 'style="color: rgba(250, 229, 210, 0.65);"';
      let p2 = $(
        `<div ${s} class="tou_match_p ${match.p2}pn">${match.p2.slice(0, -6) +
          d2}<div class="${p2wc} tou_match_score">${match.p2w}</div></div>`
      );

      p1.appendTo(cont);
      p2.appendTo(cont);
    });
  }

  // DRAW ROUNDS
  for (let i = tou.currentRound; i >= 0; i--) {
    let rname = "round_" + i;
    if (tou[rname] !== undefined) {
      $(`<div class="tou_round_title">Round ${i + 1}</div>`).appendTo(
        tab_cont_a
      );
      let round_cont = $('<div class="tou_round_cont"></div>');

      tou[rname].forEach(function(match) {
        let cont = $('<div class="tou_match_cont"></div>');
        let p1wc = "";
        let p2wc = "";
        if (match.winner == 1) {
          p1wc = "tou_score_win";
        }
        if (match.winner == 2) {
          p2wc = "tou_score_win";
        }

        let d1 = "";
        let d2 = "";
        if (match.p2 == "bye") match.p2 = "BYE#00000";
        try {
          if (match.drop1) d1 = " (drop)";
          if (match.drop2) d2 = " (drop)";
        } catch (e) {
          console.error(e);
        }

        let s = "";
        if (match.p1 == playerData.name)
          s = 'style="color: rgba(183, 200, 158, 1);"';
        let p1 = $(
          `<div ${s} class="tou_match_p ${match.p1}pn">${match.p1.slice(
            0,
            -6
          ) + d1}<div class="${p1wc} tou_match_score">${
            match.p1w
          }</div></div>`
        );
        s = "";
        if (match.p2 == playerData.name)
          s = 'style="color: rgba(183, 200, 158, 1);"';
        if (match.p2 == "BYE#00000")
          s = 'style="color: rgba(250, 229, 210, 0.65);"';
        let p2 = $(
          `<div ${s} class="tou_match_p ${match.p2}pn">${match.p2.slice(
            0,
            -6
          ) + d2}<div class="${p2wc} tou_match_score">${
            match.p2w
          }</div></div>`
        );

        p1.appendTo(cont);
        p2.appendTo(cont);
        cont.appendTo(round_cont);
      });
      round_cont.appendTo(tab_cont_a);
    }
  }

  // DRAW DROP
  if (joined) {
    $('<div class="button_simple but_drop">Drop</div>').appendTo(tab_cont_a);
  }

  // SORT PLAYERS
  let tab_cont_b = $('<div class="tou_cont_b" style="height: 0px"></div>');
  tou.players.sort(function(a, b) {
    if (tou.playerStats[a].mp > tou.playerStats[b].mp) return -1;
    else if (tou.playerStats[a].mp < tou.playerStats[b].mp) return 1;
    else {
      if (tou.playerStats[a].omwp > tou.playerStats[b].omwp) return -1;
      else if (tou.playerStats[a].omwp < tou.playerStats[b].omwp) return 1;
      else {
        if (tou.playerStats[a].gwp > tou.playerStats[b].gwp) return -1;
        else if (tou.playerStats[a].gwp < tou.playerStats[b].gwp) return 1;
        else {
          if (tou.playerStats[a].ogwp > tou.playerStats[b].ogwp) return -1;
          else if (tou.playerStats[a].ogwp < tou.playerStats[b].ogwp)
            return 1;
        }
      }
    }
    return 0;
  });

  let desc = $(
    `<div class="tou_desc" style="align-self: center;">Points are updated only when a round ends.</div>`
  );
  desc.appendTo(tab_cont_b);

  let line = $('<div class="tou_stand_line_title line_dark"></div>');
  $(`
    <div class="tou_stand_small">Pos</div>
    <div class="tou_stand_name" style="width: 206px;">Name</div>
    <div class="tou_stand_cell">Points</div>
    <div class="tou_stand_cell">Score</div>
    <div class="tou_stand_cell">Matches</div>
    <div class="tou_stand_cell">Games</div>
    <div class="tou_stand_cell">OMW</div>
    <div class="tou_stand_cell">GW</div>
    <div class="tou_stand_cell">OGW</div>
  `).appendTo(line);
  line.appendTo(tab_cont_b);

  // DRAW STANDINGS
  tou.players.forEach(function(pname, index) {
    let stat = tou.playerStats[pname];
    if (index % 2) {
      line = $('<div class="tou_stand_line line_dark"></div>');
    } else {
      line = $('<div class="tou_stand_line"></div>');
    }

    let s = "";
    if (pname == playerData.name) s = 'style="color: rgba(183, 200, 158, 1);"';

    let str = `
    <div class="tou_stand_small">${index + 1}</div>
    <img src="blank.gif" class="flag tou_flag flag-${tou.flags[
      pname
    ].toLowerCase()}" />
    <div ${s} class="tou_stand_name">${pname.slice(0, -6)} ${
      tou.drops.indexOf(pname) !== -1 ? " (drop)" : ""
    }</div>
    <div class="tou_stand_cell">${stat.mp}</div>
    <div class="tou_stand_cell">${stat.w}-${stat.d}-${stat.l}</div>
    <div class="tou_stand_cell">${stat.rpl}</div>
    <div class="tou_stand_cell">${stat.gpl}</div>
    <div class="tou_stand_cell">${Math.round(stat.omwp * 10000) / 100}%</div>
    <div class="tou_stand_cell">${Math.round(stat.gwp * 10000) / 100}%</div>
    <div class="tou_stand_cell">${Math.round(stat.ogwp * 10000) / 100}%</div>`;

    $(str).appendTo(line);
    line.appendTo(tab_cont_b);
  });

  // DRAW DECK (ex sideboarder)
  tab_cont_a.appendTo(mainDiv);
  tab_cont_b.appendTo(mainDiv);
  if (joined) {
    let tab_cont_c = $('<div class="tou_cont_c" style="height: 0px"></div>');
    let decklistCont = $('<div class="sideboarder_container"></div>');

    $('<div class="button_simple exportDeck">Export to Arena</div>').appendTo(
      tab_cont_c
    );
    decklistCont.appendTo(tab_cont_c);

    tab_cont_c.appendTo(mainDiv);

    drawSideboardableDeck();

    $(".exportDeck").click(() => {
      let list = get_deck_export(currentDeck);
      ipc_send("set_clipboard", list);
    });
  }

  $(".tou_tab").click(function() {
    if (!$(this).hasClass("tou_tab_selected")) {
      $(".tou_tab").each(function() {
        $(this).removeClass("tou_tab_selected");
      });
      $(this).addClass("tou_tab_selected");
      $(".tou_cont_a").css("height", "0px");
      $(".tou_cont_b").css("height", "0px");
      $(".tou_cont_c").css("height", "0px");
      $(".tou_cont_d").css("height", "0px");
      if ($(this).hasClass("tab_a")) {
        $(".tou_cont_a").css("height", "auto");
      }
      if ($(this).hasClass("tab_b")) {
        $(".tou_cont_b").css("height", "auto");
      }
      if ($(this).hasClass("tab_c")) {
        $(".tou_cont_c").css("height", "auto");
      }
      if ($(this).hasClass("tab_d")) {
        $(".tou_cont_d").css("height", "auto");
      }
    }
  });

  if (joined) {
    $(".tou_reload").click(() => {
      open_tournament(tou);
    });
    $(".but_drop").click(() => {
      ipc_send("tou_drop", tou._id);
    });
  }
}

function set_tou_state(state) {
  touStates[state.tid] = state;
  if (state.tid == tou._id) {
    $(".tou_checks").html("");
    $(".tou_checks").append(
      generateChecks(state.check, state.game, state.seat)
    );
  }
}

function generateChecks(state, seat) {
  let checks = $('<div class="tou_check_cont"></div>');
  state.forEach((c, index) => {
    let ch;
    let ss = index % 2;
    ch = $(
      `<div title="${
        ss == seat ? "You" : tou.current_opponent.slice(0, -6)
      }" class="tou_check ${c ? "green_bright_bg" : "red_bright_bg"}"></div>`
    );
    ch.appendTo(checks);
  });

  return checks;
}

function selectTourneyDeck() {
  tournamentDeck = document.getElementById("deck_select").value;
  decks.forEach(_deck => {
    if (_deck.id == tournamentDeck) {
      drawDeck($(".join_decklist"), _deck, true);
    }
  });

  $(".but_join").addClass("button_simple");
}

function drawSideboardableDeck() {
  let unique = makeId(4);
  let _div = $(".sideboarder_container");
  _div.html("");
  _div.css("dsiplay", "flex");
  let mainboardDiv = $('<div class="decklist_divided"></dii>');

  currentDeck.mainDeck.sort(compare_cards);
  currentDeck.sideboard.sort(compare_cards);

  let size = 0;
  currentDeck.mainDeck.forEach(function(card) {
    size += card.quantity;
  });
  addCardSeparator(`Mainboard (${size})`, mainboardDiv);
  currentDeck.mainDeck.forEach(function(card) {
    let grpId = card.id;

    if (card.quantity > 0) {
      let tile = addCardTile(grpId, unique + "a", card.quantity, mainboardDiv);
    }
  });

  let sideboardDiv = $('<div class="decklist_divided"></dii>');

  if (currentDeck.sideboard != undefined) {
    if (currentDeck.sideboard.length > 0) {
      size = 0;
      currentDeck.sideboard.forEach(function(card) {
        size += card.quantity;
      });
      addCardSeparator(`Sideboard (${size})`, sideboardDiv);

      currentDeck.sideboard.forEach(function(card) {
        let grpId = card.id;
        if (card.quantity > 0) {
          let tile = addCardTile(
            grpId,
            unique + "b",
            card.quantity,
            sideboardDiv
          );
        }
      });
    }
  }

  _div.append(mainboardDiv);
  _div.append(sideboardDiv);
}

module.exports = {
  open_home_tab: open_home_tab,
  open_tournament: open_tournament,
  set_tou_state: set_tou_state
};
