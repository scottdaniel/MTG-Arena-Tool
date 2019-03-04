/* eslint-disable */

function onLabelOutLogInfo(entry, json) {
  if (!json) return;
  if (skipMatch) return;

  if (json.params.messageName == "DuelScene.GameStop") {
    var payload = json.params.payloadObject;
    var mid = payload.matchId;
    var time = payload.secondsCount;
    if (mid == currentMatch.matchId) {
      gameNumberCompleted = payload.gameNumber;
      currentMatch.matchTime += time;

      let game = {};
      game.shuffledOrder = [];
      for (let i = 0; i < initialLibraryInstanceIds.length; i++) {
        let instance = initialLibraryInstanceIds[i];
        while (
          (!instanceToCardIdMap[instance] ||
            !cardsDb.get(instanceToCardIdMap[instance])) &&
          idChanges[instance]
        ) {
          instance = idChanges[instance];
        }
        let cardId = instanceToCardIdMap[instance];
        if (cardsDb.get(cardId)) {
          game.shuffledOrder.push(cardId);
        } else {
          break;
        }
      }
      game.handsDrawn = payload.mulliganedHands.map(hand =>
        hand.map(card => card.grpId)
      );
      game.handsDrawn.push(
        game.shuffledOrder.slice(0, 7 - game.handsDrawn.length)
      );

      if (gameNumberCompleted > 1) {
        let deckDiff = {};
        currentMatch.player.deck.mainDeck.forEach(card => {
          deckDiff[card.id] = card.quantity;
        });
        originalDeck.mainDeck.forEach(card => {
          deckDiff[card.id] = (deckDiff[card.id] || 0) - card.quantity;
        });
        matchGameStats.forEach((stats, i) => {
          if (i !== 0) {
            let prevChanges = stats.sideboardChanges;
            prevChanges.added.forEach(
              id => (deckDiff[id] = (deckDiff[id] || 0) - 1)
            );
            prevChanges.removed.forEach(
              id => (deckDiff[id] = (deckDiff[id] || 0) + 1)
            );
          }
        });

        let sideboardChanges = {
          added: [],
          removed: []
        };
        Object.keys(deckDiff).forEach(id => {
          let quantity = deckDiff[id];
          for (let i = 0; i < quantity; i++) {
            sideboardChanges.added.push(id);
          }
          for (let i = 0; i > quantity; i--) {
            sideboardChanges.removed.push(id);
          }
        });

        game.sideboardChanges = sideboardChanges;
      }

      game.handLands = game.handsDrawn.map(
        hand =>
          hand.filter(card => cardsDb.get(card).type.includes("Land")).length
      );
      let handSize = 8 - game.handsDrawn.length;
      let deckSize = 0;
      let landsInDeck = 0;
      let multiCardPositions = { "2": {}, "3": {}, "4": {} };
      let cardCounts = {};
      currentMatch.player.deck.mainDeck.forEach(card => {
        cardCounts[card.id] = card.quantity;
        deckSize += card.quantity;
        if (card.quantity >= 2 && card.quantity <= 4) {
          multiCardPositions[card.quantity][card.id] = [];
        }
        let cardObj = cardsDb.get(card.id);
        if (cardObj && cardObj.type.includes("Land")) {
          landsInDeck += card.quantity;
        }
      });
      let librarySize = deckSize - handSize;
      let landsInLibrary =
        landsInDeck - game.handLands[game.handLands.length - 1];
      let landsSoFar = 0;
      let libraryLands = [];
      game.shuffledOrder.forEach((cardId, i) => {
        let cardCount = cardCounts[cardId];
        if (cardCount >= 2 && cardCount <= 4) {
          multiCardPositions[cardCount][cardId].push(i + 1);
        }
        if (i >= handSize) {
          let card = cardsDb.get(cardId);
          if (card && card.type.includes("Land")) {
            landsSoFar++;
          }
          libraryLands.push(landsSoFar);
        }
      });

      game.deckSize = deckSize;
      game.landsInDeck = landsInDeck;
      game.multiCardPositions = multiCardPositions;
      game.librarySize = librarySize;
      game.landsInLibrary = landsInLibrary;
      game.libraryLands = libraryLands;

      matchGameStats[gameNumberCompleted - 1] = game;

      saveMatch(mid);
    }
  }
}

