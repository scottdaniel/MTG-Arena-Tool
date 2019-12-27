import { Result } from "./greInterpreter";

interface ReservedPlayer {
  userId: string;
  playerName: string;
  systemSeatId: 1;
  teamId: 1;
  connectionInfo: {
    connectionState: string;
  };
  courseId: string;
}

interface RoomPlayer {
  userId: string;
  systemSeatId: number;
}

export interface MatchGameRoomStateChange {
  transactionId: string;
  timestamp: string;
  players: RoomPlayer[];
  matchGameRoomStateChangedEvent: {
    gameRoomInfo: MatchGameRoom;
  };
}

type MatchGameRoom =
  | MatchGameRoomStateTypePlaying
  | MatchGameRoomStateTypeMatchCompleted;

interface GameRoomInfo {
  stateType: string;
}

interface MatchGameRoomStateTypePlaying extends GameRoomInfo {
  stateType: "MatchGameRoomStateType_Playing";
  gameRoomConfig: {
    eventId: string;
    reservedPlayers: ReservedPlayer[];
    matchId: string;
    matchConfig: {};
    greConfig: {
      gameStateRedactorConfiguration: {
        enableRedaction: boolean;
        enableForceDiff: boolean;
      };
      clipsConfiguration: {};
      checkpointConfiguration: {};
    };
    greHostLoggerLevel: string;
    joinRoomTimeoutSecs: number;
    playerDisconnectTimeoutSecs: number;
  };
}

interface MatchGameRoomStateTypeMatchCompleted extends GameRoomInfo {
  stateType: "MatchGameRoomStateType_MatchCompleted";
  gameRoomConfig: {
    eventId: string;
    matchId: string;
  };
  finalMatchResult: {
    matchId: string;
    matchCompletedReason: string;
    resultList: Result[];
  };
}
