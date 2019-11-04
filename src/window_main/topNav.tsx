import _ from "lodash";
import mountReactComponent from "./mountReactComponent";
import { createDiv } from "../shared/dom-fns";
import React from "react";
import ReactDOM from 'react-dom';

interface topNavItemProps {
    id: string,
    title: string
}

function TopNavItem(props:topNavItemProps) {
    const {id, title} = props;
    return (
        <div className={"top_nav_item it" + id}>
            {title !== "" ? (<span className={"top_nav_item_text"}>{title}</span>) : false}
            <div className={"top_nav_icon icon_" + id} title={_.camelCase(title)}></div>
        </div>
    );
}

function TopNav() {
    const homeTab = {id: "h", title:""};
    const myDecksTab = {id: "0", title:"MY DECKS"};
    const historyTab = {id: "1", title:"HISTORY"};
    const eventsTab = {id: "2", title:"EVENTS"};
    const exploreTab = {id: "3", title:"EXPLORE"};
    const economyTab = {id: "4", title:"ECONOMY"};
    const collectionTab = {id: "5", title:"COLLECTION"};

    const contructedNav = {id: "7", title:""};
    const limitedNav = {id: "8", title:""};

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