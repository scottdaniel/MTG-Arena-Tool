import _ from "lodash";
import React, { useEffect } from "react";
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
    compact: boolean,
    id: number,
    title: string
}

function TopNavItem(props:topNavItemProps) {
    const {compact, id, title} = props;

    const clickTab = React.useCallback((tabId: number) => (event: React.MouseEvent<HTMLDivElement>) => {
        if (!event.currentTarget.classList.contains("item_selected")) {
            $$(".top_nav_item").forEach(el => el.classList.remove("item_selected"));
            event.currentTarget.classList.add("item_selected");
            openTab(tabId);
        }
    }, [props.id]);

    return compact ? (
        <div className={"top_nav_item_no_label top_nav_item it" + id} onClick={clickTab(id)}>
            <div className={"top_nav_icon icon_" + id} title={_.camelCase(title)}></div>
        </div>
    ) : (
        <div className={"top_nav_item it" + id + (title == "" ? " top_nav_item_no_label" : "")} onClick={clickTab(id)}>
            {title !== "" ? (<span className={"top_nav_item_text"}>{title}</span>) : 
            (<div className={"top_nav_icon icon_" + id} title={_.camelCase(title)}></div>)}
        </div>
    );
}

function TopNav() {
    const [compact, setCompact] = React.useState(false);
    const homeTab = {compact: compact, id: MAIN_HOME, title:""};
    const myDecksTab = {compact: compact, id: MAIN_DECKS, title:"MY DECKS"};
    const historyTab = {compact: compact, id: MAIN_HISTORY, title:"HISTORY"};
    const eventsTab = {compact: compact, id: MAIN_EVENTS, title:"EVENTS"};
    const exploreTab = {compact: compact, id: MAIN_EXPLORE, title:"EXPLORE"};
    const economyTab = {compact: compact, id: MAIN_ECONOMY, title:"ECONOMY"};
    const collectionTab = {compact: compact, id: MAIN_COLLECTION, title:"COLLECTION"};

    const contructedNav = {compact: compact, id: MAIN_CONSTRUCTED, title:""};
    const limitedNav = {compact: compact, id: MAIN_LIMITED, title:""};

    React.useEffect(() => {
        if ($$(".top_nav_icons")[0].offsetWidth < 530) {
            if (!compact) {
                setCompact(true);
            }
        } else if (compact) {
            setCompact(false);
        }
    });

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