function onLabelGreToClient(entry, json) {
  if (!json) return;
  if (skipMatch) return;
  logTime = parseWotcTime(entry.timestamp);

  json = json.greToClientEvent.greToClientMessages;
  json.forEach(function(msg) {
    //console.log("Message: "+msg.msgId, msg);
    // Sometimes Gre messages have many bulked messages at once
    // Process each individually

    // Nothing here..
    if (msg.type == "GREMessageType_SubmitDeckReq") {
      currentMatch.gameObjs = {};
    }

    // Declare attackers message
    if (msg.type == "GREMessageType_DeclareAttackersReq") {
      msg.declareAttackersReq.attackers.forEach(function(obj) {
        let att = obj.attackerInstanceId;
        if (!attackersDetected.includes(att)) {
          if (currentMatch.gameObjs[att] != undefined) {
            let str =
              actionLogGenerateLink(currentMatch.gameObjs[att].grpId) +
              " attacked ";
            let rec;
            if (obj.selectedDamageRecipient !== undefined) {
              rec = obj.selectedDamageRecipient;
              if (rec.type == "DamageRecType_Player") {
                actionLog(
                  currentMatch.gameObjs[att].controllerSeatId,
                  new Date(),
                  str + getNameBySeat(rec.playerSystemSeatId)
                );
                //ipc_send("", str+getNameBySeat(rec.playerSystemSeatId));
              }
            }
            if (obj.legalDamageRecipients !== undefined) {
              rec = obj.legalDamageRecipients.forEach(function(rec) {
                if (rec.type == "DamageRecType_Player") {
                  actionLog(
                    currentMatch.gameObjs[att].controllerSeatId,
                    new Date(),
                    str + getNameBySeat(rec.playerSystemSeatId)
                  );
                  //ipc_send("ipc_log", str+getNameBySeat(rec.playerSystemSeatId));
                }
              });
            }
            attackersDetected.push(att);
          }
        }
      });
    }

    // An update about the game state, can either be;
    // - A change (diff)
    // - The entire board state (full)
    // - binary (we dont check that one)
    if (msg.type == "GREMessageType_GameStateMessage") {
      if (msg.gameStateMessage.gameInfo) {
        let gameInfo = msg.gameStateMessage.gameInfo;
        if (gameInfo.stage && gameInfo.stage != gameStage) {
          gameStage = gameInfo.stage;
          if (gameStage == "GameStage_Start") {
            resetGameState();
          }
        }
        if (gameInfo.matchWinCondition) {
          if (
            gameInfo.matchWinCondition == "MatchWinCondition_SingleElimination"
          ) {
            currentMatchBestOfNumber = 1;
            currentMatch.bestOf = 1;
          } else if (
            gameInfo.matchWinCondition == "MatchWinCondition_Best2of3"
          ) {
            currentMatchBestOfNumber = 3;
            currentMatch.bestOf = 3;
          } else {
            currentMatch.bestOf = undefined;
            currentMatchBestOfNumber = undefined;
          }
        }
      }

      if (msg.gameStateMessage.type == "GameStateType_Full") {
        // For the full board state we only update the zones
        // We DO NOT update currentMatch.gameObjs array here, this is because sometimes cards become invisible for us
        // and updating the entire currentMatch.gameObjs array to what the server says we should be looking at will remove those from our view
        // This includes also cards and actions we STILL havent processed!

        if (msg.gameStateMessage.zones != undefined) {
          msg.gameStateMessage.zones.forEach(function(zone) {
            currentMatch.zones[zone.zoneId] = zone;
            currentMatch.zones[zone.type + (zone.ownerSeatId || "")] = zone;
          });
        }
      } else if (msg.gameStateMessage.type == "GameStateType_Diff") {
        // Most game updates happen here
        // Sometimes, especially with annotations, stuff gets sent to us repeatedly
        // Like if we recieve an object moved from zone A to B , we may recieve the same message many times
        // So we should be careful reading stuff as it may:
        // - not be unique
        // - reference changes we still havent recieved
        // - reference objects that may be deleted

        if (msg.gameStateMessage.turnInfo != undefined) {
          if (
            msg.gameStateMessage.turnInfo.priorityPlayer !==
            currentMatch.currentPriority
          ) {
            changePriority(
              msg.gameStateMessage.turnInfo.priorityPlayer,
              currentMatch.currentPriority,
              logTime
            );
          }
          currentMatch.prevTurn = currentMatch.turn.turnNumber;
          currentMatch.turn = msg.gameStateMessage.turnInfo;
          // turnPhase = msg.gameStateMessage.turnInfo.phase;
          // turnStep = msg.gameStateMessage.turnInfo.step;
          // turnNumber = msg.gameStateMessage.turnInfo.turnNumber;
          // turnActive = msg.gameStateMessage.turnInfo.activePlayer;
          // currentMatch.currentPriority = msg.gameStateMessage.turnInfo.priorityPlayer;
          // turnDecision = msg.gameStateMessage.turnInfo.decisionPlayer;

          if (
            currentMatch.turn.turnNumber != undefined &&
            currentMatch.prevTurn !== currentMatch.turn.turnNumber
          ) {
            attackersDetected = [];
            actionLog(
              -1,
              new Date(),
              getNameBySeat(currentMatch.turn.activePlayer) +
                "'s turn begin. (#" +
                currentMatch.turn.turnNumber +
                ")"
            );
            //ipc_send("ipc_log", playerName+"'s turn begin. (#"+turnNumber+")");
          }
          if (!firstPass) {
            ipc.send(
              "set_turn",
              currentMatch.player.seat,
              currentMatch.turn.phase,
              currentMatch.turn.step,
              currentMatch.turn.turnNumber,
              currentMatch.turn.activePlayer,
              currentMatch.turn.priorityPlayer,
              currentMatch.turn.decisionPlayer
            );
          }
        }

        if (msg.gameStateMessage.gameInfo != undefined) {
          let gameInfo = msg.gameStateMessage.gameInfo;

          if (gameInfo.stage == "GameStage_GameOver") {
            //console.log("gameInfo", gameInfo);
            if (gameInfo.matchState == "MatchState_GameComplete") {
              playerWin = 0;
              draws = 0;
              oppWin = 0;
              // game end
              let results = gameInfo.results;
              currentMatch.results = gameInfo.results;

              results.forEach(function(res, index) {
                //console.log(res, index);
                if (res.scope == "MatchScope_Game") {
                  if (res.result == "ResultType_Draw") {
                    if (index == gameInfo.gameNumber - 1) {
                      actionLog(-1, new Date(), "The game is a draw!");
                    }
                    draws += 1;
                  } else {
                    let loser = 0;
                    if (index == gameInfo.gameNumber - 1) {
                      actionLog(
                        -1,
                        new Date(),
                        getNameBySeat(res.winningTeamId) + " wins!"
                      );
                    }
                    if (res.winningTeamId == currentMatch.player.seat) {
                      loser = currentMatch.opponent.seat;
                      playerWin += 1;
                    }
                    if (res.winningTeamId == currentMatch.opponent.seat) {
                      loser = currentMatch.player.seat;
                      oppWin += 1;
                    }

                    if (res.reason == "ResultReason_Concede") {
                      actionLog(
                        -1,
                        new Date(),
                        getNameBySeat(loser) + " conceded."
                      );
                    }
                    if (res.reason == "ResultReason_Timeout") {
                      actionLog(
                        -1,
                        new Date(),
                        getNameBySeat(loser) + " timed out."
                      );
                    }
                    if (res.reason == "ResultReason_Loop") {
                      actionLog(-1, new Date(), "Game ended in a loop.");
                    }
                  }
                }
              });
            }
            if (gameInfo.matchState == "MatchState_MatchComplete") {
              // match end
              duringMatch = false;

              ipc_send("save_overlay_pos", 1);
              clear_deck();
              if (!store.get("settings.show_overlay_always")) {
                ipc_send("overlay_close", 1);
              }

              currentMatch.matchId = gameInfo.matchID;
              currentMatch.game = gameInfo.gameNumber; // probably wrong
              matchCompletedOnGameNumber = gameInfo.gameNumber;
              saveMatch(gameInfo.matchID);
            }
          }
        }

        if (msg.gameStateMessage.annotations != undefined) {
          msg.gameStateMessage.annotations.forEach(function(obj) {
            let affector = obj.affectorId;
            let affected = obj.affectedIds;

            if (affected != undefined) {
              affected.forEach(function(aff) {
                // An object ID changed, create new object and move it
                if (obj.type.includes("AnnotationType_ObjectIdChanged")) {
                  var _orig = undefined;
                  var _new = undefined;
                  obj.details.forEach(function(detail) {
                    if (detail.key == "orig_id") {
                      _orig = detail.valueInt32[0];
                    }
                    if (detail.key == "new_id") {
                      _new = detail.valueInt32[0];
                    }
                  });

                  if (_orig == undefined || _new == undefined) {
                    console.log("undefined value: ", obj);
                  } else if (currentMatch.gameObjs[_orig] != undefined) {
                    //console.log("AnnotationType_ObjectIdChanged", aff, _orig, _new, currentMatch.gameObjs[_orig], currentMatch.gameObjs);
                    currentMatch.gameObjs[_new] = JSON.parse(
                      JSON.stringify(currentMatch.gameObjs[_orig])
                    );
                    //currentMatch.gameObjs[_orig] = undefined;
                  }

                  if (_orig != undefined && _new != undefined) {
                    idChanges[_orig] = _new;
                  }
                }

                // An object changed zone, here we only update the currentMatch.gameObjs array
                if (obj.type.includes("AnnotationType_EnteredZoneThisTurn")) {
                  if (
                    currentMatch.gameObjs[aff] &&
                    currentMatch.zones[affector]
                  ) {
                    //console.log("AnnotationType_EnteredZoneThisTurn", aff, affector, currentMatch.gameObjs[aff], currentMatch.zones[affector], currentMatch.gameObjs);
                    currentMatch.gameObjs[aff].zoneId = affector;
                    currentMatch.gameObjs[aff].zoneName =
                      currentMatch.zones[affector].type;
                  }
                }

                if (obj.type.includes("AnnotationType_ResolutionStart")) {
                  var grpid = undefined;
                  obj.details.forEach(function(detail) {
                    if (detail.key == "grpid") {
                      grpid = detail.valueInt32[0];
                    }
                  });
                  if (grpid != undefined) {
                    //let card = cardsDb.get(grpid);
                    aff = obj.affectorId;
                    //var pn = currentMatch.opponent.name;
                    if (currentMatch.gameObjs[aff] != undefined) {
                      // We ooly check for abilities here, since cards and spells are better processed with "AnnotationType_ZoneTransfer"
                      if (
                        currentMatch.gameObjs[aff].type ==
                        "GameObjectType_Ability"
                      ) {
                        var src = currentMatch.gameObjs[aff].objectSourceGrpId;
                        var abId = currentMatch.gameObjs[aff].grpId;
                        var ab = cardsDb.getAbility(abId);
                        //var cname = "";
                        try {
                          ab = replaceAll(
                            ab,
                            "CARDNAME",
                            cardsDb.get(src).name
                          );
                        } catch (e) {
                          //
                        }

                        actionLog(
                          currentMatch.gameObjs[aff].controllerSeatId,
                          new Date(),
                          actionLogGenerateLink(src) +
                            '\'s <a class="card_ability click-on" title="' +
                            ab +
                            '">ability</a>'
                        );
                        //ipc_send("ipc_log", cardsDb.get(src).name+"'s ability");
                        //console.log(cardsDb.get(src).name+"'s ability", currentMatch.gameObjs[aff]);
                      } else {
                        //actionLog(currentMatch.gameObjs[aff].controllerSeatId, new Date(), getNameBySeat(currentMatch.gameObjs[aff].controllerSeatId)+" cast "+card.name);
                        //ipc_send("ipc_log", currentMatch.gameObjs[aff].controllerSeatId+" cast "+card.name);
                        //console.log(getNameBySeat(currentMatch.gameObjs[aff].controllerSeatId)+" cast "+card.name, currentMatch.gameObjs[aff]);
                      }
                    }
                  }
                }

                /*
                // Life total changed, see below (msg.gameStateMessage.players) 
                // Not optimal, this triggers too many times
                if (obj.type.includes("AnnotationType_ModifiedLife")) {
                  obj.details.forEach(function(detail) {
                    if (detail.key == "life") {
                      var change = detail.valueInt32[0];
                      if (change < 0) {
                        actionLog(aff, new Date(), getNameBySeat(aff)+' lost '+Math.abs(change)+' life');
                      }
                      else {
                        actionLog(aff, new Date(), getNameBySeat(aff)+' gained '+Math.abs(change)+' life');
                      }
                    }
                  });
                }
                */

                // Something moved between zones
                // This requires some "async" work, as data referenced by annotations sometimes has future data
                // That is , data we have already recieved and still havent processed (particularly, game objects)
                if (obj.type.includes("AnnotationType_ZoneTransfer")) {
                  obj.remove = false;
                  obj.aff = aff;
                  obj.time = new Date();
                  zoneTransfers.push(obj);
                }

                if (obj.type.includes("AnnotationType_DamageDealt")) {
                  var aff = obj.affectorId;
                  var affected = obj.affectedIds;
                  var damage = 0;
                  obj.details.forEach(function(detail) {
                    if (detail.key == "damage") {
                      damage = detail.valueInt32[0];
                    }
                  });

                  affected.forEach(function(affd) {
                    if (currentMatch.gameObjs[aff] !== undefined) {
                      try {
                        if (
                          affd == currentMatch.player.seat ||
                          affd == currentMatch.opponent.seat
                        ) {
                          actionLog(
                            currentMatch.gameObjs[aff].controllerSeatId,
                            new Date(),
                            actionLogGenerateLink(
                              currentMatch.gameObjs[aff].grpId
                            ) +
                              " dealt " +
                              damage +
                              " damage to " +
                              getNameBySeat(affd)
                          );
                          //ipc_send("ipc_log", currentMatch.gameObjs[aff].name+" dealt "+damage+" damage to "+getNameBySeat(affd));
                        } else {
                          actionLog(
                            currentMatch.gameObjs[aff].controllerSeatId,
                            new Date(),
                            actionLogGenerateLink(
                              currentMatch.gameObjs[aff].grpId
                            ) +
                              " dealt " +
                              damage +
                              " damage to " +
                              actionLogGenerateLink(
                                currentMatch.gameObjs[affd].grpId
                              )
                          );
                          //ipc_send("ipc_log", currentMatch.gameObjs[aff].name+" dealt "+damage+" damage to "+currentMatch.gameObjs[affd]);
                        }
                      } catch (e) {
                        //
                      }
                    }
                  });
                }
              });
            }
          });
        }

        // Update the zones
        // Each zone has every object ID that lives inside that zone
        // Sometimes object IDs we dont have any data from are here
        // So, for example, a card in the opp library HAS an ID in its zone, but we just dont have any data about it
        if (msg.gameStateMessage.zones != undefined) {
          //ipc_send("ipc_log", "Zones updated");
          msg.gameStateMessage.zones.forEach(function(zone) {
            currentMatch.zones[zone.zoneId] = zone;
            currentMatch.zones[zone.type + (zone.ownerSeatId || "")] = zone;
            if (zone.objectInstanceIds != undefined) {
              zone.objectInstanceIds.forEach(function(objId) {
                if (currentMatch.gameObjs[objId] != undefined) {
                  currentMatch.gameObjs[objId].zoneId = zone.zoneId;
                  currentMatch.gameObjs[objId].zoneName = zone.type;
                }
              });
            }
          });
        }

        // Update the game objects
        if (msg.gameStateMessage.gameObjects != undefined) {
          msg.gameStateMessage.gameObjects.forEach(function(obj) {
            instanceToCardIdMap[obj.instanceId] = obj.grpId;
            let name = cardsDb.get(obj.grpId).name;
            if (name) {
              obj.name = name;
            }

            // This should be a delayed check
            try {
              obj.zoneName = currentMatch.zones[obj.zoneId].type;
              currentMatch.gameObjs[obj.instanceId] = obj;
            } catch (e) {
              //
            }

            //ipc_send("ipc_log", "Message: "+msg.msgId+" > ("+obj.instanceId+") created at "+currentMatch.zones[obj.zoneId].type);
          });
        }

        // An object has been deleted
        // Removing this caused some objects to end up duplicated , unfortunately
        if (msg.gameStateMessage.diffDeletedInstanceIds != undefined) {
          msg.gameStateMessage.diffDeletedInstanceIds.forEach(function(obj) {
            currentMatch.gameObjs[obj] = undefined;
          });
        }

        // Players data update
        // We only read life totals at the moment, but we also get timers and such
        if (msg.gameStateMessage.players != undefined) {
          msg.gameStateMessage.players.forEach(function(obj) {
            let sign = "";
            let diff;
            if (currentMatch.player.seat == obj.controllerSeatId) {
              diff = obj.lifeTotal - playerLife;
              if (diff > 0) sign = "+";

              if (diff != 0) {
                actionLog(
                  obj.controllerSeatId,
                  new Date(),
                  getNameBySeat(obj.controllerSeatId) +
                    "'s life changed to " +
                    obj.lifeTotal +
                    " (" +
                    sign +
                    diff +
                    ")"
                );
              }

              playerLife = obj.lifeTotal;
            } else {
              diff = obj.lifeTotal - opponentLife;
              if (diff > 0) sign = "+";
              if (diff != 0) {
                actionLog(
                  obj.controllerSeatId,
                  new Date(),
                  getNameBySeat(obj.controllerSeatId) +
                    "'s life changed to " +
                    obj.lifeTotal +
                    " (" +
                    sign +
                    diff +
                    ")"
                );
              }

              opponentLife = obj.lifeTotal;
            }
          });
        }
      }
      checkForStartingLibrary();
    }
  });
  tryZoneTransfers();

  var str = JSON.stringify(currentMatch.player.deck);
  currentMatch.playerCards = JSON.parse(str);
  forceDeckUpdate();
  update_deck(false);
}

