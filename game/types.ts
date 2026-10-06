export type ClawState = 
  | 'IDLE' 
  | 'MOVING_LEFT' 
  | 'MOVING_RIGHT' 
  | 'DESCENDING' 
  | 'GRABBING' 
  | 'ASCENDING' 
  | 'RETURNING' 
  | 'DROPPING' 
  | 'RESETTING';

export interface PrizeItem {
  id: string;
  name: string;
  score: number;
  image: string;
  timestamp: number;
  rarity?: 'Common' | 'Rare' | 'Legendary';
}

export interface ClawSceneCallbacks {
  onStateChange?: (state: ClawState, statusMessage: string) => void;
  onPrizeWon?: (prize: PrizeItem) => void;
  onClawMiss?: () => void;
  onClawSlip?: () => void;
  onClawMove?: () => void;
  onClawDrop?: () => void;
  onClawGrab?: () => void;
  onClawRise?: () => void;
}

export interface GameConfigOptions {
  callbacks?: ClawSceneCallbacks;
}
