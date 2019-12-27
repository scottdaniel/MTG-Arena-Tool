// REVIEW

export interface DraftStatus {
  DraftId: string;
  PackNumber: number;
  PickNumber: number;
  PickedCards: string;
  DraftPack?: number[];
}