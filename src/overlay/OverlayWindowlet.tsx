import React, { useCallback, useRef } from "react";

import {
  ARENA_MODE_MATCH,
  ARENA_MODE_DRAFT,
  COLORS_ALL,
  MANA,
  OVERLAY_FULL,
  OVERLAY_LEFT,
  OVERLAY_ODDS,
  OVERLAY_MIXED,
  OVERLAY_SEEN,
  OVERLAY_DRAFT,
  OVERLAY_LOG,
  OVERLAY_DRAFT_BREW,
  OVERLAY_DRAFT_MODES,
  PACK_SIZES
} from "../shared/constants";
import Deck from "../shared/deck";

import { getEditModeClass, useEditModeOnRef } from "./overlayUtil";
import Clock from "./Clock";
import ActionLog from "./ActionLog";
import DeckList from "./DeckList";

const DEFAULT_BACKGROUND = "../images/Bedevil-Art.jpg";
const packSizeMap: { [key: string]: number } = PACK_SIZES;
const manaColorMap: { [key: number]: string } = MANA;

interface OverlayElementsProps {
  actionLog: any;
  draft: any;
  draftState: { packN: number; pickN: number };
  index: number;
  match: any;
  settings: any;
  tileStyle: number;
  turnPriority: number;
  setOddsCallback: (sampleSize: number) => void;
  setDraftStateCallback: (state: { packN: number; pickN: number }) => void;
}

function OverlayElements(props: OverlayElementsProps): JSX.Element {
  const {
    actionLog,
    draft,
    draftState,
    index,
    match,
    settings,
    tileStyle,
    turnPriority,
    setOddsCallback,
    setDraftStateCallback
  } = props;

  let visibleDeck = null;
  let cardsCount = 0;
  let mainTitle = "Overlay " + (index + 1);
  let subTitle = "";

  if (settings.mode === OVERLAY_LOG) {
    mainTitle = "Action Log";
    // TODO add subtitle with current turn number
  }

  const packSize = (draft && packSizeMap[draft.set]) || 14;

  const handleDraftPrev = useCallback((): void => {
    let { packN, pickN } = draftState;
    pickN -= 1;
    if (pickN < 0) {
      pickN = packSize;
      packN -= 1;
    }
    if (packN < 0) {
      pickN = draft.pickNumber;
      packN = draft.packNumber;
    }
    setDraftStateCallback({ packN, pickN });
  }, [draftState, draft]);

  const handleDraftNext = useCallback((): void => {
    let { packN, pickN } = draftState;
    pickN += 1;
    if (pickN > packSize) {
      pickN = 0;
      packN += 1;
    }
    if (pickN > draft.pickNumber && packN == draft.packNumber) {
      pickN = 0;
      packN = 0;
    }
    if (
      packN > draft.packNumber ||
      (pickN == draft.pickNumber && packN == draft.packNumber)
    ) {
      packN = draft.packNumber;
      pickN = draft.pickNumber;
    }
    setDraftStateCallback({ packN, pickN });
  }, [draftState, draft]);

  const { packN, pickN } = draftState;
  let pack = [];
  let pick = "";
  let isCurrent = false;
  let pickName = "";
  if (draft) {
    isCurrent = packN === draft.packNumber && pickN === draft.pickNumber;
    pickName = "Pack " + (packN + 1) + " - Pick " + (pickN + 1);
    if (isCurrent) {
      pickName += " - Current";
    }
    const key = "pack_" + packN + "pick_" + pickN;
    if (key in draft) {
      pack = draft[key].pack;
      pick = draft[key].pick;
    } else if (isCurrent) {
      pack = draft.currentPack;
      pick = "";
    }

    if (settings.mode === OVERLAY_DRAFT) {
      visibleDeck = new Deck({ name: pickName }, pack);
      cardsCount = visibleDeck.mainboard.count();
      mainTitle = visibleDeck.name;
      subTitle = "Cards Left: " + cardsCount + " cards";
    } else if (settings.mode === OVERLAY_DRAFT_BREW) {
      visibleDeck = new Deck({ name: "All Picks" }, draft.pickedCards);
      cardsCount = visibleDeck.mainboard.count();
      mainTitle = visibleDeck.name;
      subTitle = "Total Picks: " + cardsCount + " cards";
    }
  }

  let cleanName = match && match.opponent && match.opponent.name;
  if (cleanName && cleanName !== "Sparky") {
    cleanName = cleanName.slice(0, -6);
  }
  const oppName = cleanName || "Opponent";
  let sampleSize = 1;
  if (match) {
    const cardOdds = match.playerCardsOdds;
    sampleSize = cardOdds.sampleSize || 1;
    switch (settings.mode) {
      case OVERLAY_FULL:
        visibleDeck = match.player.deck;
        cardsCount = visibleDeck.mainboard.count();
        mainTitle = visibleDeck.name;
        subTitle = "Full Deck: " + cardsCount + " cards";
        break;
      case OVERLAY_LEFT:
        visibleDeck = match.playerCardsLeft;
        cardsCount = visibleDeck.mainboard.count();
        mainTitle = visibleDeck.name;
        subTitle = "Library: " + cardsCount + " cards";
        break;
      case OVERLAY_ODDS:
      case OVERLAY_MIXED:
        visibleDeck = match.playerCardsLeft;
        cardsCount = visibleDeck.mainboard.count();
        mainTitle = visibleDeck.name;
        subTitle = `Next Draw: ${sampleSize}/${cardsCount} cards`;
        break;
      case OVERLAY_SEEN:
        visibleDeck = match.oppCards;
        cardsCount = visibleDeck.mainboard.count();
        mainTitle = "Played by " + oppName;
        subTitle = "Total Seen: " + cardsCount + " cards";
        break;
    }
  }

  return (
    <>
      {!!settings.title && (
        <div className="overlay_deckname">
          {mainTitle}
          {settings.mode === OVERLAY_DRAFT && (
            <div
              className="overlay_draft_container"
              style={settings.top ? { top: "32px" } : undefined}
            >
              <div className="draft_prev click-on" onClick={handleDraftPrev} />
              <div className="draft_title" />
              <div className="draft_next click-on" onClick={handleDraftNext} />
            </div>
          )}
        </div>
      )}
      {settings.mode === OVERLAY_SEEN && !!match && (
        <div className="overlay_archetype">{match.oppArchetype}</div>
      )}
      {!!settings.title && !!visibleDeck && (
        <div className="overlay_deckcolors">
          {visibleDeck.colors.get().map((color: number) => (
            <div
              className={"mana_s20 mana_" + manaColorMap[color]}
              key={color}
            />
          ))}
        </div>
      )}
      {settings.mode === OVERLAY_LOG && <ActionLog actionLog={actionLog} />}
      {!!settings.deck && !!visibleDeck && (
        <DeckList
          deck={visibleDeck}
          subTitle={subTitle}
          highlightCardId={pick}
          settings={settings}
          tileStyle={tileStyle}
          cardOdds={match ? match.playerCardsOdds : {}}
          setOddsCallback={setOddsCallback}
        />
      )}
      {!!settings.clock && !OVERLAY_DRAFT_MODES.includes(settings.mode) && (
        <Clock
          key={"overlay_clock_" + index}
          matchBeginTime={match ? new Date(match.beginTime) : new Date()}
          oppName={oppName}
          playerSeat={match && match.player ? match.player.seat : 1}
          priorityTimers={match ? match.priorityTimers : [Date.now(), 0, 0]}
          turnPriority={turnPriority}
        />
      )}
    </>
  );
}

