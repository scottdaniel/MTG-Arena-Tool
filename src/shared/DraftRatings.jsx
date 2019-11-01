import * as React from "react";
import { DRAFT_RANKS } from "./constants";

export default function DraftRatings(_props) {
  const { card } = _props;
  const rank = card.rank;
  const rankValues = card.rank_values;
  const rankControversy = card.rank_controversy;
  const maxValue = Math.max(...rankValues);

  return (
    <div className="rank_values_main_container">
      <div className="rank_value_container">
        Rank: {DRAFT_RANKS[Math.round(rank)]}
      </div>
      <div className="rank_value_container">Controversy: {rankControversy}</div>
      {rankValues &&
        rankValues.map((v, index) => {
          const rv = 12 - index;
          const rank = DRAFT_RANKS[rv];
          let colorClass = "white";
          if (rank == "A+" || rank == "A") {
            colorClass = "blue";
          } else if (rank == "A-" || rank == "B+" || rank == "B") {
            colorClass = "green";
          } else if (rank == "C-" || rank == "D+" || rank == "D") {
            colorClass = "orange";
          } else if (rank == "D-" || rank == "F") {
            colorClass = "red";
          }
          return (
            <div
              className="rank_value_container"
              key={"rank_value_container_" + index}
            >
              <div className={"rank_value_title " + colorClass}>{rank}</div>
              <div
                className="rank_value_bar"
                style={{ width: (240 / maxValue) * v + "px" }}
              />
            </div>
          );
        })}
    </div>
  );
}
