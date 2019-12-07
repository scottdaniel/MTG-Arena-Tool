import React, { useEffect, PureComponent } from "react";
import { queryElements as $$ } from "../shared/dom-fns";
import playerData from "../shared/player-data";
import mountReactComponent from "./mountReactComponent";
import _ from "lodash";
import { getRankColorClass } from "../shared/util";
import { get_rank_index as getRankIndex } from "../shared/util";
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

function TimeLinePart(props:any) {
  const { width, height, hover, setHover, lastMatchId } = props;

  const deckId = playerData.match(lastMatchId).playerDeck.id;

  const newPointHeight = height - props.newRankNumeric * 2;
  const oldwPointHeight = height - props.oldRankNumeric * 2;
  const rectPoints = `0 ${oldwPointHeight} ${width} ${newPointHeight} ${width} ${height} 0 ${height}`;
  const linePoints = `0 ${oldwPointHeight} ${width} ${newPointHeight}`;

  return (
    <div className={"TimeLineLine" + (hover == deckId ? " hover" : "")} onMouseEnter={() => {
        setHover(deckId);
      }} >
      <svg width={width} height={height} version="1.1">
        <polygon
          points={rectPoints}
          strokeWidth="0"
        />
        <polyline points={linePoints} strokeWidth="1" />
      </svg>
      {
        props.oldClass !== props.newClass
        ? <TimelineRankBullet left={width - 24} height={props.newRankNumeric * 2 + 48} rankClass={props.newClass} rankLevel={props.newLevel} />
        : <></>
      }
    </div>
  );
}

function TimelineRankBullet(props:any) {
  const { left, height, rankClass, rankLevel } = props;

  const divStyle = {
    backgroundPosition: getRankIndex(rankClass, rankLevel) * -48 + "px 0px",
    margin: `-${height}px 0 0px ${left}px`
  };

  const divTitle = rankClass + " " + rankLevel;
  return (
    <div style={divStyle} title={divTitle} className="timelineRank top_constructed_rank"></div>
  );
}

function TimelineTab() {
  let data: seasonalRankData[] = getSeasonData("constructed");
  const [ hoverDeckId, setHoverDeckId ] = React.useState("");
  const [dimensions, setDimensions] = React.useState({
    height: window.innerHeight,
    width: window.innerWidth
  });

  let linesWidth = 0;
  const handleResize = function() {
    setDimensions({
      height: $$(".TimeLine")[0].offsetHeight,
      width: $$(".TimeLine")[0].offsetWidth
    });
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="TimeLine">
      {data.map((value: seasonalRankData, index: number) => {
        console.log("From: ", value.oldClass, value.oldLevel, "step", value.oldStep, value.oldRankNumeric);
        console.log("To:   ", value.newClass, value.newLevel, "step", value.newStep, value.newRankNumeric);
        return <TimeLinePart
          height={dimensions.height}
          width={dimensions.width / data.length}
          key={index}
          hover={hoverDeckId}
          setHover={setHoverDeckId}
          {...value}
        />;
      })}
    </div>
  );
}

export function openTimelineTab(): boolean {
  const mainDiv = $$("#ux_0")[0];
  mountReactComponent(<TimelineTab />, mainDiv);
  return true;
}
