import { ipcRenderer as ipc, webFrame } from "electron";
import React, { useEffect, useCallback, useRef, useState } from "react";
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

import {
  getEditModeClass,
  RENDERER_MATCH,
  RENDERER_DRAFT,
  useEditModeOnRef
} from "./overlayUtil";
import OverlayWindowlet from "./OverlayWindowlet";

// TODO figure out a way to refactor this out
// some kind of useRef array?
const byId = (id: string): HTMLElement | null => document.getElementById(id);

function ipcSend(method: string, arg?: any, to = IPC_BACKGROUND): void {
  ipc.send("ipc_switch", method, IPC_OVERLAY, arg, to);
}

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
  const [turnPriority, setTurnPriority] = useState(1);
  const playerData = pd as any;
  const [settings, setSettings] = useState(playerData.settings);

  useEffect(() => {
    webFrame.setZoomFactor(settings.overlay_scale / 100);
  }, [settings]);
  useEffect(() => {
    document.body.style.backgroundColor = editMode
      ? "rgba(0, 0, 0, 0.3)"
      : "rgba(0, 0, 0, 0.05)";
  }, [editMode]);

  const hoverContainerRef = useRef(null);
  useEditModeOnRef(editMode, hoverContainerRef);

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
    const bool = arg.action;
    const index = arg.index;
    // -1 to toggle, else set
    const show = bool == -1 ? !settings.overlays[index].show : bool;
    const overlays = [...settings.overlays];
    const newOverlay = {
      ...overlays[index], // old overlay
      show // new setting
    };
    overlays[index] = newOverlay;
    ipcSend("save_user_settings", { overlays });
  };

  const handleSetDraftCards = (event: any, draft: any): void => {
    setDraft(draft);
    setDraftState({ packN: draft.currentPack, pickN: draft.currentPick });
  };

  const handleSettingsUpdated = useCallback((): void => {
    // mid-match Arena updates can make edit-mode difficult
    // temporarily allow the overlays to go stale during editing
    // (should be okay since ending edit-mode causes a refresh)
    if (editMode) return;
    setSettings({ ...playerData.settings });
  }, [editMode]);

  const handleSetMatch = (event: any, arg: any): void => {
    const newMatch = JSON.parse(arg);
    newMatch.oppCards = new Deck(newMatch.oppCards);
    newMatch.playerCardsLeft = new Deck(newMatch.playerCardsLeft);
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
      _priority == _we &&
      settings.sound_priority
    ) {
      const { Howl, Howler } = require("howler");
      const sound = new Howl({ src: ["../sounds/blip.mp3"] });
      Howler.volume(settings.sound_priority_volume);
      sound.play();
    }
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
    ipc.on("set_player_data", handleSettingsUpdated);
    ipc.on("set_turn", handleSetTurn);

    return (): void => {
      // unregister all IPC listeners
      ipc.removeListener("action_log", handleActionLog);
      ipc.removeListener("edit", handleToggleEditMode);
      ipc.removeListener("close", handleClose);
      ipc.removeListener("set_arena_state", handleSetArenaState);
      ipc.removeListener("set_draft_cards", handleSetDraftCards);
      ipc.removeListener("set_match", handleSetMatch);
      ipc.removeListener("set_player_data", handleSettingsUpdated);
      ipc.removeListener("set_turn", handleSetTurn);
    };
  });

  const SCALAR = 0.71808510638; // ???
  const { cardsSizeHoverCard } = playerData;

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
          const handleClickClose = (): void =>
            handleClose(null, { action: -1, index });
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
              settings={settings}
              setDraftStateCallback={setDraftState}
              setOddsCallback={setOddsCallback}
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
            : `${window.innerWidth / 2 - cardsSizeHoverCard / 2}px`,
          top: settings.overlayHover
            ? `${settings.overlayHover.y}px`
            : `${window.innerHeight - cardsSizeHoverCard / SCALAR - 50}px`
        }}
      >
        <img
          className="main_hover"
          src="../images/nocard.png"
          style={{
            opacity: "0",
            width: cardsSizeHoverCard + "px",
            height: cardsSizeHoverCard / SCALAR + "px"
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
