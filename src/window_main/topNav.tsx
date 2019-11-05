import _ from "lodash";
import React from "react";
import ReactDOM from 'react-dom';
import { queryElements as $$ } from "../shared/dom-fns";
import { openTab } from "./tabControl";

import {
    MAIN_HOME ,
    MAIN_DECKS,
    MAIN_HISTORY,
    MAIN_EVENTS,
    MAIN_EXPLORE,
    MAIN_ECONOMY,
    MAIN_COLLECTION,
    MAIN_CONSTRUCTED,
    MAIN_LIMITED
} from "../shared/constants";

interface topNavItemProps {
    id: number,
    title: string
}

function TopNavItem(props:topNavItemProps) {
    const {id, title} = props;

    const clickTab = React.useCallback((tabId: number) => (event: React.MouseEvent<HTMLDivElement>) => {
        if (!event.currentTarget.classList.contains("item_selected")) {
            $$(".top_nav_item").forEach(el => el.classList.remove("item_selected"));
            event.currentTarget.classList.add("item_selected");
            openTab(tabId);
        }
    }, [props.id]);

    return (
        <div className={"top_nav_item it" + id} onClick={clickTab(id)}>
            {title !== "" ? (<span className={"top_nav_item_text"}>{title}</span>) : false}
            <div className={"top_nav_icon icon_" + id} title={_.camelCase(title)}></div>
        </div>
    );
}

function TopNav() {
    const homeTab = {id: MAIN_HOME, title:""};
    const myDecksTab = {id: MAIN_DECKS, title:"MY DECKS"};
    const historyTab = {id: MAIN_HISTORY, title:"HISTORY"};
    const eventsTab = {id: MAIN_EVENTS, title:"EVENTS"};
    const exploreTab = {id: MAIN_EXPLORE, title:"EXPLORE"};
    const economyTab = {id: MAIN_ECONOMY, title:"ECONOMY"};
    const collectionTab = {id: MAIN_COLLECTION, title:"COLLECTION"};

    const contructedNav = {id: MAIN_CONSTRUCTED, title:""};
    const limitedNav = {id: MAIN_LIMITED, title:""};

    return (
        <div className={"top_nav"}>
            <div className={"top_nav_icons"}>
                <TopNavItem {...homeTab}/>
                <TopNavItem {...myDecksTab}/>
                <TopNavItem {...historyTab}/>
                <TopNavItem {...eventsTab}/>
                <TopNavItem {...exploreTab}/>
                <TopNavItem {...economyTab}/>
                <TopNavItem {...collectionTab}/>
            </div>
            <div className={"top_nav_info"}>
                <TopNavItem {...contructedNav}/>
                <TopNavItem {...limitedNav}/>
                <div className={"top_patreon"}></div>
                <div className={"top_username"} title={"Arena username"}></div>
                <div className={"top_username_id"} title={"Arena user ID"}></div>
            </div>
        </div>
    );
}

export default function createTopNav(parent: Element): boolean {
    ReactDOM.render(
        <TopNav />,
        parent
    );
    return true;
}