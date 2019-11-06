import {
    EASING_DEFAULT,
    DATE_SEASON,
    MAIN_HOME ,
    MAIN_DECKS,
    MAIN_HISTORY,
    MAIN_EVENTS,
    MAIN_EXPLORE,
    MAIN_ECONOMY,
    MAIN_COLLECTION,
    MAIN_SETTINGS,
    MAIN_CONSTRUCTED,
    MAIN_LIMITED
} from "../shared/constants";

import { queryElements as $$ } from "../shared/dom-fns";
import pd from "../shared/player-data";
import Aggregator from "./aggregator";
import anime from "animejs";

import {
  changeBackground,
  ipcSend,
  getLocalState,
  setLocalState,
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
  //$$(".top_nav_item").forEach(el => el.classList.remove("item_selected"));
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

export function clickNav(id:number) {
  changeBackground("default");
  document.body.style.cursor = "auto";
  //if (!selected)
      anime({
          targets: ".moving_ux",
          left: 0,
          easing: EASING_DEFAULT,
          duration: 350
      });

      let filters = { date: pd.settings.last_date_filter, eventId: "", rankedMode: false };
      const sidebarActive = id;

      if (id == MAIN_CONSTRUCTED) {
          filters = {
              ...Aggregator.getDefaultFilters(),
              date: DATE_SEASON,
              eventId: Aggregator.RANKED_CONST,
              rankedMode: true
          };
      }
      if (id == MAIN_LIMITED) {
          filters = {
              ...Aggregator.getDefaultFilters(),
              date: DATE_SEASON,
              eventId: Aggregator.RANKED_DRAFT,
              rankedMode: true
          };
      }

      setLocalState({ lastDataIndex: 0, lastScrollTop: 0 });
      openTab(sidebarActive, filters);
      ipcSend("save_user_settings", {
          last_open_tab: sidebarActive,
          last_date_filter: filters.date,
          skip_refresh: true
      });
  /*
  } else {
    anime({
      targets: ".moving_ux",
      left: 0,
      easing: EASING_DEFAULT,
      duration: 350
    });
  }
  */
}