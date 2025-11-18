import { Strategy, StrategyType } from './types';

export const STRATEGIES: Strategy[] = [
  {
    id: StrategyType.PILLAR,
    name: 'The Pillar Method',
    description: 'Balanced mix of high-traffic, medium-sized, and community-specific tags to maximize both reach and engagement.',
    icon: '🏛️',
    distribution: [
      { name: 'Broad (High Vol)', value: 20, color: '#F472B6' },
      { name: 'Niche (Mid Vol)', value: 60, color: '#A78BFA' },
      { name: 'Community (Low Vol)', value: 20, color: '#34D399' },
    ],
    promptContext: "Use the 'Pillar Strategy': Provide 30 hashtags. 20% should be broad/high volume (1M+ posts), 60% should be highly relevant niche tags (50k-500k posts), and 20% should be specific community/low volume tags (<50k posts). Group them explicitly by these categories."
  },
  {
    id: StrategyType.NICHE_DOMINANCE,
    name: 'Niche Dominance',
    description: 'Focus purely on specific, highly relevant keywords to dominate smaller explore pages and rank higher.',
    icon: '🎯',
    distribution: [
      { name: 'Ultra Specific', value: 50, color: '#60A5FA' },
      { name: 'Descriptive', value: 50, color: '#818CF8' },
    ],
    promptContext: "Use the 'Niche Dominance' strategy: Provide 30 hashtags that are highly specific to the topic. Avoid generic one-word tags. Focus on multi-word tags that describe the visual content and the target audience precisely."
  },
  {
    id: StrategyType.VIRAL_TRENDING,
    name: 'Viral & Trending',
    description: 'Leverage Google Search to find what is currently trending around this topic to ride the wave of popularity.',
    icon: '🔥',
    distribution: [
      { name: 'Trending Now', value: 70, color: '#FB7185' },
      { name: 'Evergreen', value: 30, color: '#FBBF24' },
    ],
    promptContext: "Use the 'Viral Strategy': Use Google Search to identify CURRENT trending topics and challenges related to this theme. Provide hashtags that are spiking in popularity right now, combined with strong evergreen tags."
  },
  {
    id: StrategyType.MIXED_BAG,
    name: 'The 3x3 Matrix',
    description: 'A diversified portfolio of hashtags targeting location, subject, and community equally.',
    icon: '🎲',
    distribution: [
      { name: 'Subject', value: 33, color: '#C084FC' },
      { name: 'Location/Context', value: 33, color: '#22D3EE' },
      { name: 'Community', value: 34, color: '#4ADE80' },
    ],
    promptContext: "Use the '3x3 Matrix Strategy': Divide hashtags into 3 equal groups: 1. Subject-based (what is in the photo), 2. Context/Location-based (where/vibes), 3. Community-based (who is this for)."
  }
];