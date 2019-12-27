export interface AetherizedCard {
  grpId: number;
  goldAwarded: number;
  gemsAwarded: number;
  set: string;
}

export interface InventoryUpdate {
  delta: {
    gemsDelta: number;
    goldDelta: number;
    boosterDelta: number[];
    cardsAdded: number[];
    decksAdded: [];
    starterDecksAdded: [];
    vanityItemsAdded: [];
    vanityItemsRemoved: [];
    draftTokensDelta: number;
    sealedTokensDelta: number;
    vaultProgressDelta: number;
    wcCommonDelta: number;
    wcUncommonDelta: number;
    wcRareDelta: number;
    wcMythicDelta: number;
    artSkinsAdded: [];
    artSkinsRemoved: [];
    voucherItemsDelta: [];
  };
  aetherizedCards: AetherizedCard[];
  xpGained: number;
  context: {
    source: string;
    sourceId: string;
  };
}

export interface InternalEconomyTransaction {
  delta: {
    gemsDelta?: number;
    goldDelta?: number;
    boosterDelta?: number[];
    cardsAdded?: number[];
    decksAdded?: [];
    starterDecksAdded?: [];
    vanityItemsAdded?: [];
    vanityItemsRemoved?: [];
    draftTokensDelta?: number;
    sealedTokensDelta?: number;
    vaultProgressDelta?: number;
    wcCommonDelta?: number;
    wcUncommonDelta?: number;
    wcRareDelta?: number;
    wcMythicDelta?: number;
    artSkinsAdded?: [];
    artSkinsRemoved?: [];
    voucherItemsDelta?: [];
  };
  id: string;
  date: Date;
  context: string;
  subContext: {
    source: string;
    sourceId: string;
  };
}

export interface Pet {
  name: string;
  variants: string[];
}

export interface Avatar {
  name: string;
  mods: string[];
}

export interface CardBack {
  name: string;
  mods: string[];
}

export interface PlayerInventory {
  playerId: string;
  wcCommon: number;
  wcUncommon: number;
  wcRare: number;
  wcMythic: number;
  gold: number;
  gems: number;
  draftTokens: number;
  sealedTokens: number;
  wcTrackPosition: number;
  vaultProgress: number;
  boosters: number[];
  vanityItems: {
    pets: Pet[];
    avatars: Avatar[];
    cardBacks: CardBack[];
  };
  vanitySelections: {
    avatarSelection: string | null;
    cardBackSelection: string | null;
    petSelection: Pet | null;
  };
  vouchers: [];
  basicLandSet: string;
  starterDecks: string[];
  firstSeenDate: string;
}
