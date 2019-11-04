import { ipcRenderer as ipc, webFrame } from "electron";
import React, { useEffect, useRef, useState } from "react";
import interact from "interactjs";
import striptags from "striptags";

import pd from "../shared/player-data";
import Deck from "../shared/deck.js";
import { setRenderer } from "../shared/card-hover";
import {
  ARENA_MODE_IDLE,
  ARENA_MODE_DRAFT,
  IPC_BACKGROUND,
  IPC_MAIN,
  IPC_OVERLAY
} from "../shared/constants";

import OverlayWindowlet from "../overlay/OverlayWindowlet";

export const RENDERER_MATCH = 1;
export const RENDERER_DRAFT = 2;

// TODO figure out a way to refactor this out
// some kind of useRef array?
const byId = (id: string): HTMLElement | null => document.getElementById(id);

function ipcSend(method: string, arg?: any, to = IPC_BACKGROUND): void {
  ipc.send("ipc_switch", method, IPC_OVERLAY, arg, to);
}

function close(bool: any, index: number): void {
  const playerData = pd as any;
  // -1 to toggle, else set
  const show = bool == -1 ? !playerData.settings.overlays[index].show : bool;
  const overlays = [...playerData.settings.overlays];
  const newOverlay = {
    ...overlays[index], // old overlay
    show // new setting
  };
  overlays[index] = newOverlay;
  ipcSend("save_user_settings", { overlays });
}

// TODO figure out a way to extract this pattern
// some kind of custom useEffect?
function makeElementDraggable(element: HTMLElement): void {
  const restrictMinSize =
    interact.modifiers &&
    interact.modifiers.restrictSize({
      min: { width: 100, height: 100 }
    });
  const cursorChecker: any = (
    action: any,
    interactable: any,
    element: any,
    interacting: boolean
  ): string => {
    switch (action.axis) {
      case "x":
        return "ew-resize";
      case "y":
        return "ns-resize";
      default:
        return interacting ? "grabbing" : "grab";
    }
  };
  interact(element)
    .draggable({ cursorChecker })
    .on("dragmove", function(event) {
      const target = event.target;
      const x = parseFloat(target.style.left) + event.dx;
      const y = parseFloat(target.style.top) + event.dy;
      target.style.left = x + "px";
      target.style.top = y + "px";
    })
    .resizable({
      edges: { left: true, right: true, bottom: true, top: true },
      modifiers: [restrictMinSize],
      inertia: true
    } as any)
    .on("resizemove", function(event) {
      const target = event.target;
      const x = parseFloat(target.style.left) + event.deltaRect.left;
      const y = parseFloat(target.style.top) + event.deltaRect.top;
      //fix for interact.js adding 4px to height/width on resize
      target.style.width = event.rect.width - 4 + "px";
      target.style.height = event.rect.height - 4 + "px";
      target.style.left = x + "px";
      target.style.top = y + "px";
    });
}

const getEditModeClass = (editMode: boolean): string =>
  editMode ? "click-on editable" : "click-through";

const forceInt = (num: any): number => Math.round(parseFloat(num));

function compareLogEntries(a: { time: any }, b: { time: any }): -1 | 0 | 1 {
  if (a.time < b.time) return -1;
  if (a.time > b.time) return 1;
  return 0;
}

