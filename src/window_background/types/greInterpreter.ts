import anyCardsList from "../../shared/deck";
import { GameInfo, TurnInfo, PlayerData } from "./currentMatch";

export interface KeyValuePair {
  key: string;
  type: string;
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
  grpid: number;
  orig_id: number;
  new_id: number;
  category: string;
  zone_src: string;
  zone_dest: string;
  source_zone: string;
  topIds: number;
  bottomIds: number;
  damage: number;
  life: number;
}

export interface AnnotationType {
  id: number;
  type: string[];
  affectorId: number;
  affectedIds: number[];
  AnnotationType: string;
  KeyValuePairInfo: KeyValuePair;
  details: DetailsType[];
  ignoreForSeatIds: number;
}

export interface GameObjectType {
  id: number;
  grpId: number;
  zoneId: string;
  cardTypes: string[];
  ownerSeatId: number;
  controllerSeatId: number;
  instanceId: number;
  type: string;
  objectSourceGrpId: number;
  visibility: string;
  parentId: number;
}

export interface ZoneType {
  ownerSeatId: number;
  type: string;
  objectInstanceIds: number[];
  zoneId: string;
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
  teams: any[];
  players: PlayerData[];
  turnInfo: TurnInfo;
  zones: ZoneType[];
  GameObjectTypes: GameObjectType[];
  annotations: AnnotationType[];
  diffDeletedInstanceIds: number[];
  pendingMessageCount: number;
  prevGameStateId: number;
  timers: any[];
  update: number;
  actions: any[];
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
