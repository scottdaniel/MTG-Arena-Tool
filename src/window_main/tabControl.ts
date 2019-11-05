import {
    MAIN_HOME ,
    MAIN_DECKS,
    MAIN_HISTORY,
    MAIN_EVENTS,
    MAIN_EXPLORE,
    MAIN_ECONOMY,
    MAIN_COLLECTION,
    MAIN_SETTINGS
} from "../shared/constants";
import { queryElements as $$ } from "../shared/dom-fns";
import pd from "../shared/player-data";

import {
  getLocalState,
  hideLoadingBars,
  resetMainContainer,
  showLoadingBars
} from "./renderer-util";

import { openDecksTab } from "./decks";
import { openHistoryTab } from "./history";
import { openEventsTab } from "./events";
import { openEconomyTab } from "./economy";
import { openExploreTab } from "./explore";
import { openCollectionTab } from "./collection";
import { showOfflineSplash } from "./renderer-util";
import { openSettingsTab } from "./settings";
import { openHomeTab, requestHome } from "./home";

//
export function openTab(tab:number, filters = {}, dataIndex = 0, scrollTop = 0) {
    showLoadingBars();
    $$(".top_nav_item").forEach(el => el.classList.remove("item_selected"));
    let tabClass = "it" + tab;
    resetMainContainer();
    switch (tab) {
      case MAIN_DECKS:
        openDecksTab(filters, scrollTop);
        break;
      case MAIN_HISTORY:
        openHistoryTab(filters, dataIndex, scrollTop);
        break;
      case MAIN_EVENTS:
        openEventsTab(filters, dataIndex, scrollTop);
        break;
      case MAIN_EXPLORE:
        if (pd.offline) {
          showOfflineSplash();
        } else {
          openExploreTab();
        }
        break;
      case MAIN_ECONOMY:
        openEconomyTab(dataIndex, scrollTop);
        break;
      case MAIN_COLLECTION:
        openCollectionTab();
        break;
      case MAIN_SETTINGS:
        tabClass = "ith";
        openSettingsTab(-1, scrollTop);
        break;
      case MAIN_HOME:
        tabClass = "ith";
        if (pd.offline) {
          showOfflineSplash();
        } else {
          if (getLocalState().discordTag === null) {
            openHomeTab(null, true);
          } else {
            requestHome();
          }
        }
        break;
      default:
        hideLoadingBars();
        $$(".init_loading")[0].style.display = "block";
        break;
    }
    if ($$("." + tabClass)[0])
      $$("." + tabClass)[0].classList.add("item_selected");
  }