export interface OverlayWindowletProps {
  arenaState: number;
  actionLog: any;
  draft: any;
  draftState: { packN: number; pickN: number };
  editMode: boolean;
  handleClickClose: () => void;
  handleClickSettings: () => void;
  handleToggleEditMode: () => void;
  index: number;
  match: any;
  settings: any;
  setOddsCallback: (sampleSize: number) => void;
  setDraftStateCallback: (state: { packN: number; pickN: number }) => void;
  turnPriority: number;
}

export default function OverlayWindowlet(
  props: OverlayWindowletProps
): JSX.Element {
  const {
    arenaState,
    editMode,
    handleClickClose,
    handleClickSettings,
    handleToggleEditMode,
    index,
    settings,
    ...elProps
  } = props;

  const containerRef = useRef(null);
  useEditModeOnRef(editMode, containerRef);

  const backgroundImage =
    "url(" +
    (settings.back_url && settings.back_url !== "default"
      ? settings.back_url
      : DEFAULT_BACKGROUND) +
    ")";
  // useEffect(() => {
  //   const xhr = new XMLHttpRequest();
  //   xhr.open("HEAD", arg);
  //   xhr.onload = function() {
  //     if (xhr.status === 200) {
  //       mainWrapper.style.backgroundImage = backgroundImage;
  //     } else {
  //       mainWrapper.style.backgroundImage = "";
  //     }
  //   };
  //   xhr.send();
  // }, [backgroundImage]);
  const overlaySettings = settings.overlays[index];
  const currentModeApplies =
    (OVERLAY_DRAFT_MODES.includes(overlaySettings.mode) &&
      arenaState === ARENA_MODE_DRAFT) ||
    (!OVERLAY_DRAFT_MODES.includes(overlaySettings.mode) &&
      arenaState === ARENA_MODE_MATCH);
  const isVisible =
    overlaySettings.show && (currentModeApplies || overlaySettings.show_always);
  return (
    <div
      className={"overlay_container " + getEditModeClass(editMode)}
      id={"overlay_" + (index + 1)}
      ref={containerRef}
      style={{
        opacity: isVisible ? "1" : "0",
        visibility: isVisible ? "visible" : "hidden",
        height: overlaySettings.bounds.height + "px",
        width: overlaySettings.bounds.width + "px",
        left: overlaySettings.bounds.x + "px",
        top: overlaySettings.bounds.y + "px"
      }}
    >
      <div className="outer_wrapper">
        <div
          className="overlay_wrapper overlay_bg_image"
          style={{
            backgroundImage,
            opacity: overlaySettings.alpha_back.toString()
          }}
        />
      </div>
      <div
        className="outer_wrapper elements_wrapper"
        style={{ opacity: overlaySettings.alpha.toString() }}
      >
        <OverlayElements
          index={index}
          settings={overlaySettings}
          tileStyle={parseInt(settings.card_tile_style)}
          {...elProps}
        />
      </div>
      {overlaySettings.top && (
        <div className="outer_wrapper top_nav_wrapper">
          <div
            className="flex_item overlay_icon click-on"
            onClick={handleToggleEditMode}
            style={{ backgroundColor: `var(--color-${COLORS_ALL[index]})` }}
          />
          <div
            className="button settings click-on"
            onClick={handleClickSettings}
            style={{ margin: 0 }}
          />
          <div
            className="button close click-on"
            onClick={handleClickClose}
            style={{ marginRight: "4px" }}
          />
        </div>
      )}
    </div>
  );
}