function onLabelClientToMatchServiceMessageTypeClientToGREMessage(entry, json) {
  if (!json) return;
  if (skipMatch) return;
  if (json.Payload) {
    json.payload = json.Payload;
  }
  if (!json.payload) return;

  if (typeof json.payload == "string") {
    json.payload = decodePayload(json);
    json.payload = normaliseFields(json.payload);
  }

  if (json.payload.submitdeckresp) {
    // Get sideboard changes
    let deckResp = json.payload.submitdeckresp;
    //console.log("deckResp", deckResp);

    let tempMain = {};
    let tempSide = {};
    deckResp.deck.deckcards.forEach(function(grpId) {
      if (tempMain[grpId] == undefined) {
        tempMain[grpId] = 1;
      } else {
        tempMain[grpId] += 1;
      }
    });
    if (deckResp.deck.sideboardcards !== undefined) {
      deckResp.deck.sideboardcards.forEach(function(grpId) {
        if (tempSide[grpId] == undefined) {
          tempSide[grpId] = 1;
        } else {
          tempSide[grpId] += 1;
        }
      });
    }

    var newDeck = {};
    newDeck.mainDeck = [];
    Object.keys(tempMain).forEach(function(key) {
      var c = { id: key, quantity: tempMain[key] };
      newDeck.mainDeck.push(c);
    });

    newDeck.sideboard = [];
    if (deckResp.deck.sideboardcards !== undefined) {
      Object.keys(tempSide).forEach(function(key) {
        var c = { id: key, quantity: tempSide[key] };
        newDeck.sideboard.push(c);
      });
    }
    currentMatch.player.deck = newDeck;
    ipc_send("set_deck", currentMatch.player.deck, windowOverlay);
  }
}

