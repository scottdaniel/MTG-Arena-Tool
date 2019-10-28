/* eslint-disable react/prop-types */
import * as React from "react";

const CLOCK_MODE_BOTH = 0;
const CLOCK_MODE_ELAPSED = 1;
const CLOCK_MODE_CLOCK = 2;

class Clock extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      clockMode: CLOCK_MODE_BOTH,
      now: new Date(),
      hhE: 0,
      mmE: 0,
      ssE: 0,
      mmP1: 0,
      ssP1: 0,
      mmP2: 0,
      ssP2: 0
    };
    this.handleClockPrev = this.handleClockPrev.bind(this);
    this.handleClockNext = this.handleClockNext.bind(this);
  }

  componentDidMount() {
    this.timerID = setInterval(() => this.tick(), 250);
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  tick() {
    const { matchBeginTime, priorityTimers, turnPriority } = this.props;
    let hh, mm, ss, time;

    time = priorityTimers[1] / 1000;
    const now = new Date();
    if (turnPriority === 1 && time > 0) {
      time += (now - new Date(priorityTimers[0])) / 1000;
    }
    mm = Math.floor((time % 3600) / 60);
    const mmP1 = ("0" + mm).slice(-2);
    ss = Math.floor(time % 60);
    const ssP1 = ("0" + ss).slice(-2);

    time = priorityTimers[2] / 1000;
    if (turnPriority === 2 && time > 0) {
      time += (now - new Date(priorityTimers[0])) / 1000;
    }
    mm = Math.floor((time % 3600) / 60);
    const mmP2 = ("0" + mm).slice(-2);
    ss = Math.floor(time % 60);
    const ssP2 = ("0" + ss).slice(-2);

    const diff = Math.floor((Date.now() - matchBeginTime) / 1000);
    hh = Math.floor(diff / 3600);
    mm = Math.floor((diff % 3600) / 60);
    ss = Math.floor(diff % 60);
    const hhE = ("0" + hh).slice(-2);
    const mmE = ("0" + mm).slice(-2);
    const ssE = ("0" + ss).slice(-2);

    this.setState({ mmP1, ssP1, mmP2, ssP2, hhE, mmE, ssE, now });
  }

  handleClockPrev() {
    this.setState(state => {
      let clockMode = state.clockMode;
      clockMode -= 1;
      if (clockMode < CLOCK_MODE_BOTH) {
        clockMode = CLOCK_MODE_CLOCK;
      }
      return { clockMode };
    });
  }

  handleClockNext() {
    this.setState(state => {
      let clockMode = state.clockMode;
      clockMode += 1;
      if (clockMode > CLOCK_MODE_CLOCK) {
        clockMode = CLOCK_MODE_BOTH;
      }
      return { clockMode };
    });
  }

  render() {
    const {
      clockMode,
      now,
      hhE,
      mmE,
      ssE,
      mmP1,
      ssP1,
      mmP2,
      ssP2
    } = this.state;
    let { oppName, playerSeat, turnPriority } = this.props;
    if (oppName !== "Sparky") {
      oppName = oppName.slice(0, -6);
    }
    let p1name = oppName;
    let p2name = "You";
    if (playerSeat === 1) {
      p1name = "You";
      p2name = oppName;
    }

    return (
      <div className="overlay_clock_container click-on">
        <div className="clock_prev" onClick={this.handleClockPrev} />
        <div className="clock_turn">
          {clockMode === CLOCK_MODE_BOTH
            ? [
                <div
                  key="clock_pname1"
                  className={
                    "clock_pname1 " +
                    (turnPriority === 1 ? "pname_priority" : "")
                  }
                >
                  {p1name}
                </div>,
                <div
                  key="clock_pname2"
                  className={
                    "clock_pname2 " +
                    (turnPriority === 2 ? "pname_priority" : "")
                  }
                >
                  {p2name}
                </div>
              ]
            : turnPriority === playerSeat
            ? "You have priority."
            : "Opponent has priority."}
        </div>
        <div className="clock_elapsed">
          {clockMode === CLOCK_MODE_BOTH && [
            <div className="clock_priority_1" key="clock_priority_1">
              {mmP1 + ":" + ssP1}
            </div>,
            <div className="clock_priority_2" key="clock_priority_2">
              {mmP2 + ":" + ssP2}
            </div>
          ]}
          {clockMode === CLOCK_MODE_ELAPSED && hhE + ":" + mmE + ":" + ssE}
          {clockMode === CLOCK_MODE_CLOCK && now.toLocaleTimeString()}
        </div>
        <div className="clock_next" onClick={this.handleClockNext} />
      </div>
    );
  }
}

export default Clock;
