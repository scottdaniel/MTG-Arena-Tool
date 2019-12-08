import React, { useEffect, PureComponent } from "react";
import { queryElements as $$ } from "../shared/dom-fns";
import playerData from "../shared/player-data";
import mountReactComponent from "./mountReactComponent";
import _ from "lodash";
import format from "date-fns/format";
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

/**
 * Get the ranks conversion to a Y coordinate
 * @param rank Rank name
 * @param tier Level
 * @param steps 
 */
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

/**
 * Get the data for this season and add fields to the data for timeline processing
 * @param type season type ("constructed" or "limited")
 * @param seasonOrdinal Season number/id (optional)
 */
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
    data.date = new Date(data.timestamp * 1000);
    console.log(data);
    return data;
  }

  return seasonalData
    .map((id: string) => playerData.getSeasonal(id))
    .map((data: any) => morphData(data))
    .sort(sortByTimestamp);
}

/**
 * Component for a line/stroke of the timeline
 * @param props 
 */
function TimeLinePart(props:any) {
  const { width, height, hover, setHover, lastMatchId } = props;

  const deckId = playerData.matchExists(lastMatchId) ? playerData.match(lastMatchId).playerDeck.id : "";

  const newPointHeight = height - props.newRankNumeric * 2;
  const oldwPointHeight = height - props.oldRankNumeric * 2;
  const rectPoints = `0 ${oldwPointHeight} ${width} ${newPointHeight} ${width} ${height} 0 ${height}`;
  const linePoints = `0 ${oldwPointHeight} ${width} ${newPointHeight}`;


  const style = {
    // Get a color that is the modulus of the hex ID
    fill: `hsl(${ parseInt(deckId, 16) % 360 }, 64%, 63%)`
  }

  return (
    <div style={style} className={"timeline-line" + (hover == deckId ? " hover" : "")} onMouseEnter={() => {
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

/**
 * Component for a Rank "bullet" icon in the timeline
 * @param props 
 */
function TimelineRankBullet(props:any) {
  const { left, height, rankClass, rankLevel } = props;

  const divStyle = {
    backgroundPosition: getRankIndex(rankClass, rankLevel) * -48 + "px 0px",
    margin: `-${height}px 0 0px ${left}px`
  };

  const divTitle = rankClass + " " + rankLevel;
  return (
    <div style={divStyle} title={divTitle} className="timeline-rank top_constructed_rank"></div>
  );
}

/**
 * Main component for the Timeline tab
 * @param props 
 */
function TimelineTab() {
  const [ hoverDeckId, setHoverDeckId ] = React.useState("");
  const [dimensions, setDimensions] = React.useState({
    height: window.innerHeight,
    width: window.innerWidth
  });

  // This should be a select
  const seasonType = "constructed";
  // Notice we can see old seasons too adding the seasonOrdinal
  let data: seasonalRankData[] = getSeasonData(seasonType);
  
  const handleResize = function() {
    setDimensions({
      height: $$(".timeline-box")[0].offsetHeight,
      width: $$(".timeline-box")[0].offsetWidth
    });
  };

  useEffect(() => {
    // We might want to add a delay here to avoid re-rendering too many times per second while resizing
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const drawingSeason = data[0].seasonOrdinal;
  const drawingSeasonDate = data[0].date;

  return (
    <>
      <div className="timeline-title">Season {drawingSeason} - {format(drawingSeasonDate as Date, 'MMMM yyyy')}</div>
      <div className="timeline-box">
        {data.map((value: seasonalRankData, index: number) => {
          //console.log("From: ", value.oldClass, value.oldLevel, "step", value.oldStep, value.oldRankNumeric);
          //console.log("To:   ", value.newClass, value.newLevel, "step", value.newStep, value.newRankNumeric);
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
    </>
  );
}

export function openTimelineTab(): boolean {
  const mainDiv = $$("#ux_0")[0];
  mountReactComponent(<TimelineTab />, mainDiv);
  return true;
}
