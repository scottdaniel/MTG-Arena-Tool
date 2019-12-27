import { ArenaV3Deck, CardSkin, Format } from "./Deck";

export interface InternalCourseDeck extends ArenaV3Deck {
  colors?: number[];
}

export interface InternalCourse {
  Id?: string;
  _id: string;
  id?: string;
  date: Date;
  CourseDeck: InternalCourseDeck;
}

export interface CourseDeck {
  commandZoneGRPIds: [];
  mainDeck: number[];
  sideboard: number[];
  isValid: boolean;
  lockedForUse: boolean;
  lockedForEdit: boolean;
  resourceId: string;
  cardSkins: CardSkin[];
  id: string;
  name: string;
  description: string;
  format: Format;
  deckTileId: number;
  cardBack: string;
  lastUpdated: string;
}

export interface ModuleInstanceData {
  HasPaidEntry?: string;
  DeckSelected?: boolean;
}

export interface PlayerCourse {
  Id: string;
  InternalEventName: string;
  PlayerId: string | null;
  ModuleInstanceData: ModuleInstanceData;
  CurrentEventState: string;
  CurrentModule: string;
  CardPool: number[] | null;
  CourseDeck: CourseDeck;
  PreviousOpponents: string[];
}

export interface ActiveEvent {
  PublicEventName: string;
  InternalEventName: string;
  EventState: string;
  EventType: string;
  ModuleGlobalData: { DeckSelect: string };
  StartTime: string;
  LockedTime: string;
  ClosedTime: string;
  Parameters: {}; // Missing type here
  Group: string;
  PastEntries: string | null;
  DisplayPriority: number;
  IsArenaPlayModeEvent: boolean;
  Emblems: string | null;
  UILayoutOptions: {
    ResignBehavior: string;
    WinTrackBehavior: string;
    EventBladeBehavior: string;
    DeckButtonBehavior: string;
    TemplateName: string | null;
  };
  SkipValidation: boolean;
  DoesUpdateQuests: boolean;
  DoesUpdateDailyWeeklyRewards: boolean;
  AllowUncollectedCards: boolean;
}

interface RankInfo {
  rankClass: string;
  level: number;
  steps: number;
}

export interface RankRewards {
  image1: string;
  image2: string;
  image3: string;
  prefab: string;
  referenceId: string;
  headerLocKey: string;
  descriptionLocKey: string;
  quantity: string;
  locParams: { number1?: number; number2?: number; number3?: number };
  availableDate: string;
}

export interface SeasonAndRankDetail {
  currentSeason: {
    seasonOrdinal: number;
    seasonStartTime: string;
    seasonEndTime: string;
    seasonLimitedRewards: {
      Bronze: RankRewards;
      Silver: RankRewards;
      Gold: RankRewards;
      Platinum: RankRewards;
      Diamond: RankRewards;
      Mythic: RankRewards;
    };
    seasonConstructedRewards: {
      Bronze: RankRewards;
      Silver: RankRewards;
      Gold: RankRewards;
      Platinum: RankRewards;
      Diamond: RankRewards;
      Mythic: RankRewards;
    };
    minMatches: number;
  };
  limitedRankInfo: RankInfo[];
  constructedRankInfo: RankInfo[];
}
