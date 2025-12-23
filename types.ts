
export interface Track {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  url: string;
  color: string;
}

export interface DeckState {
  isPlaying: boolean;
  volume: number;
  pitch: number;
  low: number;
  mid: number;
  high: number;
  currentTrack: Track | null;
  currentTime: number;
}

export interface GameState {
  vibe: number; // 0 to 100
  score: number;
  combo: number;
  message: string;
}