function onLabelInEventGetPlayerCourse(entry, json) {
  if (!json) return;

  if (json.Id != "00000000-0000-0000-0000-000000000000") {
    json.date = parseWotcTime(entry.timestamp);
    json._id = json.Id;
    delete json.Id;

    if (json.CourseDeck) {
      json.CourseDeck.colors = get_deck_colors(json.CourseDeck);
      //json.date = timestamp();
      //console.log(json.CourseDeck, json.CourseDeck.colors)
      httpApi.httpSubmitCourse(json);
      saveCourse(json);
    }
    select_deck(json);
  }
}

function onLabelInEventGetCombinedRankInfo(entry, json) {
  if (!json) return;

  playerData.rank.constructed.rank = json.constructedClass;
  playerData.rank.constructed.tier = json.constructedLevel;
  playerData.rank.constructed.step = json.constructedStep;

  playerData.rank.limited.rank = json.limitedClass;
  playerData.rank.limited.tier = json.limitedLevel;
  playerData.rank.limited.step = json.limitedStep;

  playerData.rank.constructed.won = json.constructedMatchesWon;
  playerData.rank.constructed.lost = json.constructedMatchesLost;
  playerData.rank.constructed.drawn = json.constructedMatchesDrawn;

  playerData.rank.limited.won = json.limitedMatchesWon;
  playerData.rank.limited.lost = json.limitedMatchesLost;
  playerData.rank.limited.drawn = json.limitedMatchesDrawn;

  updateRank();
}

