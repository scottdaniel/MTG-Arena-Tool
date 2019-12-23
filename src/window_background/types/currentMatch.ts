import Deck from "../../shared/deck";
import {
  GameInfo,
  GreMessage,
  AnnotationType,
  GameObject,
  ZoneType,
  ZoneData,
  PlayerData,
  TurnInfo,
  Timer,
  Result
} from "./greInterpreter";

export interface MatchPlayer {
  seat: number;
  deck: Deck;
  cards: number[];
  originalDeck: Deck;
  name: string;
}

interface CardCast {
  grpId: number;
  turn: number;
  player: number;
}

export interface MatchData {
  zones: { [key: string]: ZoneType };
  player: MatchPlayer;
  opponent: MatchPlayer;
  players: { [key: number]: PlayerData };
  bestOf: number;
  game: number;
  gameStage: string;
  playerCardsLeft: Deck;
  annotations: AnnotationType[];
  processedAnnotations: number[];
  gameObjs: { [key: number]: GameObject };
  turnInfo: TurnInfo;
  priorityTimers: number[];
  currentPriority: number;
  lastPriorityChangeTime: number;
  cardsCast: CardCast[];
  latestMessage: number;
  msgId: number;
  GREtoClient: GreMessage[];
  cardTypesByZone: ZoneData;
  playerCardsUsed: number[];
  oppCardsUsed: number[];
  timers: { [key: number]: Timer };
  gameInfo: GameInfo;
  results: Result;
  onThePlay: number;
}
