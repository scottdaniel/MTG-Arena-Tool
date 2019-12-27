export interface RankUpdate {
  playerId: string;
  seasonOrdinal: number;
  newClass: string;
  oldClass: string;
  newLevel: number;
  oldLevel: number;
  oldStep: number;
  newStep: number;
  wasLossProtected: boolean;
  rankUpdateType: string;
}