function onLabelRankUpdated(entry, json) {
  if (!json) return;

  if (json.rankUpdateType == "Constructed") {
    playerData.rank.constructed.rank = json.newClass;
    playerData.rank.constructed.tier = json.newLevel;
    playerData.rank.constructed.step = json.newStep;
  } else {
    playerData.rank.limited.rank = json.newClass;
    playerData.rank.limited.tier = json.newLevel;
    playerData.rank.limited.step = json.newStep;
  }

  updateRank();
}

function onLabelInDeckGetDeckLists(entry, json) {
  if (!json) return;

  staticDecks = [];
  json.forEach(deck => {
    let deckId = deck.id;
    deck.tags = decks_tags[deckId];
    if (!deck.tags) deck.tags = [];
    if (deck.tags.indexOf(formats[deck.format]) == -1) {
      deck.tags.push(formats[deck.format]);
    }

    decks[deckId] = deck;
    if (decks["index"].indexOf(deckId) == -1) {
      decks["index"].push(deck.id);
    }
    staticDecks.push(deck.id);
  });

  updateCustomDecks();
  requestHistorySend(0);
  ipc_send("set_decks", JSON.stringify(decks));
}

function onLabelInEventGetPlayerCourses(entry, json) {
  if (!json) return;

  json.forEach(course => {
    if (course.CurrentEventState != "PreMatch") {
      if (course.CourseDeck != null) {
        if (decks.index.indexOf(course.CourseDeck.id) == -1) {
          decks.index.push(course.CourseDeck.id);
        }
        decks[course.CourseDeck.id] = course.CourseDeck;
        updateCustomDecks();
        store.set("decks_index", decks.index);
        store.set("decks." + course.CourseDeck.id, course.CourseDeck);
      }
    }
  });
}

