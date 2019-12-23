import anyCardsList from "../../shared/deck";
import { GameInfo, TurnInfo, PlayerData, Timer, Action, Team } from "./currentMatch";

export interface KeyValuePair {
  key: string;
  type: string;
  f?: number[];
  valueNone?: number[];
  valueUint32?: number[];
  valueInt32?: number[];
  valueUint64?: number[];
  valueInt64?: number[];
  valueBool?: boolean[];
  valueString?: string[];
  valueFloat?: number[];
  valueDouble?: number[];
}

export interface DetailsType {
  [key: string]: any;
}

export interface AnnotationType {
  id: number;
  affectorId: number;
  affectedIds: number[];
  type: string[];
  AnnotationType?: string;
  KeyValuePairInfo?: KeyValuePair;
  details?: KeyValuePair[];
  ignoreForSeatIds?: number;
}

interface ValueType {
  value: number;
}

export interface GameObjectType {
  instanceId: number;
  grpId: number;
  type: string;
  zoneId: number;
  visibility: string;
  ownerSeatId: number;
  controllerSeatId: number;
  cardTypes: string[];
  superTypes?: string[];
  subtypes?: string[];
  color?: string[];
  viewers: number[];
  name: number;
  abilities: number[];
  overlayGrpId: number;
  objectSourceGrpId?: number;
  loyaltyUsed?: ValueType;
  power?: ValueType;
  toughness?: ValueType;
}

export interface ZoneType {
  zoneId: number;
  type: string;
  visibility: string;
  ownerSeatId: number;
  objectInstanceIds: number[];
  viewers: number[];
}

export interface ZoneData {
  [key: number]: ZoneTypeData[];
}

export interface ZoneTypeData {
  [key: string]: number[];
}

interface GameStateMessage {
  type: string;
  gameStateId: number;
  gameInfo: GameInfo;
  teams: Team[];
  players: PlayerData[];
  turnInfo: TurnInfo;
  zones: ZoneType[];
  GameObjectTypes: GameObjectType[];
  annotations: AnnotationType[];
  diffDeletedInstanceIds: number[];
  pendingMessageCount: number;
  prevGameStateId: number;
  timers: Timer[];
  update: string;
  actions: Action[];
  gameObjects: GameObjectType[];
}

export interface GreMessage {
  type: string;
  msgId: number;
  gameStateMessage: GameStateMessage;
  dieRollResultsResp: {
    playerDieRolls: { systemSeatId: number; rollValue?: number }[];
  };
  connectResp: {
    status: string;
    majorVer: string;
    minorVer: string;
    revisionVer: string;
    buildVer: string;
    protoVer: string;
    seatId: string;
    settings: string;
    deckMessage: {
      deckCards: anyCardsList;
      sideboardCards: anyCardsList;
      commanderCards: anyCardsList;
    };
  };
}
