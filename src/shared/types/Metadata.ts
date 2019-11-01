export interface Metadata {
    cards: { [id: number]: Card },
    ok: boolean,
    version: number,
    language: string,
    events: { [id: string]: string },
    events_format: { [id: string]: string },
    sets: CardSet[],
    abilities: { [id: number]: string },
    limited_ranked_events: { [id: string]: string },
    standard_ranked_events: { [id: number]: string },
    single_match_events: { [id: number]: string },
    archetypes: { [id: number]: Archetype }
  }

export interface Card {
  id: number,
  name: string,
  set: string,
  artid: number,
  type: string,
  cost: string[],
  cmc: number,
  rarity: Rarity,
  cid: string,
  frame: number[],
  artist: string,
  dfc: number,
  collectible: boolean,
  craftable: boolean,
  booster: boolean,
  dfcId: number | boolean,
  rank: number,
  rank_values: number[],
  rank_controversy: string,
  images: ImageLinks,
  reprints: boolean | number[]
}

type Rarity = "Land" | "Common" | "Uncommon" | "Rare" | "Mythic";

interface ImageLinks {
    small: string,
    normal: string,
    large: string,
    art_crop: string
}

export interface CardSet {
  collation: number,
  scryfall: string,
  code: string,
  arenacode: string,
  tile: number,
  release: string
}

export interface Archetype {
  average: ArchetypeAverage,
  name: string,
  format: string
}

interface ArchetypeAverage {
  mainDeck: { [id: string]: number },
  sideboard: { [id: string]: string }
}

export interface RewardsDate {
    daily: string,
    weekly: string
  }