function onLabelInDeckUpdateDeck(entry, json) {
  if (!json) return;
  logTime = parseWotcTime(entry.timestamp);

  decks.index.forEach(function(_deckid) {
    if (_deckid == json.id) {
      let _deck = decks[_deckid];
      var changeId = sha1(_deckid + "-" + logTime);
      var deltaDeck = {
        id: changeId,
        deckId: _deck.id,
        date: logTime,
        changesMain: [],
        changesSide: [],
        previousMain: _deck.mainDeck,
        previousSide: _deck.sideboard
      };

      // Check Mainboard
      _deck.mainDeck.forEach(function(card) {
        var cardObj = cardsDb.get(card.id);

        var diff = 0 - card.quantity;
        json.mainDeck.forEach(function(cardB) {
          var cardObjB = cardsDb.get(cardB.id);
          if (cardObj.name == cardObjB.name) {
            cardB.existed = true;
            diff = cardB.quantity - card.quantity;
          }
        });

        if (diff !== 0) {
          deltaDeck.changesMain.push({ id: card.id, quantity: diff });
        }
      });

      json.mainDeck.forEach(function(card) {
        if (card.existed == undefined) {
          let cardObj = cardsDb.get(card.id);
          deltaDeck.changesMain.push({ id: card.id, quantity: card.quantity });
        }
      });
      // Check sideboard
      _deck.sideboard.forEach(function(card) {
        var cardObj = cardsDb.get(card.id);

        var diff = 0 - card.quantity;
        json.sideboard.forEach(function(cardB) {
          var cardObjB = cardsDb.get(cardB.id);
          if (cardObj.name == cardObjB.name) {
            cardB.existed = true;
            diff = cardB.quantity - card.quantity;
          }
        });

        if (diff !== 0) {
          deltaDeck.changesSide.push({ id: card.id, quantity: diff });
        }
      });

      json.sideboard.forEach(function(card) {
        if (card.existed == undefined) {
          let cardObj = cardsDb.get(card.id);
          deltaDeck.changesSide.push({ id: card.id, quantity: card.quantity });
        }
      });

      if (!deck_changes_index.includes(changeId)) {
        deck_changes_index.push(changeId);
        deck_changes[changeId] = deltaDeck;

        store.set("deck_changes_index", deck_changes_index);
        store.set("deck_changes." + changeId, deltaDeck);
      }
    }
  });
}

