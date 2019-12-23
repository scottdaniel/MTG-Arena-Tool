import Deck from "../../shared/deck";
import {
  GreMessage,
  AnnotationType,
  GameObjectType,
  ZoneType,
  ZoneData
} from "./greInterpreter";

export interface MatchPlayer {
  seat: number;
  deck: Deck;
  cards: number[];
  originalDeck: Deck;
  name: string;
}

export interface PlayerData {
  lifeTotal: number;
  systemSeatNumber: number;
  maxHandSize: number;
  teamId: number;
  timerIds: number[];
  controllerSeatId: number;
  controllerType: string;
  startingLifeTotal: number;
}

export interface TurnInfo {
  phase: number;
  step: number;
  turnNumber: number;
  activePlayer: number;
  priorityPlayer: number;
  decisionPlayer: number;
  stormCount: number;
  nextPhase: number;
  nextStep: number;
  currentPriority: number;
}

interface CardCast {
  grpId: number;
  turn: number;
  player: number;
}

interface Timer {}

interface DeckConstraintInfo {
  minDeckSize: number;
  maxDeckSize: number;
  maxSideboardSize: number;
}

export interface GameInfo {
  matchID: string;
  gameNumber: number;
  stage: string;
  type: string;
  variant: string;
  matchState: string;
  matchWinCondition: string;
  maxTimeoutCount: number;
  maxPipCount: number;
  timeoutDurationSec: number;
  results: Result[];
  superFormat: string;
  mulliganType: string;
  freeMulliganCount: number;
  deckConstraintInfo: DeckConstraintInfo;
}

interface Result {
  scope: string;
  result: string;
  winningTeamId: number;
  reason: string;
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
  gameObjs: { [key: number]: GameObjectType };
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
