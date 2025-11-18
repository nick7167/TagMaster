
export enum StrategyType {
  PILLAR = 'PILLAR',
  NICHE_DOMINANCE = 'NICHE_DOMINANCE',
  VIRAL_TRENDING = 'VIRAL_TRENDING',
  MIXED_BAG = 'MIXED_BAG'
}

export interface Strategy {
  id: StrategyType;
  name: string;
  description: string;
  icon: string; // Emoji or simple identifier
  distribution: { name: string; value: number; color: string }[]; // For charts
  promptContext: string;
}

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export interface GenerationResult {
  caption: string;
  rawText: string; // Kept for backward compatibility/analysis
  analysis: string; // New specific field for the breakdown
  hashtags: string[];
  sources: GroundingSource[];
  strategyUsed: StrategyType;
}

export interface ApiError {
  message: string;
}

export interface UserProfile {
  id: string;
  email: string;
  credits: number;
}