function onLabelInventoryUpdated(entry, json) {
  if (!json) return;
  json.date = parseWotcTime(entry.timestamp);

  if (json.delta.boosterDelta.length == 0) delete json.delta.boosterDelta;
  if (json.delta.cardsAdded.length == 0) delete json.delta.cardsAdded;
  if (json.delta.decksAdded.length == 0) delete json.delta.decksAdded;
  if (json.delta.vanityItemsAdded.length == 0)
    delete json.delta.vanityItemsAdded;
  if (json.delta.vanityItemsRemoved.length == 0)
    delete json.delta.vanityItemsRemoved;

  if (json.delta.gemsDelta == 0) delete json.delta.gemsDelta;
  if (json.delta.draftTokensDelta == 0) delete json.delta.draftTokensDelta;
  if (json.delta.goldDelta == 0) delete json.delta.goldDelta;
  if (json.delta.sealedTokensDelta == 0) delete json.delta.sealedTokensDelta;
  if (json.delta.vaultProgressDelta == 0) delete json.delta.vaultProgressDelta;
  if (json.delta.wcCommonDelta == 0) delete json.delta.wcCommonDelta;
  if (json.delta.wcMythicDelta == 0) delete json.delta.wcMythicDelta;
  if (json.delta.wcRareDelta == 0) delete json.delta.wcRareDelta;
  if (json.delta.wcUncommonDelta == 0) delete json.delta.wcUncommonDelta;

  saveEconomy(json);
}

function onLabelInPlayerInventoryGetPlayerInventory(entry, json) {
  if (!json) return;
  logTime = parseWotcTime(entry.timestamp);

  gold = json.gold;
  gems = json.gems;
  vault = json.vaultProgress;
  wcTrack = json.wcTrackPosition;
  wcCommon = json.wcCommon;
  wcUncommon = json.wcUncommon;
  wcRare = json.wcRare;
  wcMythic = json.wcMythic;

  sendEconomy();
}

function onLabelInPlayerInventoryGetPlayerCardsV3(entry, json) {
  if (!json) return;

  var date = new Date(store.get("cards.cards_time"));
  var now = new Date();
  var diff = Math.abs(now.getTime() - date.getTime());
  var days = Math.floor(diff / (1000 * 3600 * 24));

  if (store.get("cards.cards_time") == 0) {
    store.set("cards.cards_time", now);
    store.set("cards.cards_before", json);
    store.set("cards.cards", json);
  }
  // If a day has passed since last update
  else if (days > 0) {
    var cardsPrev = store.get("cards.cards");
    store.set("cards.cards_time", now);
    store.set("cards.cards_before", cardsPrev);
    store.set("cards.cards", json);
  }

  var cardsPrevious = store.get("cards.cards_before");
  var cardsNewlyAdded = {};

  Object.keys(json).forEach(function(key) {
    // get differences
    if (cardsPrevious[key] == undefined) {
      cardsNewlyAdded[key] = json[key];
    } else if (cardsPrevious[key] < json[key]) {
      cardsNewlyAdded[key] = json[key] - cardsPrevious[key];
    }
  });

  ipc_send("set_cards", { cards: json, new: cardsNewlyAdded });
}

function onLabelInEventDeckSubmit(entry, json) {
  if (!json) return;
  select_deck(json);
}

function onLabelEventMatchCreated(entry, json) {
  if (!json) return;
  matchBeginTime = parseWotcTime(entry.timestamp);

  if (json.opponentRankingClass == "Mythic") {
    httpApi.httpSetMythicRank(
      json.opponentScreenName,
      json.opponentMythicLeaderboardPlace
    );
  }

  ipc_send("ipc_log", "MATCH CREATED: " + matchBeginTime);
  if (json.eventId != "NPE") {
    createMatch(json);
  }
}

function onLabelOutDirectGameChallenge(entry, json) {
  if (!json) return;
  var deck = json.params.deck;

  deck = replaceAll(deck, '"Id"', '"id"');
  deck = replaceAll(deck, '"Quantity"', '"quantity"');
  deck = JSON.parse(deck);
  select_deck(deck);

  httpApi.httpTournamentCheck(deck, json.params.opponentDisplayName, false);
}

function onLabelInDraftDraftStatus(entry, json) {
  if (!json) return;

  if (json.eventName != undefined) {
    for (let set in setsList) {
      let setCode = setsList[set]["code"];
      if (json.eventName.indexOf(setCode) !== -1) {
        draftSet = set;
      }
    }
  }

  if (
    currentDraft == undefined ||
    (json.packNumber == 0 && json.pickNumber <= 0)
  ) {
    createDraft();
  }
  setDraftCards(json);
  currentDraftPack = json.draftPack.slice(0);
}

