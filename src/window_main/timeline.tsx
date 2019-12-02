import React, { useEffect, PureComponent } from "react";
import { queryElements as $$ } from "../shared/dom-fns";
import playerData from "../shared/player-data";
import mountReactComponent from "./mountReactComponent";
import { getRankColorClass } from "../shared/util";

function sortByTimestamp(a: any, b: any): number {
  return a.timestamp - b.timestamp;
}

interface seasonalRankData {
  eventId: string;
  id: string;
  lastMatchId: string;
  newClass: string;
  newLevel: number;
  newStep: number;
  oldClass: string;
  oldLevel: number;
  oldStep: number;
  owner: string;
  player: string;
  playerId: string;
  rankUpdateType: string;
  seasonOrdinal: number;
  timestamp: number;
  wasLossProtected: boolean;
  oldRankNumeric?: number;
  newRankNumeric?: number;
  date?: Date;
}

function getRankY(rank: string, tier: number, steps: number): number {
  let value = 0;
  switch (rank) {
    case "Bronze":
      value = 0;
      break;
    case "Silver":
      value = 4 * 6;
      break;
    case "Gold":
      value = 4 * 6 * 2;
      break;
    case "Platinum":
      value = 4 * 6 * 3;
      break;
    case "Diamond":
      value = 4 * 6 * 4;
      break;
    case "Mythic":
      value = 4 * 6 * 5;
      break;
  }

  return value + 6 * (4 - tier) + steps;
}

function getSeasonData(
  type = "constructed",
  seasonOrdinal?: number
): seasonalRankData[] {
  if (!seasonOrdinal) seasonOrdinal = playerData.rank[type].seasonOrdinal;

  let seasonalData: string[] = playerData.getSeasonalRankData(
    seasonOrdinal,
    type
  );
  seasonalData = seasonalData.filter((v, i) => seasonalData.indexOf(v) === i);

  function morphData(data: seasonalRankData) {
    data.oldRankNumeric = getRankY(data.oldClass, data.oldLevel, data.oldStep);
    data.newRankNumeric = getRankY(data.newClass, data.newLevel, data.newStep);
    data.date = new Date(data.timestamp);
    return data;
  }

  return seasonalData
    .map((id: string) => playerData.getSeasonal(id))
    .map((data: any) => morphData(data))
    .sort(sortByTimestamp);
}

function TimeLinePart({ ...props }) {
  const [hover, setHover] = React.useState(false);
  const height = 300;

  const rectPoints = `0 ${height - props.oldRankNumeric * 2} 20 ${height -
    props.newRankNumeric * 2} 20 ${height} 0 ${height}`;
  const linePoints = `0 ${height - props.oldRankNumeric * 2} 20 ${height -
    props.newRankNumeric * 2}`;
  return (
    <div className="TimeLineLine">
      <svg width="20" height={height} version="1.1">
        <polygon
          points={rectPoints}
          fill="var(--color-r)"
          strokeWidth="0"
        />
        <polyline points={linePoints} stroke="var(--color-light)" strokeWidth="1" />
      </svg>
    </div>
  );
}

function TimelineTab() {
  let data: seasonalRankData[] = getSeasonData("constructed");
  console.log(data);
  return (
    <div className="TimeLine">
      {data.map((value: seasonalRankData, index: number) => {
        console.log("From: ", value.oldClass, value.oldLevel, "step", value.oldStep, value.oldRankNumeric);
        console.log("To:   ", value.newClass, value.newLevel, "step", value.newStep, value.newRankNumeric);
        return <TimeLinePart key={index} {...value} />;
      })}
    </div>
  );
}

export function openTimelineTab(): boolean {
  const mainDiv = $$("#ux_0")[0];
  mountReactComponent(<TimelineTab />, mainDiv);
  return true;
}