export default function OverlayController(): JSX.Element {
  const [actionLog, setActionLog] = useState([] as any[]);
  const [arenaState, setArenaState] = useState(ARENA_MODE_IDLE);
  const [editMode, setEditMode] = useState(false);
  const [match, setMatch] = useState(null);
  const [draft, setDraft] = useState(null);
  const [draftState, setDraftState] = useState({ packN: 0, pickN: 0 });
  const [playerSeat, setPlayerSeat] = useState(0);
  const [turnPriority, setTurnPriority] = useState(0);
  const [playerData, setPlayerData] = useState(pd as any);
  const { settings } = playerData;

  useEffect(() => {
    webFrame.setZoomFactor(settings.overlay_scale / 100);
  }, [settings]);

  // TODO figure out a way to extract this pattern
  // some kind of custom useEffect?
  const hoverContainerRef = useRef(null);
  useEffect(() => {
    const container = hoverContainerRef.current as any;
    if (editMode) {
      // mainHover.style.opacity = "1";
      document.body.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
      if (container) {
        makeElementDraggable(container);
        return (): void => interact(container).unset();
      }
    } else {
      // mainHover.style.opacity = "0";
      document.body.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
    }
  });

  const handleSaveOverlaysPosition = (): void => {
    // Update each overlay with the new dimensions
    const newOverlays = [...settings.overlays];

    newOverlays.forEach((_overlay, index) => {
      // TODO figure out a way to refactor this out
      // some kind of useRef array?
      const overlayDiv = byId("overlay_" + (index + 1));
      const bounds =
        (overlayDiv && {
          width: forceInt(overlayDiv.style.width),
          height: forceInt(overlayDiv.style.height),
          x: forceInt(overlayDiv.style.left),
          y: forceInt(overlayDiv.style.top)
        }) ||
        {};
      const newOverlay = {
        ...newOverlays[index], // old overlay
        bounds // new setting
      };
      newOverlays[index] = newOverlay;
    });

    const hoverDiv = byId("overlay_hover");
    const overlayHover =
      (hoverDiv && {
        x: forceInt(hoverDiv.style.left),
        y: forceInt(hoverDiv.style.top)
      }) ||
      settings.overlayHover;

    ipcSend("save_user_settings", {
      overlays: newOverlays,
      overlayHover,
      skip_refresh: true
    });
  };

  const handleToggleEditMode = (): void => {
    if (editMode) {
      handleSaveOverlaysPosition();
    }
    setEditMode(!editMode);
  };

  const handleActionLog = (
    event: any,
    arg: { str: string; seat: number }
  ): void => {
    let newLog = [...actionLog];
    arg.str = striptags(arg.str, ["log-card", "log-ability"]);
    newLog.push(arg);
    if (arg.seat === -99) {
      newLog = [];
    }
    newLog.sort(compareLogEntries);
    setActionLog(newLog);
  };

  const handleSetArenaState = (event: any, arenaState: number): void => {
    setArenaState(arenaState);
    // Change how cards hover are drawn if we are in a draft
    if (arenaState == ARENA_MODE_DRAFT) {
      setRenderer(RENDERER_DRAFT);
    } else {
      setRenderer(RENDERER_MATCH);
    }
  };

  const handleClose = (
    event: any,
    arg: { action: any; index: number }
  ): void => {
    close(arg.action, arg.index);
  };

  const handleSetDraftCards = (event: any, draft: any): void => {
    setDraft(draft);
    setDraftState({ packN: draft.currentPack, pickN: draft.currentPick });
  };

  const handleSetPlayerData = (): void => {
    // mid-match Arena updates can make edit-mode difficult
    // temporarily allow the overlays to go stale during editing
    // (should be okay since ending edit-mode causes a refresh)
    if (editMode) return;

    // TODO does this even work even???
    setPlayerData(pd);
  };

  const handleSetMatch = (event: any, arg: any): void => {
    const newMatch = JSON.parse(arg);
    newMatch.oppCards = new Deck(newMatch.oppCards);
    const tempMain = newMatch.playerCardsLeft.mainDeck;
    newMatch.playerCardsLeft = new Deck(newMatch.playerCardsLeft);
    newMatch.playerCardsLeft.mainboard._list = tempMain;
    newMatch.player.deck = new Deck(newMatch.player.deck);
    newMatch.player.originalDeck = new Deck(newMatch.player.originalDeck);
    setMatch(newMatch);
  };

  const handleSetTurn = (
    event: any,
    arg: { playerSeat: number; turnPriority: number }
  ): void => {
    const { playerSeat: _we, turnPriority: _priority } = arg;
    if (
      turnPriority != _priority &&
      _priority == playerSeat &&
      settings.sound_priority
    ) {
      const { Howl, Howler } = require("howler");
      const sound = new Howl({ src: ["../sounds/blip.mp3"] });
      Howler.volume(settings.sound_priority_volume);
      sound.play();
    }
    setPlayerSeat(_we);
    setTurnPriority(_priority);
  };

  // register all IPC listeners
  useEffect(() => {
    ipc.on("action_log", handleActionLog);
    ipc.on("edit", handleToggleEditMode);
    ipc.on("close", handleClose);
    ipc.on("set_arena_state", handleSetArenaState);
    ipc.on("set_draft_cards", handleSetDraftCards);
    ipc.on("set_match", handleSetMatch);
    ipc.on("set_player_data", handleSetPlayerData);
    ipc.on("set_turn", handleSetTurn);

    return (): void => {
      // unregister all IPC listeners
      ipc.removeListener("action_log", handleActionLog);
      ipc.removeListener("edit", handleToggleEditMode);
      ipc.removeListener("close", handleClose);
      ipc.removeListener("set_arena_state", handleSetArenaState);
      ipc.removeListener("set_draft_cards", handleSetDraftCards);
      ipc.removeListener("set_match", handleSetMatch);
      ipc.removeListener("set_player_data", handleSetPlayerData);
      ipc.removeListener("set_turn", handleSetTurn);
    };
  });

  const SCALAR = 0.71808510638; // ???

  const setDraftStateCallback = (_draftState: {
    packN: number;
    pickN: number;
  }): void => setDraftState(_draftState);

  const setOddsCallback = (sampleSize: number): void =>
    ipcSend("set_odds_samplesize", sampleSize);

  return (
    <div className="overlay_master_wrapper">
      {!!settings.overlays &&
        settings.overlays.map((overlaySettings: any, index: number) => {
          const handleClickSettings = (): void => {
            ipcSend("renderer_show");
            ipcSend("force_open_overlay_settings", index, IPC_MAIN);
          };
          const handleClickClose = (): void => close(-1, index);
          return (
            <OverlayWindowlet
              actionLog={actionLog}
              arenaState={arenaState}
              draft={draft}
              draftState={draftState}
              editMode={editMode}
              handleClickClose={handleClickClose}
              handleClickSettings={handleClickSettings}
              handleToggleEditMode={handleToggleEditMode}
              index={index}
              key={"overlay_windowlet_" + index}
              match={match}
              makeElementDraggable={makeElementDraggable}
              playerSeat={playerSeat}
              settings={settings}
              setDraftStateCallback={setDraftStateCallback}
              setOddsCallback={setOddsCallback}
              tileStyle={parseInt(settings.card_tile_style)}
              turnPriority={turnPriority}
            />
          );
        })}
      <div
        className={"overlay_hover_container " + getEditModeClass(editMode)}
        id={"overlay_hover"}
        ref={hoverContainerRef}
        style={{
          opacity: editMode ? "1" : undefined,
          left: settings.overlayHover
            ? `${settings.overlayHover.x}px`
            : `${window.innerWidth / 2 - pd.cardsSizeHoverCard / 2}px`,
          top: settings.overlayHover
            ? `${settings.overlayHover.y}px`
            : `${window.innerHeight - pd.cardsSizeHoverCard / SCALAR - 50}px`
        }}
      >
        <img
          className="main_hover"
          src="../images/nocard.png"
          style={{
            opacity: "0",
            width: playerData.cardsSizeHoverCard + "px",
            height: playerData.cardsSizeHoverCard / SCALAR + "px"
          }}
        />
        <div
          className="main_hover_ratings"
          style={{ display: "none", opacity: "0" }}
        />
      </div>
    </div>
  );
}