function onLabelInDraftMakePick(entry, json) {
  if (!json) return;
  // store pack in recording
  if (json.eventName != undefined) {
    for (let set in setsList) {
      let setCode = setsList[set]["code"];
      if (json.eventName.indexOf(setCode) !== -1) {
        draftSet = set;
      }
    }
  }

  if (json.draftPack != undefined) {
    if (currentDraft == undefined) {
      createDraft();
    }
    setDraftCards(json);
    currentDraftPack = json.draftPack.slice(0);
  }
}

function onLabelOutDraftMakePick(entry, json) {
  if (!json) return;
  // store pick in recording
  var value = {};
  value.pick = json.params.cardId;
  value.pack = currentDraftPack;
  var key = "pack_" + json.params.packNumber + "pick_" + json.params.pickNumber;
  currentDraft[key] = value;
  debugLogSpeed = 200;
}

function onLabelInEventCompleteDraft(entry, json) {
  if (!json) return;
  ipc_send("save_overlay_pos", 1);
  clear_deck();
  if (!store.get("settings.show_overlay_always")) {
    ipc_send("overlay_close", 1);
  }
  //ipc_send("renderer_show", 1);

  draftId = json.Id;
  console.log("Complete draft", json);
  saveDraft();
}

function onLabelMatchGameRoomStateChangedEvent(entry, json) {
  if (!json) return;

  json = json.matchGameRoomStateChangedEvent.gameRoomInfo;
  let eventId = "";

  if (json.gameRoomConfig) {
    eventId = json.gameRoomConfig.eventId;
    duringMatch = true;
  }

  if (eventId == "NPE") return;

  if (json.stateType == "MatchGameRoomStateType_Playing") {
    json.gameRoomConfig.reservedPlayers.forEach(player => {
      if (player.userId == playerData.playerId) {
        currentMatch.player.seat = player.systemSeatId;
      } else {
        currentMatch.opponent.name = player.playerName;
        currentMatch.opponent.id = player.userId;
        currentMatch.opponent.seat = player.systemSeatId;
      }
    });
  }
  if (json.stateType == "MatchGameRoomStateType_MatchCompleted") {
    playerWin = 0;
    draws = 0;
    oppWin = 0;
    currentMatch.results = json.finalMatchResult.resultList;

    json.finalMatchResult.resultList.forEach(function(res) {
      if (res.scope == "MatchScope_Game") {
        if (res.result == "ResultType_Draw") {
          draws += 1;
        } else {
          if (res.winningTeamId == currentMatch.player.seat) {
            playerWin += 1;
          }
          if (res.winningTeamId == currentMatch.opponent.seat) {
            oppWin += 1;
          }
        }
      }
      if (res.scope == "MatchScope_Match") {
        skipMatch = false;
        duringMatch = false;
      }
    });

    ipc_send("save_overlay_pos", 1);
    clear_deck();
    if (!store.get("settings.show_overlay_always")) {
      ipc_send("overlay_close", 1);
    }
    matchCompletedOnGameNumber = json.finalMatchResult.resultList.length - 1;
    saveMatch(json.finalMatchResult.matchId);
  }

  if (json.players) {
    json.players.forEach(function(player) {
      if (player.userId == playerData.playerId) {
        currentMatch.player.seat = player.systemSeatId;
      } else {
        oppId = player.userId;
        currentMatch.opponent.seat = player.systemSeatId;
      }
    });
  }
}

function onLabelInEventGetSeasonAndRankDetail(entry, json) {
  if (!json) return;

  season_starts = new Date(json.currentSeason.seasonStartTime);
  season_ends = new Date(json.currentSeason.seasonEndTime);

  json.constructedRankInfo.forEach(rank => {
    if (
      rank.rankClass == playerData.rank.constructed.rank &&
      rank.level == playerData.rank.constructed.tier
    ) {
      playerData.rank.constructed.steps = rank.steps;
    }
  });

  json.limitedRankInfo.forEach(rank => {
    if (
      rank.rankClass == playerData.rank.limited.rank &&
      rank.level == playerData.rank.limited.tier
    ) {
      playerData.rank.limited.steps = rank.steps;
    }
  });

  ipc_send("set_season", { starts: season_starts, ends: season_ends });
  updateRank();
}

function onLabelGetPlayerInventoryGetRewardSchedule(entry, json) {
  if (!json) return;

  if (!json.dailyReset.endsWith("Z")) json.dailyReset = json.dailyReset + "Z";
  if (!json.weeklyReset.endsWith("Z"))
    json.weeklyReset = json.weeklyReset + "Z";

  ipc_send("set_reward_resets", {
    daily: json.dailyReset,
    weekly: json.weeklyReset
  });
}
